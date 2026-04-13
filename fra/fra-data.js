/**
 * fra-data.js — Fire Risk Assessment: Registries, FTRI Engine & Zone Schema
 * 
 * Contains all NFPA/OSHA-backed fire hazard registries, the FTRI scoring
 * engine, and the zone data model. No UI code — pure data & logic.
 */
(function () {
    'use strict';

    window.FRA = window.FRA || {};

    // ═══════════════════════════════════════════════════════════════
    // OCCUPANCY CLASSES (NFPA 101)
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // IGNITION SOURCE REGISTRY — HEAT leg
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // FUEL LOAD REGISTRY — FUEL leg
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // OXYGEN / ATMOSPHERE REGISTRY — OXYGEN leg
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // NFPA 30 LIQUID CLASSES — Volume-Based FTRI Fuel Amplification
    // Reference: NFPA 30 (2024) Table 2.7.1.1 — Maximum Allowable
    // Quantity (MAQ) per control area, non-sprinklered & sprinklered.
    // ═══════════════════════════════════════════════════════════════
    const NFPA30_LIQUID_CLASSES = {
        'Class IA': {
            label:       'Class IA — Extremely Flammable',
            description: 'Flash point < 22.8°C AND boiling point < 37.8°C',
            examples:    'Diethyl ether, pentane, acetaldehyde, carbon disulfide',
            nfpa704F: 4,
            maqL_none: 114,    // 30 gal — unprotected control area
            maqL_sprk: 455,    // 120 gal — sprinklered (×4, NFPA 30 §9.4)
            ftriBase:  10,
            color: '#7f1d1d', textColor: '#fca5a5'
        },
        'Class IB': {
            label:       'Class IB — Highly Flammable',
            description: 'Flash point < 22.8°C AND boiling point ≥ 37.8°C',
            examples:    'Gasoline, acetone, ethanol, methanol, hexane, toluene, MEK, isopropanol',
            nfpa704F: 3,
            maqL_none: 114,
            maqL_sprk: 455,
            ftriBase:  9,
            color: '#9a3412', textColor: '#fdba74'
        },
        'Class IC': {
            label:       'Class IC — Flammable',
            description: 'Flash point ≥ 22.8°C AND < 37.8°C',
            examples:    'n-Butanol, VM&P naphtha, turpentine, some adhesives and coatings',
            nfpa704F: 3,
            maqL_none: 114,
            maqL_sprk: 455,
            ftriBase:  8,
            color: '#c2410c', textColor: '#fed7aa'
        },
        'Class II': {
            label:       'Class II — Combustible',
            description: 'Flash point ≥ 37.8°C AND < 60°C',
            examples:    'Diesel, kerosene, No. 2 fuel oil, mineral spirits, Stoddard solvent',
            nfpa704F: 2,
            maqL_none: 454,    // 120 gal
            maqL_sprk: 1817,   // 480 gal
            ftriBase:  7,
            color: '#d97706', textColor: '#fde68a'
        },
        'Class IIIA': {
            label:       'Class IIIA — Combustible',
            description: 'Flash point ≥ 60°C AND < 93.3°C',
            examples:    'Hydraulic oils, linseed oil, creosote, many lubricating oils',
            nfpa704F: 2,
            maqL_none: 1249,   // 330 gal
            maqL_sprk: 4996,   // 1320 gal
            ftriBase:  6,
            color: '#ca8a04', textColor: '#fef08a'
        },
        'Class IIIB': {
            label:       'Class IIIB — Combustible',
            description: 'Flash point ≥ 93.3°C',
            examples:    'Lubricating oils, cooking oils, gear oil, heavy fuel oil',
            nfpa704F: 1,
            maqL_none: 49960,  // 13,200 gal
            maqL_sprk: 99920,
            ftriBase:  4,
            color: '#71717a', textColor: '#e4e4e7'
        }
    };

    // NFPA 704 Flammability (0–4) → FTRI fuel leg scale (0–10)
    const NFPA704F_TO_FTRI = { 4: 10, 3: 8, 2: 6, 1: 4, 0: 1 };

    // Volume unit → litres conversion factors
    const VOLUME_UNIT_CONVERSIONS = {
        'L':                               1,
        'mL':                              0.001,
        'gal (US)':                        3.785,
        'gal (Imperial)':                  4.546,
        'drum — 55 gal / 208 L':          208.2,
        'IBC — 275 gal / 1041 L':         1041.0,
        'kg (ρ≈0.8 — light solvents)':    1.25,
        'kg (ρ≈1.0 — aqueous liquids)':   1.0,
        'kg (ρ≈1.2 — heavy/halogenated)': 0.833
    };

    /** Determine NFPA 30 class from flash point (°C) and optional boiling point (°C). */
    function getNFPA30Class(flashpointC, boilingPointC) {
        if (flashpointC === null || flashpointC === undefined || isNaN(Number(flashpointC))) return null;
        const fp = Number(flashpointC);
        if (fp < 22.8) {
            const bp = Number(boilingPointC);
            return (!isNaN(bp) && boilingPointC !== null && bp < 37.8) ? 'Class IA' : 'Class IB';
        }
        if (fp < 37.8) return 'Class IC';
        if (fp < 60.0) return 'Class II';
        if (fp < 93.3) return 'Class IIIA';
        return 'Class IIIB';
    }

    /** Convert a quantity to litres using a VOLUME_UNIT_CONVERSIONS key. */
    function convertVolumeToLiters(value, unit) {
        const factor = VOLUME_UNIT_CONVERSIONS[unit] || 1;
        return (parseFloat(value) || 0) * factor;
    }

    /**
     * Volume-based amplifier for the FTRI fuel leg (NFPA 30 MAQ comparison).
     * For each NFPA 30 class, compare total stored volume to the MAQ threshold.
     * Amplifier scale: 0 (within 25% MAQ) → 4 (>200% MAQ — code violation level).
     */
    function calcVolumeAmplifier(chemicals, hasSprinklers) {
        const classTotals = {};
        (chemicals || []).forEach(c => {
            if (!c.volumeLiters || c.volumeLiters <= 0) return;
            const cls = c.nfpa30Class;
            if (!cls || !NFPA30_LIQUID_CLASSES[cls]) return;
            classTotals[cls] = (classTotals[cls] || 0) + c.volumeLiters;
        });
        let maxAmplifier = 0;
        const classDetails = [];
        for (const [cls, totalLiters] of Object.entries(classTotals)) {
            const def = NFPA30_LIQUID_CLASSES[cls];
            const maq = hasSprinklers ? def.maqL_sprk : def.maqL_none;
            const ratio = totalLiters / maq;
            let amp = 0;
            if      (ratio > 2.0)  amp = 4;  // >200% — fire code violation territory
            else if (ratio > 1.0)  amp = 3;  // 100–200% — exceeds permitted limit
            else if (ratio > 0.5)  amp = 2;  // 50–100% — approaching limit
            else if (ratio > 0.25) amp = 1;  // 25–50% — notable accumulation
            if (amp > maxAmplifier) maxAmplifier = amp;
            classDetails.push({
                cls,
                totalLiters: Math.round(totalLiters * 10) / 10,
                maq,
                ratio:     Math.round(ratio * 100) / 100,
                amplifier: amp,
                exceeds:   ratio > 1.0
            });
        }
        return { maxAmplifier, classDetails };
    }

    /**
     * Compute the chemical-driven fuel leg rating:
     *   base = max NFPA 704-F across all chemicals (mapped to FTRI 0–10 scale)
     *   final = min(10, base + volume_amplifier)
     * Returns { rating, baseRating, volumeAmplifier, classDetails, hasChemicals, amplified }
     */
    function calcChemicalFuelRating(chemicals, hasSprinklers) {
        if (!chemicals || chemicals.length === 0)
            return { rating: 0, hasChemicals: false, baseRating: 0, volumeAmplifier: 0, classDetails: [] };

        let baseRating = 0;
        chemicals.forEach(c => {
            const fromF  = (c.nfpa704F !== null && c.nfpa704F !== undefined)
                ? (NFPA704F_TO_FTRI[c.nfpa704F] || 0) : 0;
            const fromCl = c.nfpa30Class && NFPA30_LIQUID_CLASSES[c.nfpa30Class]
                ? NFPA30_LIQUID_CLASSES[c.nfpa30Class].ftriBase : 0;
            const cMax = Math.max(fromF, fromCl);
            if (cMax > baseRating) baseRating = cMax;
        });

        const volResult = calcVolumeAmplifier(chemicals, hasSprinklers);
        const rating = Math.min(10, baseRating + volResult.maxAmplifier);
        return {
            rating,
            baseRating,
            volumeAmplifier: volResult.maxAmplifier,
            classDetails:    volResult.classDetails,
            hasChemicals:    true,
            amplified:       volResult.maxAmplifier > 0
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTROL CATEGORIES with effectiveness weights
    // ═══════════════════════════════════════════════════════════════
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
    // FTRI SCORING ENGINE
    // ═══════════════════════════════════════════════════════════════

    function calcFireTriangle(heat, fuel, oxygen) {
        const avg = (heat + fuel + oxygen) / 3;
        const minLeg = Math.min(heat, fuel, oxygen);
        let interaction = 1.0;
        if (minLeg >= 8)      interaction = 1.5;
        else if (minLeg >= 6) interaction = 1.3;
        else if (minLeg >= 4) interaction = 1.15;
        const rawScore = avg * interaction;
        return { triangleScore: Math.min(rawScore, 15), interaction, rawScore };
    }

    function calcControlEffectiveness(selectedControls) {
        const categoryScores = {};
        const gaps = [];

        for (const [catKey, catDef] of Object.entries(CONTROL_CATEGORIES)) {
            const selected = selectedControls[catKey] || [];
            if (selected.length === 0) {
                categoryScores[catKey] = 0;
                gaps.push('No ' + catDef.label.replace(/^[^\s]+\s/, '') + ' in place');
                for (const [itemName, itemDef] of Object.entries(catDef.items)) {
                    if (itemDef.mandatory) {
                        gaps.push('MANDATORY MISSING: ' + itemName + ' (' + itemDef.standard + ')');
                    }
                }
                continue;
            }
            let effectivenessSum = 0;
            selected.forEach(itemKey => {
                const item = catDef.items[itemKey];
                if (item) effectivenessSum += item.effectiveness;
            });
            const avgEffectiveness = effectivenessSum / selected.length;
            const coverageFactor = Math.min(selected.length / Object.keys(catDef.items).length * 1.5, 1.0);
            categoryScores[catKey] = avgEffectiveness * coverageFactor * catDef.maxWeight;

            for (const [itemName, itemDef] of Object.entries(catDef.items)) {
                if (itemDef.mandatory && !selected.includes(itemName)) {
                    gaps.push('MANDATORY MISSING: ' + itemName + ' (' + itemDef.standard + ')');
                }
            }
        }

        const totalEffectiveness = Math.min(
            Object.values(categoryScores).reduce((a, b) => a + b, 0),
            0.80
        );
        return { totalEffectiveness, categoryScores, gaps };
    }

    function calcConsequenceAmplifier(occupancyClass, occupantCount, areaSqM, businessCritical) {
        const occ = OCCUPANCY_CLASSES[occupancyClass] || { baseConsequence: 1.0 };
        let amplifier = occ.baseConsequence;
        if (areaSqM > 0 && occupantCount > 0) {
            const density = occupantCount / areaSqM;
            if (density > 0.1) amplifier += 0.2;
            else if (density > 0.05) amplifier += 0.1;
        }
        if (businessCritical) amplifier += 0.2;
        return Math.min(amplifier, 2.0);
    }

    function calculateFTRI(params) {
        const { heat, fuel, oxygen, selectedControls, occupancyClass, occupantCount, areaSqM, businessCritical } = params;
        const triangle = calcFireTriangle(heat, fuel, oxygen);
        const controls = calcControlEffectiveness(selectedControls);
        const consequence = calcConsequenceAmplifier(occupancyClass, occupantCount, areaSqM, businessCritical);
        const rawFTRI = triangle.triangleScore * (1 - controls.totalEffectiveness) * consequence;
        const scaledFTRI = Math.min(Math.round((rawFTRI / 30) * 100), 100);
        return { score: scaledFTRI, category: getFTRICategory(scaledFTRI), triangle, controls, consequence, heat, fuel, oxygen };
    }

    function getFTRICategory(score) {
        if (score >= 80) return { label: 'CRITICAL', color: '#7f1d1d', bg: '#fecaca', border: '#f87171', icon: '🔴', action: 'IMMEDIATE action required. Cease operations until mitigated.' };
        if (score >= 60) return { label: 'HIGH',     color: '#9a3412', bg: '#fed7aa', border: '#fb923c', icon: '🟠', action: 'Urgent mitigation required within 24-48 hours.' };
        if (score >= 30) return { label: 'MEDIUM',   color: '#854d0e', bg: '#fef08a', border: '#facc15', icon: '🟡', action: 'Plan corrective actions within 30 days.' };
        return                  { label: 'LOW',      color: '#166534', bg: '#bbf7d0', border: '#4ade80', icon: '🟢', action: 'Maintain current controls. Review annually.' };
    }

    function runAssessment(zone) {
        const heat = zone.ignitionSources.length > 0
            ? Math.max(...zone.ignitionSources.map(k => (IGNITION_SOURCES[k] || {}).rating || 1)) : 1;

        // Fuel leg: take the higher of the registry selection OR the chemical inventory
        // (NFPA 30 volume amplification can raise this above the registry value)
        let fuel = zone.fuelSources.length > 0
            ? Math.max(...zone.fuelSources.map(k => (FUEL_SOURCES[k] || {}).rating || 1)) : 1;
        const chemResult = calcChemicalFuelRating(zone.chemicals || [], zone.hasSprinklers || false);
        if (chemResult.hasChemicals && chemResult.rating > fuel) fuel = chemResult.rating;

        const oxygen = zone.oxygenConditions.length > 0
            ? Math.max(...zone.oxygenConditions.map(k => (OXYGEN_CONDITIONS[k] || {}).rating || 1)) : 1;
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
    // ZONE SCHEMA
    // ═══════════════════════════════════════════════════════════════

    function createBlankZone(name, idx) {
        return {
            name: name || 'Zone ' + ((idx || 0) + 1),
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
            chemicals: [],        // NFPA 30 chemical inventory — each entry: { id, name, nfpa704F/H/R, flashpointC, boilingPointC, nfpa30Class, volumeValue, volumeUnit, volumeLiters, physicalState, notes }
            hasSprinklers: false, // affects NFPA 30 MAQ limits (non-spr. vs sprinklered thresholds)
            photos: [],
            mapRect: null,
            notes: '',
            description: '',
            aiApplied: false,
            aiItems: {},     // tracks which items were set by AI: { 'ignition:key': true, ... }
            nudgeAnswers: {},
            result: null
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════

    function esc(text) {
        if (text === null || text === undefined) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function ratingColor(r) {
        if (r >= 8) return '#dc2626';
        if (r >= 6) return '#ea580c';
        if (r >= 4) return '#eab308';
        if (r >= 2) return '#16a34a';
        return '#94a3b8';
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════
    window.FRA.data = {
        OCCUPANCY_CLASSES,
        IGNITION_SOURCES,
        FUEL_SOURCES,
        OXYGEN_CONDITIONS,
        NFPA30_LIQUID_CLASSES,
        NFPA704F_TO_FTRI,
        VOLUME_UNIT_CONVERSIONS,
        CONTROL_CATEGORIES,
        calcFireTriangle,
        calcControlEffectiveness,
        calcConsequenceAmplifier,
        calculateFTRI,
        getFTRICategory,
        runAssessment,
        createBlankZone,
        getNFPA30Class,
        convertVolumeToLiters,
        calcVolumeAmplifier,
        calcChemicalFuelRating,
        esc,
        ratingColor
    };

})();
