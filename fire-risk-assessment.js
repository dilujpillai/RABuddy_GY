/**
 * Fire Risk Assessment Module — Fire Triangle Risk Index (FTRI)
 * Integrated with Risk Assessment Buddy Smart 3.0
 *
 * Methodology based on: NFPA 704, NFPA 101, NFPA 10/13/72, NFPA 652/654,
 * OSHA 29 CFR 1910.39/157, FM Global, EN ISO 13943, BS 9999
 *
 * Scoring: Fire Triangle Potential × (1 − Control Effectiveness) × Consequence Amplifier
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // SECTION 1 — FIRE HAZARD REGISTRIES (NFPA / OSHA backed)
    // ═══════════════════════════════════════════════════════════════

    /** NFPA 101 Occupancy Classifications */
    const OCCUPANCY_CLASSES = {
        'Assembly':          { code: 'A',  baseConsequence: 1.4, description: 'Gathering of 50+ people (cafeterias, auditoriums, training rooms)' },
        'Business':          { code: 'B',  baseConsequence: 1.0, description: 'Offices, professional services, admin areas' },
        'Educational':       { code: 'E',  baseConsequence: 1.3, description: 'Training centers, classrooms' },
        'Factory — General': { code: 'F1', baseConsequence: 1.2, description: 'Moderate-hazard manufacturing (tire curing, assembly)' },
        'Factory — Special': { code: 'F2', baseConsequence: 1.5, description: 'High-hazard manufacturing (rubber mixing, solvent areas)' },
        'High Hazard':       { code: 'H',  baseConsequence: 1.5, description: 'Areas with highly flammable/explosive materials' },
        'Mercantile':        { code: 'M',  baseConsequence: 1.1, description: 'Retail, stores, sales areas' },
        'Storage — Low':     { code: 'S1', baseConsequence: 1.0, description: 'General storage, non-combustible goods' },
        'Storage — High':    { code: 'S2', baseConsequence: 1.3, description: 'Storage of combustible materials (rubber, chemicals, tires)' },
        'Utility':           { code: 'U',  baseConsequence: 0.9, description: 'Mechanical rooms, electrical closets, utility spaces' }
    };

    /** Ignition Source Registry — HEAT leg of the fire triangle */
    const IGNITION_SOURCES = {
        'Hot work (welding, cutting, brazing, grinding)':        { rating: 9, nfpa: 'NFPA 51B' },
        'Electrical equipment (motors, panels, switchgear)':     { rating: 7, nfpa: 'NFPA 70/70E' },
        'Static discharge':                                      { rating: 6, nfpa: 'NFPA 77' },
        'Friction (bearings, conveyors, brakes)':                { rating: 5, nfpa: 'NFPA 652' },
        'Open flames (furnaces, ovens, heaters)':                { rating: 8, nfpa: 'NFPA 86' },
        'Smoking materials':                                     { rating: 4, nfpa: 'OSHA 1910.39' },
        'Spontaneous combustion (oily rags, chemical reaction)': { rating: 7, nfpa: 'NFPA 652' },
        'Lightning':                                             { rating: 3, nfpa: 'NFPA 780' },
        'Heated processes (vulcanization, extrusion, curing)':   { rating: 8, nfpa: 'NFPA 86' },
        'Arcing / short circuit':                                { rating: 8, nfpa: 'NFPA 70E' },
        'Radiant heat from adjacent equipment':                  { rating: 5, nfpa: 'NFPA 80A' },
        'Mechanical sparks (metal-on-metal)':                    { rating: 6, nfpa: 'NFPA 652' },
        'Overheated equipment (dryers, compressors)':            { rating: 7, nfpa: 'NFPA 86' },
        'Vehicles / forklifts exhaust':                          { rating: 5, nfpa: 'NFPA 505' },
        'None identified':                                       { rating: 1, nfpa: '—' }
    };

    /** Fuel Load Registry — FUEL leg of the fire triangle */
    const FUEL_SOURCES = {
        'Rubber / elastomers (raw or cured)':          { rating: 8, nfpa: 'NFPA 654',   flashPoint: '260°C+' },
        'Carbon black dust':                           { rating: 9, nfpa: 'NFPA 652/654', flashPoint: 'Dust cloud' },
        'Solvents (toluene, hexane, naphtha)':         { rating: 10, nfpa: 'NFPA 30',    flashPoint: '-11 to 4°C' },
        'Hydraulic oil':                               { rating: 6, nfpa: 'NFPA 30',     flashPoint: '150-200°C' },
        'Lubricants and greases':                      { rating: 5, nfpa: 'NFPA 30',     flashPoint: '200°C+' },
        'Packaging materials (cardboard, shrink wrap)': { rating: 6, nfpa: 'NFPA 1',     flashPoint: '230°C' },
        'Wood pallets and structures':                 { rating: 6, nfpa: 'NFPA 1',      flashPoint: '250-300°C' },
        'Cable insulation (PVC, PE)':                  { rating: 5, nfpa: 'NFPA 70',     flashPoint: '330-390°C' },
        'Textiles (fabric, filter media)':             { rating: 6, nfpa: 'NFPA 1',      flashPoint: '210-255°C' },
        'Compressed flammable gases (propane, acetylene)': { rating: 10, nfpa: 'NFPA 55', flashPoint: 'Gas' },
        'Sulfur compounds':                            { rating: 8, nfpa: 'NFPA 654',    flashPoint: '190°C' },
        'Adhesives and cements':                       { rating: 8, nfpa: 'NFPA 30',     flashPoint: 'Varies' },
        'Finished tires (storage)':                    { rating: 7, nfpa: 'NFPA 231D',   flashPoint: '300°C+' },
        'Paper and documents':                         { rating: 5, nfpa: 'NFPA 1',      flashPoint: '233°C' },
        'Resins and plastics':                         { rating: 7, nfpa: 'NFPA 654',    flashPoint: 'Varies' },
        'Paint and coatings':                          { rating: 8, nfpa: 'NFPA 33',     flashPoint: 'Varies' },
        'Combustible dust accumulation':               { rating: 9, nfpa: 'NFPA 652',    flashPoint: 'Dust cloud' },
        'Natural gas supply':                          { rating: 9, nfpa: 'NFPA 54',     flashPoint: 'Gas' },
        'Minimal combustible materials':               { rating: 2, nfpa: '—',           flashPoint: '—' },
        'None identified':                             { rating: 1, nfpa: '—',           flashPoint: '—' }
    };

    /** Oxygen/Atmosphere Registry — OXYGEN leg of the fire triangle */
    const OXYGEN_CONDITIONS = {
        'Normal ambient air (20.9% O₂)':               { rating: 5, note: 'Standard atmospheric conditions' },
        'Forced ventilation (HVAC, fans)':              { rating: 6, note: 'Increased airflow can accelerate fire spread' },
        'Natural draft / cross-ventilation':            { rating: 5, note: 'Open doors/windows create draft' },
        'Oxygen-enriched area (>23.5% O₂)':            { rating: 10, note: 'NFPA 53 — drastically lowers ignition threshold' },
        'Oxidizer storage nearby (peroxides, nitrates)': { rating: 9, note: 'NFPA 400 — chemical oxygen sources' },
        'Dust collector / extraction ducting':          { rating: 7, note: 'Concentrated air-dust mixture in ductwork' },
        'Enclosed/confined space (limited air exchange)': { rating: 4, note: 'Fire self-limits but toxic smoke risk' },
        'High-bay open area':                          { rating: 6, note: 'Large volume allows fire growth' },
        'Outdoor / open air':                          { rating: 5, note: 'Wind-fed oxygen, fast spread possible' },
        'Pressurized atmosphere':                      { rating: 8, note: 'Higher O₂ partial pressure' },
        'Inerted atmosphere (N₂, CO₂ blanketing)':     { rating: 2, note: 'Deliberately reduced O₂ for fire prevention' },
        'None identified':                             { rating: 1, note: '—' }
    };

    /** Control Categories with maximum effectiveness weights */
    const CONTROL_CATEGORIES = {
        detection: {
            label: '🔍 Detection Systems',
            description: 'Devices and systems that detect fire or smoke early',
            maxWeight: 0.20,
            items: {
                'Smoke detectors (photoelectric/ionization)': { effectiveness: 0.90, standard: 'NFPA 72', mandatory: true },
                'Heat detectors (fixed temp / rate-of-rise)': { effectiveness: 0.75, standard: 'NFPA 72', mandatory: false },
                'Flame detectors (UV/IR)':                    { effectiveness: 0.85, standard: 'NFPA 72', mandatory: false },
                'Manual call points / pull stations':         { effectiveness: 0.60, standard: 'NFPA 72', mandatory: true },
                'Gas detection system (LEL monitors)':        { effectiveness: 0.80, standard: 'NFPA 72', mandatory: false },
                'Spark detection in ductwork':                { effectiveness: 0.85, standard: 'NFPA 652', mandatory: false },
                'CCTV / thermal imaging monitoring':          { effectiveness: 0.50, standard: 'FM Global', mandatory: false },
                'Fire watch personnel (during hot work)':     { effectiveness: 0.70, standard: 'NFPA 51B', mandatory: false }
            }
        },
        suppression: {
            label: '🧯 Suppression Systems',
            description: 'Active systems that extinguish or control fire',
            maxWeight: 0.25,
            items: {
                'Automatic sprinkler system (wet pipe)':      { effectiveness: 0.95, standard: 'NFPA 13', mandatory: true },
                'Automatic sprinkler system (dry pipe)':      { effectiveness: 0.90, standard: 'NFPA 13', mandatory: false },
                'Deluge system':                              { effectiveness: 0.93, standard: 'NFPA 15', mandatory: false },
                'Clean agent system (FM-200, Novec)':         { effectiveness: 0.90, standard: 'NFPA 2001', mandatory: false },
                'CO₂ suppression system':                     { effectiveness: 0.85, standard: 'NFPA 12', mandatory: false },
                'Foam suppression system':                    { effectiveness: 0.88, standard: 'NFPA 11', mandatory: false },
                'Portable fire extinguishers (ABC)':          { effectiveness: 0.50, standard: 'NFPA 10', mandatory: true },
                'Portable fire extinguishers (CO₂)':          { effectiveness: 0.45, standard: 'NFPA 10', mandatory: false },
                'Portable fire extinguishers (Class D metal)': { effectiveness: 0.40, standard: 'NFPA 10', mandatory: false },
                'Spark/ember extinguishing in ducts':         { effectiveness: 0.80, standard: 'NFPA 652', mandatory: false },
                'Kitchen hood suppression':                   { effectiveness: 0.85, standard: 'NFPA 96', mandatory: false },
                'Standpipe / fire hose connections':          { effectiveness: 0.60, standard: 'NFPA 14', mandatory: false }
            }
        },
        compartmentation: {
            label: '🧱 Compartmentation & Barriers',
            description: 'Passive fire protection that limits fire spread',
            maxWeight: 0.20,
            items: {
                'Fire-rated walls (1-hr or 2-hr)':            { effectiveness: 0.90, standard: 'NFPA 221', mandatory: true },
                'Fire doors (self-closing, rated)':           { effectiveness: 0.85, standard: 'NFPA 80', mandatory: true },
                'Fire dampers in HVAC ducts':                 { effectiveness: 0.80, standard: 'NFPA 90A', mandatory: false },
                'Penetration seals (cable/pipe openings)':    { effectiveness: 0.75, standard: 'NFPA 221', mandatory: false },
                'Fire-rated floor/ceiling assemblies':        { effectiveness: 0.85, standard: 'NFPA 251', mandatory: false },
                'Fireproof coatings on structural steel':     { effectiveness: 0.70, standard: 'NFPA 251', mandatory: false },
                'Fire breaks in storage (flue spaces)':       { effectiveness: 0.65, standard: 'NFPA 231', mandatory: false },
                'Explosion venting panels':                   { effectiveness: 0.70, standard: 'NFPA 68', mandatory: false }
            }
        },
        evacuation: {
            label: '🚪 Evacuation & Life Safety',
            description: 'Systems and features that enable safe evacuation',
            maxWeight: 0.15,
            items: {
                'Illuminated EXIT signs':                     { effectiveness: 0.70, standard: 'NFPA 101', mandatory: true },
                'Emergency lighting (battery backup)':        { effectiveness: 0.75, standard: 'NFPA 101', mandatory: true },
                'Fire alarm notification (horns/strobes)':    { effectiveness: 0.85, standard: 'NFPA 72', mandatory: true },
                'Voice evacuation / PA system':               { effectiveness: 0.80, standard: 'NFPA 72', mandatory: false },
                'Clear and marked egress paths':              { effectiveness: 0.70, standard: 'NFPA 101', mandatory: true },
                'Adequate number of exits':                   { effectiveness: 0.80, standard: 'NFPA 101', mandatory: true },
                'Assembly/muster points defined':             { effectiveness: 0.60, standard: 'OSHA 1910.39', mandatory: true },
                'Refuge areas for mobility-impaired':         { effectiveness: 0.50, standard: 'NFPA 101', mandatory: false }
            }
        },
        management: {
            label: '📋 Management & Prevention',
            description: 'Administrative controls, programs, and maintenance',
            maxWeight: 0.20,
            items: {
                'Hot work permit system':                     { effectiveness: 0.85, standard: 'NFPA 51B', mandatory: true },
                'Fire prevention plan (documented)':          { effectiveness: 0.75, standard: 'OSHA 1910.39', mandatory: true },
                'Regular fire drills (annually minimum)':     { effectiveness: 0.70, standard: 'NFPA 101', mandatory: true },
                'Fire extinguisher training':                 { effectiveness: 0.65, standard: 'OSHA 1910.157', mandatory: true },
                'Housekeeping program (combustible dust)':    { effectiveness: 0.80, standard: 'NFPA 652', mandatory: true },
                'Electrical maintenance (thermography)':      { effectiveness: 0.75, standard: 'NFPA 70B', mandatory: false },
                'Sprinkler inspection & testing':             { effectiveness: 0.85, standard: 'NFPA 25', mandatory: true },
                'Fire impairment handling procedure':         { effectiveness: 0.70, standard: 'FM Global', mandatory: false },
                'Smoking policy enforced':                    { effectiveness: 0.60, standard: 'OSHA 1910.39', mandatory: false },
                'Flammable liquid storage compliance':        { effectiveness: 0.80, standard: 'NFPA 30', mandatory: false },
                'Emergency response team (ERT/brigade)':      { effectiveness: 0.75, standard: 'NFPA 600', mandatory: false },
                'Contractor fire safety orientation':          { effectiveness: 0.60, standard: 'NFPA 1', mandatory: false }
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // SECTION 2 — FTRI SCORING ENGINE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate the Fire Triangle Potential (inherent risk before controls).
     * @param {number} heat  – Ignition source rating (1-10)
     * @param {number} fuel  – Fuel load rating (1-10)
     * @param {number} oxygen – Oxygen availability rating (1-10)
     * @returns {{ triangleScore: number, interaction: number, rawScore: number }}
     */
    function calcFireTriangle(heat, fuel, oxygen) {
        // Base average of the three legs
        const avg = (heat + fuel + oxygen) / 3;

        // Interaction multiplier: if all 3 legs are strong (≥6), fire grows exponentially
        // This models the real-world fact that fire triangle elements compound each other
        const minLeg = Math.min(heat, fuel, oxygen);
        let interaction = 1.0;
        if (minLeg >= 8)      interaction = 1.5;   // All three legs very strong
        else if (minLeg >= 6) interaction = 1.3;   // All three legs moderate-strong
        else if (minLeg >= 4) interaction = 1.15;  // All present to some degree
        // else stays 1.0 — at least one leg is weak, fire triangle incomplete

        const rawScore = avg * interaction;
        return {
            triangleScore: Math.min(rawScore, 15), // Cap at 15 for scaling
            interaction,
            rawScore
        };
    }

    /**
     * Calculate Control Effectiveness (0.0 – 0.80 discount factor).
     * Each category contributes up to its maxWeight based on best-in-category controls selected.
     * @param {Object} selectedControls – { detection: [...keys], suppression: [...], ... }
     * @returns {{ totalEffectiveness: number, categoryScores: Object, gaps: string[] }}
     */
    function calcControlEffectiveness(selectedControls) {
        const categoryScores = {};
        const gaps = [];

        for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
            const selected = selectedControls[catKey] || [];
            if (selected.length === 0) {
                categoryScores[catKey] = 0;
                gaps.push(`No ${catDef.label.replace(/^[^\s]+\s/, '')} in place`);
                // Check for mandatory items
                for (const [itemName, itemDef] of Object.entries(catDef.items)) {
                    if (itemDef.mandatory) {
                        gaps.push(`MANDATORY MISSING: ${itemName} (${itemDef.standard})`);
                    }
                }
                continue;
            }

            // Category effectiveness = average effectiveness of selected items × maxWeight
            let effectivenessSum = 0;
            selected.forEach(itemKey => {
                const item = catDef.items[itemKey];
                if (item) effectivenessSum += item.effectiveness;
            });
            const avgEffectiveness = effectivenessSum / selected.length;
            // Scale by how many items are selected vs total available (coverage factor)
            const coverageFactor = Math.min(selected.length / Object.keys(catDef.items).length * 1.5, 1.0);
            categoryScores[catKey] = avgEffectiveness * coverageFactor * catDef.maxWeight;

            // Check for missing mandatory items
            for (const [itemName, itemDef] of Object.entries(catDef.items)) {
                if (itemDef.mandatory && !selected.includes(itemName)) {
                    gaps.push(`MANDATORY MISSING: ${itemName} (${itemDef.standard})`);
                }
            }
        }

        const totalEffectiveness = Math.min(
            Object.values(categoryScores).reduce((a, b) => a + b, 0),
            0.80 // Maximum 80% reduction — residual risk always remains
        );

        return { totalEffectiveness, categoryScores, gaps };
    }

    /**
     * Calculate Consequence Amplifier based on occupancy and occupant density.
     * @param {string} occupancyClass – Key from OCCUPANCY_CLASSES
     * @param {number} occupantCount  – Number of people in the area
     * @param {number} areaSqM        – Area in square meters
     * @param {boolean} businessCritical – Is this a critical production area?
     * @returns {number} Amplifier (0.8 – 2.0)
     */
    function calcConsequenceAmplifier(occupancyClass, occupantCount, areaSqM, businessCritical) {
        const occ = OCCUPANCY_CLASSES[occupancyClass] || { baseConsequence: 1.0 };
        let amplifier = occ.baseConsequence;

        // Density factor: more people per m² = higher consequence
        if (areaSqM > 0 && occupantCount > 0) {
            const density = occupantCount / areaSqM;
            if (density > 0.1) amplifier += 0.2;       // >1 person per 10 m²
            else if (density > 0.05) amplifier += 0.1;  // >1 person per 20 m²
        }

        // Business continuity factor
        if (businessCritical) amplifier += 0.2;

        return Math.min(amplifier, 2.0);
    }

    /**
     * Master FTRI calculation.
     * Final Rating = Fire Triangle Score × (1 − Control Effectiveness) × Consequence Amplifier
     * Scaled to 0–100 for category mapping.
     */
    function calculateFTRI(params) {
        const { heat, fuel, oxygen, selectedControls, occupancyClass, occupantCount, areaSqM, businessCritical } = params;

        const triangle = calcFireTriangle(heat, fuel, oxygen);
        const controls = calcControlEffectiveness(selectedControls);
        const consequence = calcConsequenceAmplifier(occupancyClass, occupantCount, areaSqM, businessCritical);

        // Scale: triangleScore max ≈15, consequence max ≈2.0, so raw max ≈30
        // After control discount: max ≈30 × 0.20 (minimum residual) = 6
        // We scale to 0-100 for readability
        const rawFTRI = triangle.triangleScore * (1 - controls.totalEffectiveness) * consequence;
        const scaledFTRI = Math.min(Math.round((rawFTRI / 30) * 100), 100);

        return {
            score: scaledFTRI,
            category: getFTRICategory(scaledFTRI),
            triangle,
            controls,
            consequence,
            heat, fuel, oxygen
        };
    }

    /** Map FTRI score to risk category */
    function getFTRICategory(score) {
        if (score >= 80) return { label: 'CRITICAL', color: '#7f1d1d', bg: '#fecaca', border: '#f87171', icon: '🔴', action: 'IMMEDIATE action required. Cease operations until mitigated.' };
        if (score >= 60) return { label: 'HIGH',     color: '#9a3412', bg: '#fed7aa', border: '#fb923c', icon: '🟠', action: 'Urgent mitigation required within 24-48 hours.' };
        if (score >= 30) return { label: 'MEDIUM',   color: '#854d0e', bg: '#fef08a', border: '#facc15', icon: '🟡', action: 'Plan corrective actions within 30 days.' };
        return                  { label: 'LOW',      color: '#166534', bg: '#bbf7d0', border: '#4ade80', icon: '🟢', action: 'Maintain current controls. Review annually.' };
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 3 — ZONE MANAGEMENT (multiple zones per assessment)
    // ═══════════════════════════════════════════════════════════════

    let zones = [];
    let activeZoneIdx = -1;
    let floorPlanImg = null;   // base64 data URL of uploaded floor plan

    function createBlankZone(name) {
        return {
            name: name || 'Zone ' + (zones.length + 1),
            building: '',
            floor: '',
            occupancyClass: 'Factory — General',
            occupantCount: 0,
            areaSqM: 0,
            businessCritical: false,
            ignitionSources: [],
            fuelSources: [],
            oxygenConditions: [],
            selectedControls: { detection: [], suppression: [], compartmentation: [], evacuation: [], management: [] },
            photos: [],       // { data: base64, caption: string }
            mapRect: null,    // { x, y, w, h } coordinates on floor plan canvas
            notes: '',
            result: null      // calculated FTRI result
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 4 — UI RENDERING
    // ═══════════════════════════════════════════════════════════════

    const FRA_ROOT_ID = 'fra-app-root';

    function getRoot() { return document.getElementById(FRA_ROOT_ID); }

    /** Render the complete Fire RA module UI */
    function renderApp() {
        const root = getRoot();
        if (!root) return;
        root.innerHTML = '';

        // Global toolbar (Save/Load/PDF/HTML)
        root.appendChild(renderToolbar());

        // Header bar with zone tabs
        const header = el('div', 'fra-header flex flex-col gap-4');

        // Zone tab bar
        const zoneBar = el('div', 'flex items-center gap-2 flex-wrap');
        zones.forEach((z, i) => {
            const badge = z.result ? z.result.category.icon : '⬜';
            const btn = el('button',
                `px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${i === activeZoneIdx ? 'bg-orange-100 border-orange-500 text-orange-900' : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'}`,
                `${badge} ${esc(z.name)}`
            );
            btn.onclick = () => { activeZoneIdx = i; renderApp(); };
            zoneBar.appendChild(btn);
        });
        // Add zone button
        const addBtn = el('button', 'px-3 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition', '+ Add Zone');
        addBtn.onclick = () => {
            zones.push(createBlankZone());
            activeZoneIdx = zones.length - 1;
            renderApp();
        };
        zoneBar.appendChild(addBtn);
        header.appendChild(zoneBar);
        root.appendChild(header);

        if (zones.length === 0 || activeZoneIdx < 0) {
            root.appendChild(el('div', 'text-center py-16 text-slate-500', 'Click <strong>"+ Add Zone"</strong> to start your Fire Risk Assessment.'));
            // Still show floor plan even with no zones
            root.appendChild(renderFloorPlanCard());
            return;
        }

        const zone = zones[activeZoneIdx];

        // AI Assist card (full width, above main grid)
        root.appendChild(renderAIAssistCard(zone));

        // Main form layout — two columns on desktop
        const grid = el('div', 'grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4');

        // LEFT: Location + Fire Triangle
        const leftCol = el('div', 'space-y-6');
        leftCol.appendChild(renderLocationCard(zone));
        leftCol.appendChild(renderFireTriangleCard(zone));
        grid.appendChild(leftCol);

        // RIGHT: Controls Audit + Photo Gallery
        const rightCol = el('div', 'space-y-6');
        rightCol.appendChild(renderControlsCard(zone));
        rightCol.appendChild(renderPhotoGalleryCard(zone));
        grid.appendChild(rightCol);

        root.appendChild(grid);

        // Floor Plan (full width)
        root.appendChild(renderFloorPlanCard());

        // Calculate & Results row
        const actionsRow = el('div', 'mt-6 space-y-4');
        const calcBtn = el('button', 'w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:from-orange-700 hover:to-red-700 transition text-lg', '🔥 Calculate Fire Risk Index');
        calcBtn.onclick = () => {
            zone.result = runAssessment(zone);
            renderApp();
            // Scroll to result
            setTimeout(() => {
                const resEl = document.getElementById('fra-result-card');
                if (resEl) resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        };
        actionsRow.appendChild(calcBtn);

        if (zone.result) {
            actionsRow.appendChild(renderResultCard(zone));
        }

        root.appendChild(actionsRow);

        // Notes area with voice button
        const notesCard = buildCard('📝 Zone Notes & Observations', 'slate');
        const notesWrap = el('div', 'relative');
        const ta = el('textarea', 'w-full p-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm', '');
        ta.rows = 4;
        ta.placeholder = 'Additional observations, recommendations, or notes for this zone...';
        ta.value = zone.notes || '';
        ta.oninput = () => { zone.notes = ta.value; };
        notesWrap.appendChild(ta);
        // Voice button on notes
        const notesVoiceBtn = el('button', 'absolute top-2 right-2 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition text-lg', '🎤');
        notesVoiceBtn.title = 'Dictate notes';
        notesVoiceBtn.onclick = () => toggleVoiceCapture(ta, notesVoiceBtn);
        notesWrap.appendChild(notesVoiceBtn);
        cardAppend(notesCard, notesWrap);
        root.appendChild(notesCard);

        // Zone actions
        const zoneActions = el('div', 'flex gap-3 flex-wrap mt-4');
        const renameBtn = el('button', 'px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition', '✏️ Rename Zone');
        renameBtn.onclick = () => {
            const name = prompt('Enter zone name:', zone.name);
            if (name && name.trim()) { zone.name = name.trim(); renderApp(); }
        };
        const deleteBtn = el('button', 'px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 transition', '🗑️ Delete Zone');
        deleteBtn.onclick = () => {
            if (confirm('Delete zone "' + zone.name + '"? This cannot be undone.')) {
                zones.splice(activeZoneIdx, 1);
                activeZoneIdx = Math.min(activeZoneIdx, zones.length - 1);
                renderApp();
            }
        };
        const exportBtn = el('button', 'px-4 py-2 bg-green-50 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-100 transition', '📋 Copy Report');
        exportBtn.onclick = () => copyReport(zone);
        zoneActions.appendChild(renameBtn);
        zoneActions.appendChild(deleteBtn);
        zoneActions.appendChild(exportBtn);
        root.appendChild(zoneActions);
    }

    // ── Location Card ──
    function renderLocationCard(zone) {
        const card = buildCard('📍 Location Profile', 'indigo');
        const grid = el('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4');

        grid.appendChild(labeledInput('Zone / Area Name', 'text', zone.name, v => { zone.name = v; }));
        grid.appendChild(labeledInput('Building', 'text', zone.building, v => { zone.building = v; }));
        grid.appendChild(labeledInput('Floor / Level', 'text', zone.floor, v => { zone.floor = v; }));
        grid.appendChild(labeledSelect('Occupancy Class (NFPA 101)', OCCUPANCY_CLASSES, zone.occupancyClass, v => { zone.occupancyClass = v; }, k => {
            const o = OCCUPANCY_CLASSES[k];
            return `${k} [${o.code}]`;
        }));
        grid.appendChild(labeledInput('Occupant Count (typical)', 'number', zone.occupantCount, v => { zone.occupantCount = parseInt(v) || 0; }));
        grid.appendChild(labeledInput('Area (m²)', 'number', zone.areaSqM, v => { zone.areaSqM = parseFloat(v) || 0; }));

        const critWrap = el('div', 'col-span-1 sm:col-span-2 flex items-center gap-3');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = zone.businessCritical;
        cb.className = 'h-5 w-5 text-orange-600 rounded focus:ring-orange-500';
        cb.onchange = () => { zone.businessCritical = cb.checked; };
        critWrap.appendChild(cb);
        critWrap.appendChild(el('label', 'text-sm font-medium text-slate-700', 'Business-critical area (production line, server room, etc.)'));
        grid.appendChild(critWrap);

        cardAppend(card, grid);
        return card;
    }

    // ── Fire Triangle Card ──
    function renderFireTriangleCard(zone) {
        const card = buildCard('🔺 Fire Triangle Assessment', 'orange');

        // Visual triangle
        const triViz = el('div', 'flex justify-center mb-6');
        triViz.innerHTML = buildTriangleSVG(zone);
        cardAppend(card, triViz);

        // Ignition sources
        cardAppend(card, renderMultiSelect(
            '🔥 HEAT — Ignition Sources', IGNITION_SOURCES, zone.ignitionSources,
            sel => { zone.ignitionSources = sel; },
            k => { const s = IGNITION_SOURCES[k]; return `${k} <span class="text-xs text-slate-500">[${s.nfpa}]</span>`; }
        ));

        // Fuel sources
        cardAppend(card, renderMultiSelect(
            '🪵 FUEL — Combustible Materials', FUEL_SOURCES, zone.fuelSources,
            sel => { zone.fuelSources = sel; },
            k => { const s = FUEL_SOURCES[k]; return `${k} <span class="text-xs text-slate-500">[${s.nfpa}, FP: ${s.flashPoint}]</span>`; }
        ));

        // Oxygen conditions
        cardAppend(card, renderMultiSelect(
            '💨 OXYGEN — Atmosphere Conditions', OXYGEN_CONDITIONS, zone.oxygenConditions,
            sel => { zone.oxygenConditions = sel; },
            k => { const s = OXYGEN_CONDITIONS[k]; return `${k} <span class="text-xs text-slate-500">[${s.note}]</span>`; }
        ));

        return card;
    }

    // ── Controls Audit Card ──
    function renderControlsCard(zone) {
        const card = buildCard('🛡️ Existing Fire Protection Controls', 'green');
        const info = el('p', 'text-sm text-slate-600 mb-4', 'Select all fire protection measures currently in place. <span class="text-red-600 font-semibold">★ Mandatory</span> items are required by code.');
        cardAppend(card, info);

        for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
            const section = el('details', 'border border-slate-200 rounded-lg mb-3 group');
            const summary = el('summary', 'cursor-pointer p-3 bg-slate-50 rounded-lg font-semibold text-sm text-slate-800 flex items-center justify-between hover:bg-slate-100 transition');
            const selectedCount = (zone.selectedControls[catKey] || []).length;
            const totalCount = Object.keys(catDef.items).length;
            summary.innerHTML = `<span>${catDef.label}</span><span class="text-xs px-2 py-1 rounded-full ${selectedCount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${selectedCount}/${totalCount}</span>`;
            section.appendChild(summary);

            const body = el('div', 'p-3 space-y-2');
            body.appendChild(el('p', 'text-xs text-slate-500 mb-2', catDef.description));

            for (const [itemName, itemDef] of Object.entries(catDef.items)) {
                const row = el('label', 'flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded text-sm');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'mt-0.5 h-4 w-4 text-green-600 rounded focus:ring-green-500 flex-shrink-0';
                cb.checked = (zone.selectedControls[catKey] || []).includes(itemName);
                cb.onchange = () => {
                    if (!zone.selectedControls[catKey]) zone.selectedControls[catKey] = [];
                    if (cb.checked) {
                        if (!zone.selectedControls[catKey].includes(itemName))
                            zone.selectedControls[catKey].push(itemName);
                    } else {
                        zone.selectedControls[catKey] = zone.selectedControls[catKey].filter(x => x !== itemName);
                    }
                    renderApp();
                };
                row.appendChild(cb);
                const labelSpan = el('span', '');
                labelSpan.innerHTML = `${itemDef.mandatory ? '<span class="text-red-600 font-bold">★</span> ' : ''}${esc(itemName)} <span class="text-xs text-slate-400">(${itemDef.standard}, ${Math.round(itemDef.effectiveness * 100)}% eff.)</span>`;
                row.appendChild(labelSpan);
                body.appendChild(row);
            }
            section.appendChild(body);
            cardAppend(card, section);
        }
        return card;
    }

    // ── Result Card ──
    function renderResultCard(zone) {
        const r = zone.result;
        const cat = r.category;
        const card = el('div', `rounded-xl border-2 p-6 space-y-6`, '');
        card.id = 'fra-result-card';
        card.style.borderColor = cat.border;
        card.style.backgroundColor = cat.bg;

        // Score header
        const scoreRow = el('div', 'flex flex-col sm:flex-row items-center gap-6');
        const scoreBadge = el('div', 'w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg', '');
        scoreBadge.style.backgroundColor = cat.color;
        scoreBadge.style.color = '#fff';
        scoreBadge.innerHTML = `<span class="text-3xl font-black">${r.score}</span><span class="text-xs font-semibold opacity-80">/ 100</span>`;
        scoreRow.appendChild(scoreBadge);

        const scoreInfo = el('div', 'flex-1 text-center sm:text-left');
        scoreInfo.innerHTML = `
            <h3 class="text-2xl font-black" style="color:${cat.color}">${cat.icon} ${cat.label} FIRE RISK</h3>
            <p class="text-sm font-medium mt-1" style="color:${cat.color}">${cat.action}</p>
            <div class="mt-3 grid grid-cols-3 gap-3 text-center">
                <div class="bg-white/70 rounded-lg p-2"><div class="text-xs text-slate-500">Heat</div><div class="text-lg font-bold text-red-600">${r.heat}/10</div></div>
                <div class="bg-white/70 rounded-lg p-2"><div class="text-xs text-slate-500">Fuel</div><div class="text-lg font-bold text-amber-600">${r.fuel}/10</div></div>
                <div class="bg-white/70 rounded-lg p-2"><div class="text-xs text-slate-500">Oxygen</div><div class="text-lg font-bold text-blue-600">${r.oxygen}/10</div></div>
            </div>
        `;
        scoreRow.appendChild(scoreInfo);
        card.appendChild(scoreRow);

        // Metrics bar
        const metricsBar = el('div', 'grid grid-cols-2 lg:grid-cols-4 gap-3');
        metricsBar.appendChild(metricTile('Fire Triangle', r.triangle.triangleScore.toFixed(1), 'max 15', '#ea580c'));
        metricsBar.appendChild(metricTile('Interaction', '×' + r.triangle.interaction.toFixed(2), r.triangle.interaction >= 1.3 ? 'COMPOUND' : 'Normal', '#dc2626'));
        metricsBar.appendChild(metricTile('Control Eff.', Math.round(r.controls.totalEffectiveness * 100) + '%', 'max 80%', '#16a34a'));
        metricsBar.appendChild(metricTile('Consequence', '×' + r.consequence.toFixed(2), 'max 2.0', '#7c3aed'));
        card.appendChild(metricsBar);

        // Control category breakdown
        const controlBreak = el('div', 'bg-white/70 rounded-lg p-4');
        controlBreak.innerHTML = '<h4 class="font-bold text-slate-800 mb-3 text-sm">Control Effectiveness Breakdown</h4>';
        const barContainer = el('div', 'space-y-2');
        for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
            const score = r.controls.categoryScores[catKey] || 0;
            const pct = Math.round((score / catDef.maxWeight) * 100);
            const barRow = el('div', 'flex items-center gap-3 text-xs');
            barRow.innerHTML = `
                <span class="w-36 text-right font-medium text-slate-600 truncate">${catDef.label}</span>
                <div class="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div class="h-3 rounded-full transition-all duration-500" style="width:${pct}%;background:${pct > 60 ? '#16a34a' : pct > 30 ? '#eab308' : '#ef4444'}"></div>
                </div>
                <span class="w-10 font-bold" style="color:${pct > 60 ? '#16a34a' : pct > 30 ? '#eab308' : '#ef4444'}">${pct}%</span>
            `;
            barContainer.appendChild(barRow);
        }
        controlBreak.appendChild(barContainer);
        card.appendChild(controlBreak);

        // Gaps / Missing mandatory controls
        if (r.controls.gaps.length > 0) {
            const gapsCard = el('div', 'bg-white/70 rounded-lg p-4');
            gapsCard.innerHTML = '<h4 class="font-bold text-red-800 mb-3 text-sm">⚠️ Gaps & Missing Mandatory Controls</h4>';
            const gapList = el('ul', 'space-y-1');
            r.controls.gaps.forEach(g => {
                const li = el('li', 'text-xs');
                li.innerHTML = g.startsWith('MANDATORY') ?
                    `<span class="text-red-700 font-semibold">🔴 ${esc(g)}</span>` :
                    `<span class="text-amber-700">🟡 ${esc(g)}</span>`;
                gapList.appendChild(li);
            });
            gapsCard.appendChild(gapList);
            card.appendChild(gapsCard);
        }

        // Formula display
        const formulaCard = el('div', 'bg-white/70 rounded-lg p-4');
        formulaCard.innerHTML = `
            <h4 class="font-bold text-slate-800 mb-2 text-sm">📐 FTRI Formula</h4>
            <div class="text-xs text-slate-700 font-mono bg-white p-3 rounded border border-slate-200">
                FTRI = (Fire Triangle × (1 − Control Effectiveness) × Consequence) ÷ 30 × 100<br>
                FTRI = (${r.triangle.triangleScore.toFixed(2)} × (1 − ${r.controls.totalEffectiveness.toFixed(3)}) × ${r.consequence.toFixed(2)}) ÷ 30 × 100<br>
                FTRI = <strong>${r.score}</strong>
            </div>
        `;
        card.appendChild(formulaCard);

        return card;
    }

    // ── Run Assessment ──
    function runAssessment(zone) {
        // Aggregate ratings from selected sources (use max for worst-case)
        const heat = zone.ignitionSources.length > 0
            ? Math.max(...zone.ignitionSources.map(k => (IGNITION_SOURCES[k] || {}).rating || 1))
            : 1;
        const fuel = zone.fuelSources.length > 0
            ? Math.max(...zone.fuelSources.map(k => (FUEL_SOURCES[k] || {}).rating || 1))
            : 1;
        const oxygen = zone.oxygenConditions.length > 0
            ? Math.max(...zone.oxygenConditions.map(k => (OXYGEN_CONDITIONS[k] || {}).rating || 1))
            : 1;

        return calculateFTRI({
            heat, fuel, oxygen,
            selectedControls: zone.selectedControls,
            occupancyClass: zone.occupancyClass,
            occupantCount: zone.occupantCount,
            areaSqM: zone.areaSqM,
            businessCritical: zone.businessCritical
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 5 — UI HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function el(tag, className, innerHTML) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (innerHTML !== undefined) e.innerHTML = typeof innerHTML === 'string' ? innerHTML : '';
        return e;
    }

    function esc(text) {
        return typeof window.escapeHtml === 'function' ? window.escapeHtml(text) : String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function buildCard(title, color) {
        const colorMap = {
            indigo:  { bg: '#eef2ff', border: '#c7d2fe', text: '#312e81', headerBg: 'linear-gradient(to right, #eef2ff, #e0e7ff)' },
            orange:  { bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12', headerBg: 'linear-gradient(to right, #fff7ed, #ffedd5)' },
            green:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', headerBg: 'linear-gradient(to right, #f0fdf4, #dcfce7)' },
            slate:   { bg: '#f8fafc', border: '#e2e8f0', text: '#1e293b', headerBg: 'linear-gradient(to right, #f8fafc, #f1f5f9)' },
            red:     { bg: '#fef2f2', border: '#fecaca', text: '#7f1d1d', headerBg: 'linear-gradient(to right, #fef2f2, #fee2e2)' }
        };
        const c = colorMap[color] || colorMap.slate;
        const card = el('div', 'rounded-xl shadow-sm overflow-hidden');
        card.style.border = `1px solid ${c.border}`;
        card.style.backgroundColor = '#fff';
        const header = el('div', 'px-5 py-3');
        header.style.background = c.headerBg;
        header.style.borderBottom = `1px solid ${c.border}`;
        header.innerHTML = `<h3 class="font-bold text-sm" style="color:${c.text}">${title}</h3>`;
        card.appendChild(header);
        const body = el('div', 'p-5');
        card.appendChild(body);
        card._body = body;
        return card;
    }
    // Override appendChild on cards to target the body
    function cardAppend(card, child) {
        (card._body || card).appendChild(child);
    }

    function labeledInput(label, type, value, onChange) {
        const wrap = el('div', '');
        wrap.innerHTML = `<label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">${esc(label)}</label>`;
        const input = document.createElement('input');
        input.type = type;
        input.value = value || '';
        input.className = 'w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-orange-500 transition text-sm';
        input.oninput = () => onChange(input.value);
        wrap.appendChild(input);
        return wrap;
    }

    function labeledSelect(label, options, selectedValue, onChange, formatLabel) {
        const wrap = el('div', '');
        wrap.innerHTML = `<label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">${esc(label)}</label>`;
        const select = document.createElement('select');
        select.className = 'w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-orange-500 transition text-sm';
        for (const key of Object.keys(options)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = formatLabel ? formatLabel(key) : key;
            if (key === selectedValue) opt.selected = true;
            select.appendChild(opt);
        }
        select.onchange = () => onChange(select.value);
        wrap.appendChild(select);
        return wrap;
    }

    function renderMultiSelect(title, registry, selectedKeys, onChange, formatLabel) {
        const section = el('div', 'mb-4');
        section.innerHTML = `<h4 class="font-bold text-slate-800 text-sm mb-2">${title}</h4>`;
        const grid = el('div', 'grid grid-cols-1 gap-1 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50');
        for (const key of Object.keys(registry)) {
            const row = el('label', 'flex items-start gap-2 cursor-pointer hover:bg-white p-1.5 rounded text-sm transition');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'mt-0.5 h-4 w-4 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0';
            cb.checked = selectedKeys.includes(key);
            cb.onchange = () => {
                if (cb.checked) {
                    if (!selectedKeys.includes(key)) selectedKeys.push(key);
                } else {
                    const idx = selectedKeys.indexOf(key);
                    if (idx >= 0) selectedKeys.splice(idx, 1);
                }
                onChange(selectedKeys);
            };
            row.appendChild(cb);
            const span = el('span', 'leading-tight');
            span.innerHTML = formatLabel ? formatLabel(key) : esc(key);
            row.appendChild(span);
            grid.appendChild(row);
        }
        section.appendChild(grid);
        return section;
    }

    function metricTile(label, value, sub, color) {
        const tile = el('div', 'bg-white/80 rounded-lg p-3 text-center border border-slate-200');
        tile.innerHTML = `
            <div class="text-xs text-slate-500 font-medium">${label}</div>
            <div class="text-xl font-black" style="color:${color}">${value}</div>
            <div class="text-xs text-slate-400">${sub}</div>
        `;
        return tile;
    }

    function buildTriangleSVG(zone) {
        const heatRating = zone.ignitionSources.length > 0
            ? Math.max(...zone.ignitionSources.map(k => (IGNITION_SOURCES[k] || {}).rating || 1)) : 0;
        const fuelRating = zone.fuelSources.length > 0
            ? Math.max(...zone.fuelSources.map(k => (FUEL_SOURCES[k] || {}).rating || 1)) : 0;
        const oxygenRating = zone.oxygenConditions.length > 0
            ? Math.max(...zone.oxygenConditions.map(k => (OXYGEN_CONDITIONS[k] || {}).rating || 1)) : 0;

        const hColor = ratingColor(heatRating);
        const fColor = ratingColor(fuelRating);
        const oColor = ratingColor(oxygenRating);

        return `
        <svg viewBox="0 0 300 260" width="280" xmlns="http://www.w3.org/2000/svg">
            <!-- Triangle -->
            <polygon points="150,20 30,230 270,230" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,4"/>
            <!-- Leg fills (proportional to rating) -->
            <line x1="150" y1="20" x2="30" y2="230" stroke="${hColor}" stroke-width="${Math.max(heatRating * 0.8, 1)}" stroke-linecap="round"/>
            <line x1="30" y1="230" x2="270" y2="230" stroke="${fColor}" stroke-width="${Math.max(fuelRating * 0.8, 1)}" stroke-linecap="round"/>
            <line x1="270" y1="230" x2="150" y2="20" stroke="${oColor}" stroke-width="${Math.max(oxygenRating * 0.8, 1)}" stroke-linecap="round"/>
            <!-- Labels -->
            <text x="60" y="125" fill="${hColor}" font-size="13" font-weight="bold" text-anchor="middle" transform="rotate(-60 60 125)">🔥 HEAT ${heatRating}/10</text>
            <text x="150" y="255" fill="${fColor}" font-size="13" font-weight="bold" text-anchor="middle">🪵 FUEL ${fuelRating}/10</text>
            <text x="240" y="125" fill="${oColor}" font-size="13" font-weight="bold" text-anchor="middle" transform="rotate(60 240 125)">💨 O₂ ${oxygenRating}/10</text>
            <!-- Center icon -->
            <text x="150" y="170" font-size="32" text-anchor="middle">${heatRating >= 6 && fuelRating >= 6 && oxygenRating >= 6 ? '🔥' : '△'}</text>
        </svg>`;
    }

    function ratingColor(r) {
        if (r >= 8) return '#dc2626';
        if (r >= 6) return '#ea580c';
        if (r >= 4) return '#eab308';
        if (r >= 2) return '#16a34a';
        return '#94a3b8';
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 5B — AI ASSIST, VOICE, PHOTOS, FLOOR PLAN, SAVE/LOAD, REPORTS
    // ═══════════════════════════════════════════════════════════════

    const FRA_API = 'https://risk-assessment-api-nine.vercel.app/api/ai';
    const FRA_MODEL = 'openai/gpt-4o-mini';

    // ── AI-Assisted Zone Analysis ──
    async function fraCallAI(prompt) {
        const res = await fetch(FRA_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: FRA_MODEL, prompt })
        });
        if (!res.ok) throw new Error('AI API request failed: ' + (await res.text()));
        const data = await res.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) throw new Error('Empty AI response');
        return data.choices[0].message.content;
    }

    function buildAIPrompt(description) {
        const allControls = {};
        for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
            allControls[catKey] = Object.keys(catDef.items);
        }
        return 'You are a fire safety expert. Analyze this zone/location description and identify fire hazards using ONLY the exact keys from the registries below.\n\n' +
            'DESCRIPTION: "' + description + '"\n\n' +
            'REGISTRIES (use EXACT keys only):\n' +
            'Ignition Sources: ' + JSON.stringify(Object.keys(IGNITION_SOURCES)) + '\n' +
            'Fuel Sources: ' + JSON.stringify(Object.keys(FUEL_SOURCES)) + '\n' +
            'Oxygen Conditions: ' + JSON.stringify(Object.keys(OXYGEN_CONDITIONS)) + '\n' +
            'Occupancy Classes: ' + JSON.stringify(Object.keys(OCCUPANCY_CLASSES)) + '\n' +
            'Controls: ' + JSON.stringify(allControls) + '\n\n' +
            'Return ONLY valid JSON (no markdown, no explanation):\n' +
            '{"occupancyClass":"exact key","building":"","floor":"","ignitionSources":["exact key"],"fuelSources":["exact key"],"oxygenConditions":["exact key"],"controls":{"detection":["exact key"],"suppression":["exact key"],"compartmentation":["exact key"],"evacuation":["exact key"],"management":["exact key"]},"notes":"brief observations","occupantCount":0,"areaSqM":0,"businessCritical":false}';
    }

    async function aiAnalyzeZone(description, zone) {
        const prompt = buildAIPrompt(description);
        const raw = await fraCallAI(prompt);
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in AI response');
        const result = JSON.parse(jsonMatch[0]);

        // Apply to zone (merge, don't overwrite existing selections)
        if (result.occupancyClass && OCCUPANCY_CLASSES[result.occupancyClass]) {
            zone.occupancyClass = result.occupancyClass;
        }
        if (result.building) zone.building = result.building;
        if (result.floor) zone.floor = result.floor;
        if (typeof result.occupantCount === 'number' && result.occupantCount > 0) zone.occupantCount = result.occupantCount;
        if (typeof result.areaSqM === 'number' && result.areaSqM > 0) zone.areaSqM = result.areaSqM;
        if (typeof result.businessCritical === 'boolean') zone.businessCritical = result.businessCritical;

        const mergeArr = (existing, incoming, validRegistry) => {
            (incoming || []).forEach(k => {
                if (validRegistry[k] && !existing.includes(k)) existing.push(k);
            });
        };
        mergeArr(zone.ignitionSources, result.ignitionSources, IGNITION_SOURCES);
        mergeArr(zone.fuelSources, result.fuelSources, FUEL_SOURCES);
        mergeArr(zone.oxygenConditions, result.oxygenConditions, OXYGEN_CONDITIONS);

        if (result.controls) {
            for (const catKey of Object.keys(CONTROL_CATEGORIES)) {
                if (!zone.selectedControls[catKey]) zone.selectedControls[catKey] = [];
                mergeArr(zone.selectedControls[catKey], result.controls[catKey], CONTROL_CATEGORIES[catKey].items);
            }
        }

        if (result.notes && !zone.notes.includes(result.notes)) {
            zone.notes = zone.notes ? zone.notes + '\n\n[AI] ' + result.notes : '[AI] ' + result.notes;
        }
        return result;
    }

    function renderAIAssistCard(zone) {
        const card = buildCard('🤖 AI-Assisted Zone Analysis', 'indigo');
        const desc = el('p', 'text-sm text-slate-600 mb-3', 'Describe the zone using text or voice. AI will identify ignition sources, fuel, oxygen conditions, and applicable controls from the registries.');
        cardAppend(card, desc);

        const taWrap = el('div', 'relative');
        const ta = el('textarea', 'w-full p-3 pr-12 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm');
        ta.id = 'fra-ai-input';
        ta.rows = 4;
        ta.placeholder = 'Example: "This is a rubber mixing area on the ground floor of Building 4. There are Banbury mixers, carbon black storage bins, hydraulic presses, and conveyor systems. The area has forced ventilation, wet-pipe sprinklers, and smoke detectors. About 15 workers per shift in a 500m² space."';
        taWrap.appendChild(ta);

        const voiceBtn = el('button', 'absolute top-2 right-2 w-9 h-9 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition text-lg', '🎤');
        voiceBtn.title = 'Voice input';
        voiceBtn.onclick = () => toggleVoiceCapture(ta, voiceBtn);
        taWrap.appendChild(voiceBtn);
        cardAppend(card, taWrap);

        const analyzeBtn = el('button', 'mt-3 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2', '🤖 Analyze with AI');
        analyzeBtn.onclick = async () => {
            const text = ta.value.trim();
            if (!text) {
                if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Please describe the zone first.', 'info');
                return;
            }
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing...';
            try {
                await aiAnalyzeZone(text, zone);
                if (typeof window.showCustomAlert === 'function') window.showCustomAlert('AI analysis complete! Fire triangle and controls updated.', 'success');
                renderApp();
            } catch (err) {
                console.error('FRA AI analysis error:', err);
                if (typeof window.showCustomAlert === 'function') window.showCustomAlert('AI analysis failed: ' + err.message, 'error');
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '🤖 Analyze with AI';
            }
        };
        cardAppend(card, analyzeBtn);
        return card;
    }

    // ── Voice Capture (independent SpeechRecognition instance) ──
    let fraRecognition = null;
    let fraRecording = false;
    let fraRecordTarget = null;
    let fraRecordBtn = null;

    function initFRARecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = document.documentElement.lang || 'en-US';
        rec.onresult = (e) => {
            if (!fraRecordTarget) return;
            let finalText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalText += e.results[i][0].transcript;
                }
            }
            if (finalText) {
                fraRecordTarget.value += (fraRecordTarget.value ? ' ' : '') + finalText.trim();
                fraRecordTarget.dispatchEvent(new Event('input'));
            }
        };
        rec.onerror = () => { stopFRAVoice(); };
        rec.onend = () => { if (fraRecording) { try { rec.start(); } catch (e) { /* ignore */ } } };
        return rec;
    }

    function toggleVoiceCapture(textarea, btn) {
        if (fraRecording) { stopFRAVoice(); return; }
        if (!fraRecognition) fraRecognition = initFRARecognition();
        if (!fraRecognition) {
            if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Speech recognition not supported in this browser.', 'error');
            return;
        }
        fraRecordTarget = textarea;
        fraRecordBtn = btn;
        fraRecording = true;
        btn.innerHTML = '🔴';
        btn.style.animation = 'pulse 1s infinite';
        btn.title = 'Stop recording';
        try { fraRecognition.start(); } catch (e) { /* ignore */ }
    }

    function stopFRAVoice() {
        fraRecording = false;
        if (fraRecognition) try { fraRecognition.stop(); } catch (e) { /* ignore */ }
        if (fraRecordBtn) {
            fraRecordBtn.innerHTML = '🎤';
            fraRecordBtn.style.animation = '';
            fraRecordBtn.title = 'Voice input';
        }
        fraRecordTarget = null;
        fraRecordBtn = null;
    }

    // ── Photo Gallery ──
    function renderPhotoGalleryCard(zone) {
        if (!zone.photos) zone.photos = [];
        const card = buildCard('📸 Zone Photos', 'slate');

        const uploadRow = el('div', 'flex gap-2 flex-wrap mb-3');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.onchange = () => handlePhotoUpload(fileInput.files, zone);

        const uploadBtn = el('button', 'px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition', '📁 Upload Photos');
        uploadBtn.onclick = () => fileInput.click();

        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.setAttribute('capture', 'environment');
        cameraInput.style.display = 'none';
        cameraInput.onchange = () => handlePhotoUpload(cameraInput.files, zone);

        const cameraBtn = el('button', 'px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition', '📷 Camera');
        cameraBtn.onclick = () => cameraInput.click();

        uploadRow.appendChild(fileInput);
        uploadRow.appendChild(uploadBtn);
        uploadRow.appendChild(cameraInput);
        uploadRow.appendChild(cameraBtn);
        cardAppend(card, uploadRow);

        if (zone.photos.length > 0) {
            const grid = el('div', 'grid grid-cols-2 sm:grid-cols-3 gap-3');
            zone.photos.forEach((photo, idx) => {
                const item = el('div', 'relative group rounded-lg overflow-hidden border border-slate-200');
                const img = document.createElement('img');
                img.src = photo.data;
                img.className = 'w-full h-32 object-cover';
                img.alt = photo.caption || 'Zone photo ' + (idx + 1);
                item.appendChild(img);

                const captionInput = document.createElement('input');
                captionInput.type = 'text';
                captionInput.value = photo.caption || '';
                captionInput.placeholder = 'Caption...';
                captionInput.className = 'w-full p-1 text-xs border-t border-slate-200 focus:ring-1 focus:ring-orange-500';
                captionInput.oninput = () => { photo.caption = captionInput.value; };
                item.appendChild(captionInput);

                const delBtn = el('button', 'absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center', '\u00d7');
                delBtn.onclick = () => { zone.photos.splice(idx, 1); renderApp(); };
                item.appendChild(delBtn);

                grid.appendChild(item);
            });
            cardAppend(card, grid);
        } else {
            cardAppend(card, el('p', 'text-sm text-slate-400 italic', 'No photos yet. Upload or capture zone images.'));
        }
        return card;
    }

    function handlePhotoUpload(files, zone) {
        if (!files || files.length === 0) return;
        if (!zone.photos) zone.photos = [];
        const maxSize = 800;
        let processed = 0;
        const total = files.length;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        const ratio = Math.min(maxSize / w, maxSize / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const cvs = document.createElement('canvas');
                    cvs.width = w;
                    cvs.height = h;
                    cvs.getContext('2d').drawImage(img, 0, 0, w, h);
                    zone.photos.push({ data: cvs.toDataURL('image/jpeg', 0.85), caption: '' });
                    processed++;
                    if (processed === total) renderApp();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ── Floor Plan with Drawable Zones & Heat Map ──
    function renderFloorPlanCard() {
        const card = buildCard('🗺️ Floor Plan & Heat Map', 'slate');

        if (!floorPlanImg) {
            const uploadWrap = el('div', 'text-center py-8');
            const fpInput = document.createElement('input');
            fpInput.type = 'file';
            fpInput.accept = 'image/*';
            fpInput.style.display = 'none';
            fpInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => { floorPlanImg = ev.target.result; renderApp(); };
                reader.readAsDataURL(file);
            };
            uploadWrap.appendChild(fpInput);
            const fpBtn = el('button', 'px-6 py-3 bg-indigo-100 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-700 font-semibold hover:bg-indigo-50 transition', '🗺️ Upload Floor Plan / Location Map');
            fpBtn.onclick = () => fpInput.click();
            uploadWrap.appendChild(fpBtn);
            uploadWrap.appendChild(el('p', 'text-xs text-slate-400 mt-2', 'Upload a building layout, site map, or floor plan. Draw zone boundaries and generate a risk heat map.'));
            cardAppend(card, uploadWrap);
        } else {
            cardAppend(card, el('p', 'text-sm text-slate-600 mb-3', 'Click and drag on the map to mark the current zone\'s boundary. Click "Show Heat Map" to overlay risk levels.'));

            const toolRow = el('div', 'flex gap-2 flex-wrap mb-3');
            const drawBtn = el('button', 'px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-lg text-xs font-semibold text-orange-800 hover:bg-orange-200 transition', '✏️ Draw Zone Boundary');
            const heatBtn = el('button', 'px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg text-xs font-semibold text-red-800 hover:bg-red-200 transition', '🌡️ Show Heat Map');
            const clearFpBtn = el('button', 'px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition', '🗑️ Remove Floor Plan');
            clearFpBtn.onclick = () => { floorPlanImg = null; zones.forEach(z => { z.mapRect = null; }); renderApp(); };
            toolRow.appendChild(drawBtn);
            toolRow.appendChild(heatBtn);
            toolRow.appendChild(clearFpBtn);
            cardAppend(card, toolRow);

            const canvasWrap = el('div', 'relative border border-slate-300 rounded-lg overflow-hidden');
            canvasWrap.style.maxHeight = '600px';
            const canvas = document.createElement('canvas');
            canvas.id = 'fra-floor-plan-canvas';
            canvas.style.width = '100%';
            canvas.style.display = 'block';
            canvas.style.cursor = 'crosshair';
            canvasWrap.appendChild(canvas);
            cardAppend(card, canvasWrap);

            const legend = el('div', 'flex gap-4 flex-wrap mt-3 text-xs text-slate-600');
            legend.innerHTML = '<span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded" style="background:#dc2626;opacity:0.5"></span> Critical</span>' +
                '<span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded" style="background:#ea580c;opacity:0.5"></span> High</span>' +
                '<span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded" style="background:#eab308;opacity:0.5"></span> Medium</span>' +
                '<span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded" style="background:#16a34a;opacity:0.5"></span> Low</span>' +
                '<span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded border border-dashed border-orange-400"></span> Active Zone</span>';
            cardAppend(card, legend);

            requestAnimationFrame(() => initFloorPlanCanvas(canvas, drawBtn, heatBtn));
        }
        return card;
    }

    function initFloorPlanCanvas(canvas, drawBtn, heatBtn) {
        if (!floorPlanImg) return;
        const img = new Image();
        img.onload = () => {
            const containerWidth = canvas.parentElement.clientWidth || 800;
            const scale = containerWidth / img.width;
            canvas.width = containerWidth;
            canvas.height = Math.round(img.height * scale);

            drawFloorPlan(canvas, img, false);

            let drawing = false, startX = 0, startY = 0;

            drawBtn.onclick = () => {
                canvas.style.cursor = 'crosshair';
                if (activeZoneIdx >= 0 && typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert('Click and drag on the map to mark "' + zones[activeZoneIdx].name + '".', 'info');
                }
            };
            heatBtn.onclick = () => { drawFloorPlan(canvas, img, true); };

            const getPos = (e) => {
                const rect = canvas.getBoundingClientRect();
                const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
                const cx = e.touches ? e.touches[0].clientX : e.clientX;
                const cy = e.touches ? e.touches[0].clientY : e.clientY;
                return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
            };
            const onStart = (e) => { e.preventDefault(); const p = getPos(e); drawing = true; startX = p.x; startY = p.y; };
            const onMove = (e) => {
                if (!drawing) return;
                e.preventDefault();
                const p = getPos(e);
                drawFloorPlan(canvas, img, false);
                const ctx = canvas.getContext('2d');
                ctx.strokeStyle = '#ea580c';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.strokeRect(startX, startY, p.x - startX, p.y - startY);
                ctx.setLineDash([]);
            };
            const onEnd = (e) => {
                if (!drawing) return;
                drawing = false;
                const t = e.changedTouches ? e.changedTouches[0] : e;
                const p = getPos(t);
                const r = { x: Math.min(startX, p.x), y: Math.min(startY, p.y), w: Math.abs(p.x - startX), h: Math.abs(p.y - startY) };
                if (r.w > 10 && r.h > 10 && activeZoneIdx >= 0) {
                    zones[activeZoneIdx].mapRect = r;
                    drawFloorPlan(canvas, img, false);
                }
            };

            canvas.addEventListener('mousedown', onStart);
            canvas.addEventListener('mousemove', onMove);
            canvas.addEventListener('mouseup', onEnd);
            canvas.addEventListener('touchstart', onStart, { passive: false });
            canvas.addEventListener('touchmove', onMove, { passive: false });
            canvas.addEventListener('touchend', onEnd);
        };
        img.src = floorPlanImg;
    }

    function drawFloorPlan(canvas, img, showHeatMap) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const heatColors = { 'CRITICAL': '#dc2626', 'HIGH': '#ea580c', 'MEDIUM': '#eab308', 'LOW': '#16a34a' };

        zones.forEach((z, i) => {
            if (!z.mapRect) return;
            const r = z.mapRect;

            if (showHeatMap && z.result) {
                ctx.fillStyle = heatColors[z.result.category.label] || '#94a3b8';
                ctx.globalAlpha = 0.35;
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = i === activeZoneIdx ? '#ea580c' : '#64748b';
            ctx.lineWidth = i === activeZoneIdx ? 3 : 1.5;
            ctx.setLineDash(i === activeZoneIdx ? [8, 4] : []);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
            ctx.setLineDash([]);

            const label = z.name + (z.result ? ' (' + z.result.score + ')' : '');
            ctx.font = 'bold 12px sans-serif';
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = i === activeZoneIdx ? '#ea580c' : '#475569';
            ctx.fillRect(r.x, r.y - 18, tw + 8, 18);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, r.x + 4, r.y - 4);
        });
    }

    // ── Save / Load / Merge JSON ──
    function saveProjectJSON() {
        const data = {
            version: '3.0-fra',
            savedAt: new Date().toISOString(),
            zones: JSON.parse(JSON.stringify(zones)),
            activeZoneIdx,
            floorPlanImg: floorPlanImg || null
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'FireRA_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Fire Risk Assessment saved!', 'success');
    }

    function loadProjectJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.zones || !Array.isArray(data.zones)) throw new Error('Invalid file format — missing zones array');
                    zones = data.zones;
                    activeZoneIdx = typeof data.activeZoneIdx === 'number' ? data.activeZoneIdx : 0;
                    if (data.floorPlanImg) floorPlanImg = data.floorPlanImg;
                    renderApp();
                    if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Loaded ' + zones.length + ' zone(s) successfully!', 'success');
                } catch (err) {
                    if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Failed to load file: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function mergeFromJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.zones || !Array.isArray(data.zones)) throw new Error('Invalid file format');
                    const count = data.zones.length;
                    data.zones.forEach(z => zones.push(z));
                    if (data.floorPlanImg && !floorPlanImg) floorPlanImg = data.floorPlanImg;
                    activeZoneIdx = zones.length - 1;
                    renderApp();
                    if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Merged ' + count + ' zone(s) from file!', 'success');
                } catch (err) {
                    if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Failed to merge: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ── PDF Report ──
    async function generateFRAPDF() {
        if (typeof PDFDocument === 'undefined' || typeof blobStream === 'undefined') {
            if (typeof window.showCustomAlert === 'function') window.showCustomAlert('PDFKit is not loaded. Cannot generate PDF.', 'error');
            return;
        }
        if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Generating PDF report...', 'info');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = doc.pipe(blobStream());
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        // TITLE PAGE
        doc.moveDown(4);
        doc.fontSize(28).font('Helvetica-Bold').text('FIRE RISK ASSESSMENT', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').text('Fire Triangle Risk Index (FTRI) Report', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(11).text('Date: ' + dateStr, { align: 'center' });
        doc.text('Zones Assessed: ' + zones.length, { align: 'center' });
        doc.text('Methodology: NFPA / OSHA / FM Global', { align: 'center' });

        // EXECUTIVE SUMMARY
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Executive Summary');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        zones.forEach((z, i) => {
            if (doc.y > 700) doc.addPage();
            const r = z.result;
            doc.font('Helvetica-Bold').fontSize(10).text((i + 1) + '. ' + z.name + (r ? ' — ' + r.category.label + ' (' + r.score + '/100)' : ' — Not calculated'));
            doc.font('Helvetica').fontSize(9);
            doc.text('   Building: ' + (z.building || '\u2014') + '  |  Floor: ' + (z.floor || '\u2014') + '  |  Occupancy: ' + z.occupancyClass);
            if (r) {
                doc.text('   Heat: ' + r.heat + '/10  |  Fuel: ' + r.fuel + '/10  |  Oxygen: ' + r.oxygen + '/10  |  Control Eff: ' + Math.round(r.controls.totalEffectiveness * 100) + '%');
                doc.text('   Action: ' + r.category.action);
            }
            doc.moveDown(0.3);
        });

        // ZONE DETAIL PAGES
        zones.forEach((z, i) => {
            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').text('Zone ' + (i + 1) + ': ' + z.name);
            doc.moveDown(0.3);

            doc.fontSize(10).font('Helvetica');
            doc.text('Building: ' + (z.building || '\u2014') + '  |  Floor: ' + (z.floor || '\u2014') + '  |  Occupancy: ' + z.occupancyClass);
            doc.text('Occupants: ' + z.occupantCount + '  |  Area: ' + z.areaSqM + ' m\u00b2  |  Business Critical: ' + (z.businessCritical ? 'Yes' : 'No'));
            doc.moveDown(0.5);

            // Fire Triangle
            doc.fontSize(13).font('Helvetica-Bold').text('Fire Triangle');
            doc.fontSize(9).font('Helvetica');
            if (z.result) {
                doc.text('Heat: ' + z.result.heat + '/10  |  Fuel: ' + z.result.fuel + '/10  |  Oxygen: ' + z.result.oxygen + '/10');
                doc.text('Triangle Score: ' + z.result.triangle.triangleScore.toFixed(2) + '/15  |  Interaction: \u00d7' + z.result.triangle.interaction);
            }
            doc.moveDown(0.3);
            doc.text('Ignition Sources: ' + (z.ignitionSources.length > 0 ? z.ignitionSources.join(', ') : 'None'));
            doc.text('Fuel Sources: ' + (z.fuelSources.length > 0 ? z.fuelSources.join(', ') : 'None'));
            doc.text('Oxygen Conditions: ' + (z.oxygenConditions.length > 0 ? z.oxygenConditions.join(', ') : 'None'));
            doc.moveDown(0.5);

            // Controls
            doc.fontSize(13).font('Helvetica-Bold').text('Fire Protection Controls');
            doc.fontSize(9).font('Helvetica');
            for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
                const sel = z.selectedControls[catKey] || [];
                doc.text(catDef.label.replace(/^[^\s]+\s/, '') + ': ' + (sel.length > 0 ? sel.join('; ') : '(none)'));
            }
            doc.moveDown(0.5);

            // Result
            if (z.result) {
                doc.fontSize(13).font('Helvetica-Bold').text('FTRI Result');
                doc.fontSize(9).font('Helvetica');
                doc.text('Score: ' + z.result.score + '/100  |  Category: ' + z.result.category.label + '  |  Control Eff: ' + Math.round(z.result.controls.totalEffectiveness * 100) + '%');
                doc.text('Consequence Amplifier: \u00d7' + z.result.consequence.toFixed(2));
                doc.text('Action: ' + z.result.category.action);

                if (z.result.controls.gaps.length > 0) {
                    doc.moveDown(0.3);
                    doc.font('Helvetica-Bold').text('Gaps & Missing Controls:');
                    doc.font('Helvetica');
                    z.result.controls.gaps.forEach(g => doc.text('  \u2022 ' + g));
                }
            }

            // Notes
            if (z.notes) {
                doc.moveDown(0.5);
                doc.fontSize(13).font('Helvetica-Bold').text('Notes');
                doc.fontSize(9).font('Helvetica').text(z.notes);
            }

            // Photos
            if (z.photos && z.photos.length > 0) {
                doc.moveDown(0.5);
                doc.fontSize(13).font('Helvetica-Bold').text('Zone Photos');
                doc.moveDown(0.3);
                z.photos.forEach((photo) => {
                    if (doc.y > 550) doc.addPage();
                    try {
                        doc.image(photo.data, { fit: [240, 180], align: 'center' });
                        if (photo.caption) doc.fontSize(8).font('Helvetica').text(photo.caption, { align: 'center' });
                        doc.moveDown(0.5);
                    } catch (e) { /* skip invalid images */ }
                });
            }
        });

        doc.end();

        return new Promise((resolve) => {
            stream.on('finish', () => {
                const blob = stream.toBlob('application/pdf');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'FireRA_Report_' + new Date().toISOString().slice(0, 10) + '.pdf';
                a.click();
                URL.revokeObjectURL(url);
                if (typeof window.showCustomAlert === 'function') window.showCustomAlert('PDF report downloaded!', 'success');
                resolve(blob);
            });
        });
    }

    // ── HTML Report ──
    function generateFRAHTML() {
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        let zonesHTML = '';
        zones.forEach((z, i) => {
            const r = z.result;
            const catColor = r ? r.category.color : '#64748b';
            const catLabel = r ? r.category.label : 'NOT CALCULATED';
            const catBg = r ? r.category.bg : '#f1f5f9';

            let photosHTML = '';
            if (z.photos && z.photos.length > 0) {
                photosHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">' +
                    z.photos.map(p => '<div style="flex:0 0 auto;"><img src="' + p.data + '" style="height:120px;border-radius:4px;border:1px solid #e2e8f0;" alt="' + esc(p.caption || '') + '"/>' + (p.caption ? '<div style="font-size:10px;text-align:center;color:#64748b;">' + esc(p.caption) + '</div>' : '') + '</div>').join('') +
                    '</div>';
            }

            let controlsHTML = '';
            for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
                const sel = z.selectedControls[catKey] || [];
                controlsHTML += '<div style="margin-bottom:4px;"><strong>' + catDef.label + ':</strong> ' + (sel.length > 0 ? sel.map(s => esc(s)).join('; ') : '<em>(none)</em>') + '</div>';
            }

            let gapsHTML = '';
            if (r && r.controls.gaps.length > 0) {
                gapsHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-top:8px;"><h4 style="color:#7f1d1d;margin:0 0 6px;">Gaps &amp; Missing Controls</h4>' +
                    r.controls.gaps.map(g => '<div style="font-size:12px;color:' + (g.startsWith('MANDATORY') ? '#7f1d1d' : '#854d0e') + ';">' + (g.startsWith('MANDATORY') ? '\ud83d\udd34' : '\ud83d\udfe1') + ' ' + esc(g) + '</div>').join('') +
                    '</div>';
            }

            zonesHTML += '<div style="break-inside:avoid;border:2px solid ' + (r ? r.category.border : '#e2e8f0') + ';border-radius:12px;padding:20px;margin-bottom:20px;background:' + catBg + ';">' +
                '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">' +
                (r ? '<div style="width:80px;height:80px;border-radius:50%;background:' + catColor + ';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;"><span style="font-size:24px;">' + r.score + '</span><span style="font-size:10px;opacity:0.8;">/100</span></div>' : '') +
                '<div><h2 style="margin:0;color:' + catColor + ';">Zone ' + (i + 1) + ': ' + esc(z.name) + '</h2>' +
                '<div style="color:' + catColor + ';font-weight:600;font-size:14px;">' + catLabel + '</div>' +
                (r ? '<div style="font-size:12px;color:' + catColor + ';">' + r.category.action + '</div>' : '') +
                '</div></div>' +

                '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">' +
                '<tr><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Building</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + esc(z.building || '\u2014') + '</td>' +
                '<td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Floor</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + esc(z.floor || '\u2014') + '</td></tr>' +
                '<tr><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Occupancy</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + esc(z.occupancyClass) + '</td>' +
                '<td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Area</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + z.areaSqM + ' m\u00b2</td></tr>' +
                '<tr><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Occupants</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + z.occupantCount + '</td>' +
                '<td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Critical</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + (z.businessCritical ? 'Yes' : 'No') + '</td></tr></table>' +

                (r ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">' +
                    '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:10px;color:#64748b;">Heat</div><div style="font-size:18px;font-weight:900;color:#dc2626;">' + r.heat + '/10</div></div>' +
                    '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:10px;color:#64748b;">Fuel</div><div style="font-size:18px;font-weight:900;color:#d97706;">' + r.fuel + '/10</div></div>' +
                    '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:10px;color:#64748b;">Oxygen</div><div style="font-size:18px;font-weight:900;color:#2563eb;">' + r.oxygen + '/10</div></div></div>' : '') +

                '<div style="font-size:12px;margin-bottom:8px;"><strong>Ignition Sources:</strong> ' + (z.ignitionSources.length > 0 ? z.ignitionSources.map(s => esc(s)).join(', ') : '<em>None</em>') + '</div>' +
                '<div style="font-size:12px;margin-bottom:8px;"><strong>Fuel Sources:</strong> ' + (z.fuelSources.length > 0 ? z.fuelSources.map(s => esc(s)).join(', ') : '<em>None</em>') + '</div>' +
                '<div style="font-size:12px;margin-bottom:12px;"><strong>Oxygen Conditions:</strong> ' + (z.oxygenConditions.length > 0 ? z.oxygenConditions.map(s => esc(s)).join(', ') : '<em>None</em>') + '</div>' +
                '<div style="font-size:12px;margin-bottom:8px;">' + controlsHTML + '</div>' +
                gapsHTML +
                (z.notes ? '<div style="background:#fff;border-radius:8px;padding:12px;margin-top:8px;font-size:12px;border:1px solid #e2e8f0;"><strong>Notes:</strong> ' + esc(z.notes) + '</div>' : '') +
                photosHTML +
                '</div>';
        });

        const html = '<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
            '<title>Fire Risk Assessment Report \u2014 ' + dateStr + '</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#f8fafc;color:#1e293b;}h1{text-align:center;color:#7f1d1d;}.meta{text-align:center;color:#64748b;font-size:13px;margin-bottom:24px;}@media print{body{background:#fff;padding:0;}.no-print{display:none;}}</style>' +
            '</head><body>' +
            '<h1>\ud83d\udd25 Fire Risk Assessment Report</h1>' +
            '<div class="meta">' + dateStr + ' \u2022 ' + zones.length + ' zone(s) assessed \u2022 Methodology: FTRI (NFPA/OSHA)</div>' +
            zonesHTML +
            '<div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;">Generated by Risk Assessment Buddy Smart 3.0 \u2014 Fire Triangle Risk Index (FTRI)</div>' +
            '</body></html>';

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FireRA_Report_' + new Date().toISOString().slice(0, 10) + '.html';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof window.showCustomAlert === 'function') window.showCustomAlert('HTML report downloaded!', 'success');
    }

    // ── Toolbar ──
    function renderToolbar() {
        const bar = el('div', 'flex gap-2 flex-wrap items-center mb-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200');
        bar.appendChild(el('span', 'font-bold text-slate-800 text-sm mr-auto', '🔥 Fire Risk Assessment'));

        const btnDefs = [
            { label: '💾 Save', action: saveProjectJSON, cls: 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100' },
            { label: '📂 Load', action: loadProjectJSON, cls: 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100' },
            { label: '➕ Merge Zones', action: mergeFromJSON, cls: 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' },
            { label: '📄 PDF Report', action: generateFRAPDF, cls: 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100' },
            { label: '🌐 HTML Report', action: generateFRAHTML, cls: 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100' }
        ];
        btnDefs.forEach(b => {
            const btn = el('button', 'px-3 py-1.5 border rounded-lg text-xs font-semibold transition ' + b.cls, b.label);
            btn.onclick = b.action;
            bar.appendChild(btn);
        });
        return bar;
    }

    // ── Copy Report to Clipboard ──
    function copyReport(zone) {
        if (!zone.result) {
            if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Calculate the Fire Risk Index first.', 'info');
            return;
        }
        const r = zone.result;
        const lines = [
            '═══════════════════════════════════════════════',
            'FIRE RISK ASSESSMENT REPORT',
            '═══════════════════════════════════════════════',
            '',
            `Zone: ${zone.name}`,
            `Building: ${zone.building || '—'}`,
            `Floor: ${zone.floor || '—'}`,
            `Occupancy: ${zone.occupancyClass}`,
            `Occupants: ${zone.occupantCount}`,
            `Area: ${zone.areaSqM} m²`,
            `Business Critical: ${zone.businessCritical ? 'Yes' : 'No'}`,
            '',
            '── FIRE TRIANGLE ──',
            `Heat (Ignition): ${r.heat}/10`,
            `Fuel (Combustibles): ${r.fuel}/10`,
            `Oxygen: ${r.oxygen}/10`,
            `Triangle Score: ${r.triangle.triangleScore.toFixed(2)}/15`,
            `Interaction Factor: ×${r.triangle.interaction}`,
            '',
            '── IGNITION SOURCES ──',
            ...(zone.ignitionSources.length > 0 ? zone.ignitionSources.map(s => `  • ${s}`) : ['  (none selected)']),
            '',
            '── FUEL SOURCES ──',
            ...(zone.fuelSources.length > 0 ? zone.fuelSources.map(s => `  • ${s}`) : ['  (none selected)']),
            '',
            '── OXYGEN CONDITIONS ──',
            ...(zone.oxygenConditions.length > 0 ? zone.oxygenConditions.map(s => `  • ${s}`) : ['  (none selected)']),
            '',
            '── CONTROLS IN PLACE ──'
        ];
        for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
            lines.push(`  ${catDef.label}:`);
            const sel = zone.selectedControls[catKey] || [];
            if (sel.length === 0) lines.push('    (none)');
            else sel.forEach(s => lines.push(`    ✓ ${s}`));
        }
        lines.push('');
        lines.push('── RESULT ──');
        lines.push(`FTRI Score: ${r.score}/100`);
        lines.push(`Category: ${r.category.label}`);
        lines.push(`Action: ${r.category.action}`);
        lines.push(`Control Effectiveness: ${Math.round(r.controls.totalEffectiveness * 100)}%`);
        lines.push(`Consequence Amplifier: ×${r.consequence.toFixed(2)}`);
        if (r.controls.gaps.length > 0) {
            lines.push('');
            lines.push('── GAPS & MISSING CONTROLS ──');
            r.controls.gaps.forEach(g => lines.push(`  ⚠ ${g}`));
        }
        if (zone.notes) {
            lines.push('');
            lines.push('── NOTES ──');
            lines.push(zone.notes);
        }
        lines.push('');
        lines.push(`Report generated: ${new Date().toISOString().slice(0, 10)}`);
        lines.push('Methodology: FTRI (Fire Triangle Risk Index) — NFPA/OSHA based');

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Fire Risk Report copied to clipboard!', 'success');
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 6 — INITIALIZATION & EXPOSED API
    // ═══════════════════════════════════════════════════════════════

    function init() {
        const root = getRoot();
        if (!root) return;
        if (zones.length === 0) {
            zones.push(createBlankZone('Zone 1'));
            activeZoneIdx = 0;
        }
        renderApp();
    }

    /** Export zone data for project save/load */
    function exportData() {
        return { zones: JSON.parse(JSON.stringify(zones)), activeZoneIdx, floorPlanImg: floorPlanImg || null };
    }

    /** Import zone data from project save */
    function importData(data) {
        if (data && Array.isArray(data.zones)) {
            zones = data.zones;
            activeZoneIdx = typeof data.activeZoneIdx === 'number' ? data.activeZoneIdx : 0;
            if (data.floorPlanImg) floorPlanImg = data.floorPlanImg;
            renderApp();
        }
    }

    window.FireRiskAssessment = {
        init,
        renderApp,
        exportData,
        importData,
        calculateFTRI,
        saveProjectJSON,
        loadProjectJSON,
        mergeFromJSON,
        generateFRAPDF,
        generateFRAHTML,
        OCCUPANCY_CLASSES,
        IGNITION_SOURCES,
        FUEL_SOURCES,
        OXYGEN_CONDITIONS,
        CONTROL_CATEGORIES
    };

})();
