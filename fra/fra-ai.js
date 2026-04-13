/**
 * fra-ai.js — Fire Risk Assessment: AI Analysis, Voice Capture & Nudging
 * 
 * Handles AI-powered zone analysis, speech recognition, and the intelligent
 * nudging system that checks for missing information before calling the AI.
 */
(function () {
    'use strict';

    window.FRA = window.FRA || {};
    const D = () => window.FRA.data;

    const FRA_API = 'https://risk-assessment-api-nine.vercel.app/api/ai';
    const FRA_MODEL = 'openai/gpt-4o-mini';

    // ═══════════════════════════════════════════════════════════════
    // AI API
    // ═══════════════════════════════════════════════════════════════

    async function fraCallAI(prompt) {
        const res = await fetch(FRA_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: FRA_MODEL, prompt })
        });
        if (!res.ok) throw new Error('AI API request failed: ' + (await res.text()));
        const data = await res.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content)
            throw new Error('Empty AI response');
        return data.choices[0].message.content;
    }

    function buildAIPrompt(description) {
        const d = D();
        const allControls = {};
        for (const [catKey, catDef] of Object.entries(d.CONTROL_CATEGORIES)) {
            allControls[catKey] = Object.keys(catDef.items);
        }
        return 'You are a fire safety expert. Analyze this zone/location description and identify fire hazards using ONLY the exact keys from the registries below.\n\n' +
            'DESCRIPTION: "' + description + '"\n\n' +
            'REGISTRIES (use EXACT keys only):\n' +
            'Ignition Sources: ' + JSON.stringify(Object.keys(d.IGNITION_SOURCES)) + '\n' +
            'Fuel Sources: ' + JSON.stringify(Object.keys(d.FUEL_SOURCES)) + '\n' +
            'Oxygen Conditions: ' + JSON.stringify(Object.keys(d.OXYGEN_CONDITIONS)) + '\n' +
            'Occupancy Classes: ' + JSON.stringify(Object.keys(d.OCCUPANCY_CLASSES)) + '\n' +
            'Controls: ' + JSON.stringify(allControls) + '\n\n' +
            'Return ONLY valid JSON (no markdown, no explanation):\n' +
            '{"occupancyClass":"exact key","building":"","floor":"","ignitionSources":["exact key"],"fuelSources":["exact key"],"oxygenConditions":["exact key"],"controls":{"detection":["exact key"],"suppression":["exact key"],"compartmentation":["exact key"],"evacuation":["exact key"],"management":["exact key"]},"notes":"brief observations","occupantCount":0,"areaSqM":0,"businessCritical":false}';
    }

    /**
     * Send description to AI and merge results into zone.
     * Returns the raw AI result and a list of items that were AI-set.
     */
    async function aiAnalyzeZone(description, zone) {
        const d = D();
        const prompt = buildAIPrompt(description);
        const raw = await fraCallAI(prompt);
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in AI response');
        const result = JSON.parse(jsonMatch[0]);

        if (!zone.aiItems) zone.aiItems = {};

        // Merge into zone, track AI-set items
        if (result.occupancyClass && d.OCCUPANCY_CLASSES[result.occupancyClass]) {
            zone.occupancyClass = result.occupancyClass;
            zone.aiItems['occupancyClass'] = true;
        }
        if (result.building) { zone.building = result.building; zone.aiItems['building'] = true; }
        if (result.floor) { zone.floor = result.floor; zone.aiItems['floor'] = true; }
        if (typeof result.occupantCount === 'number' && result.occupantCount > 0) {
            zone.occupantCount = result.occupantCount; zone.aiItems['occupantCount'] = true;
        }
        if (typeof result.areaSqM === 'number' && result.areaSqM > 0) {
            zone.areaSqM = result.areaSqM; zone.aiItems['areaSqM'] = true;
        }
        if (typeof result.businessCritical === 'boolean') {
            zone.businessCritical = result.businessCritical; zone.aiItems['businessCritical'] = true;
        }

        const mergeArr = (existing, incoming, validRegistry, prefix) => {
            (incoming || []).forEach(k => {
                if (validRegistry[k] && !existing.includes(k)) {
                    existing.push(k);
                    zone.aiItems[prefix + ':' + k] = true;
                }
            });
        };
        mergeArr(zone.ignitionSources, result.ignitionSources, d.IGNITION_SOURCES, 'ignition');
        mergeArr(zone.fuelSources, result.fuelSources, d.FUEL_SOURCES, 'fuel');
        mergeArr(zone.oxygenConditions, result.oxygenConditions, d.OXYGEN_CONDITIONS, 'oxygen');

        if (result.controls) {
            for (const catKey of Object.keys(d.CONTROL_CATEGORIES)) {
                if (!zone.selectedControls[catKey]) zone.selectedControls[catKey] = [];
                mergeArr(zone.selectedControls[catKey], result.controls[catKey],
                    d.CONTROL_CATEGORIES[catKey].items, 'control:' + catKey);
            }
        }

        if (result.notes && !zone.notes.includes(result.notes)) {
            zone.notes = zone.notes ? zone.notes + '\n\n[AI] ' + result.notes : '[AI] ' + result.notes;
        }

        zone.aiApplied = true;
        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // NUDGING SYSTEM — check for missing info before AI call
    // ═══════════════════════════════════════════════════════════════

    const NUDGE_CATEGORIES = [
        {
            key: 'occupancy',
            label: 'Building / Area Type',
            question: 'What is this area used for? (e.g., manufacturing, storage, office, assembly hall)',
            keywords: ['office', 'factory', 'warehouse', 'storage', 'assembly', 'manufacturing', 'production',
                'mixing', 'curing', 'lab', 'workshop', 'plant', 'room', 'building', 'dock', 'bay', 'area',
                'kitchen', 'cafeteria', 'utility', 'mechanical', 'electrical']
        },
        {
            key: 'occupants',
            label: 'Number of Occupants',
            question: 'How many people typically work in or occupy this area per shift?',
            keywords: ['people', 'workers', 'occupants', 'employees', 'staff', 'persons', 'operators',
                'shift', 'crew', 'team', 'headcount', '\\d+\\s*(people|workers|operator|person)']
        },
        {
            key: 'area',
            label: 'Area Size',
            question: 'What is the approximate area size? (e.g., 500 sqm, 200 sqft)',
            keywords: ['sqm', 'sqft', 'square', 'meters', 'feet', 'area size', 'm²', 'ft²',
                '\\d+\\s*(sqm|m²|sqft|ft²)']
        },
        {
            key: 'ignition',
            label: 'Ignition / Heat Sources',
            question: 'What potential ignition sources are present? (e.g., welding, electrical panels, hot processes, sparks, engines)',
            keywords: ['weld', 'spark', 'electrical', 'motor', 'heat', 'flame', 'ignit', 'hot work',
                'friction', 'static', 'arcing', 'panel', 'switchgear', 'furnace', 'oven', 'curing',
                'grinding', 'brazing', 'cutting', 'forklift', 'vehicle', 'engine', 'lamp']
        },
        {
            key: 'fuel',
            label: 'Fuel / Combustible Materials',
            question: 'What combustible materials are present? (e.g., rubber, solvents, oil, dust, wood, cardboard, gas)',
            keywords: ['rubber', 'solvent', 'dust', 'oil', 'fuel', 'combustible', 'flammable', 'chemical',
                'gas', 'wood', 'paper', 'paint', 'cardboard', 'tire', 'pallet', 'textile', 'plastic',
                'adhesive', 'lubricant', 'grease', 'resin', 'sulfur', 'carbon black', 'naphtha']
        },
        {
            key: 'ventilation',
            label: 'Ventilation / Atmosphere',
            question: 'What type of ventilation does this area have? (e.g., forced air HVAC, natural, enclosed, dust extraction)',
            keywords: ['ventil', 'air', 'hvac', 'fan', 'enclosed', 'open', 'draft', 'duct', 'extract',
                'oxygen', 'confined', 'outdoor', 'pressurize', 'inert', 'atmosphere']
        },
        {
            key: 'controls',
            label: 'Existing Fire Controls',
            question: 'What fire protection controls are currently in place? (e.g., sprinklers, fire extinguishers, alarms, fire doors, drills)',
            keywords: ['sprinkler', 'extinguish', 'alarm', 'detector', 'fire door', 'suppression', 'hose',
                'hydrant', 'drill', 'trained', 'permit', 'smoke detector', 'exit sign', 'emergency light',
                'fire wall', 'fire rated', 'evacuation', 'muster', 'brigade']
        }
    ];

    /**
     * Check description text and return a list of missing nudge categories.
     */
    function detectMissingInfo(text) {
        if (!text || !text.trim()) return NUDGE_CATEGORIES.slice(); // all missing
        const lower = text.toLowerCase();
        const missing = [];
        for (const cat of NUDGE_CATEGORIES) {
            const found = cat.keywords.some(kw => {
                if (kw.includes('\\')) {
                    try { return new RegExp(kw, 'i').test(text); } catch (e) { return false; }
                }
                return lower.includes(kw.toLowerCase());
            });
            if (!found) missing.push(cat);
        }
        return missing;
    }

    // ═══════════════════════════════════════════════════════════════
    // VOICE CAPTURE (independent SpeechRecognition)
    // ═══════════════════════════════════════════════════════════════

    let fraRecognition = null;
    let fraRecording = false;
    let fraRecordCallback = null;

    function initFRARecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = document.documentElement.lang || 'en-US';
        rec.onresult = (e) => {
            let finalText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalText += e.results[i][0].transcript;
                }
            }
            if (finalText && fraRecordCallback) {
                fraRecordCallback(finalText.trim());
            }
        };
        rec.onerror = () => { stopVoice(); };
        rec.onend = () => { if (fraRecording) { try { rec.start(); } catch (e) { /* ignore */ } } };
        return rec;
    }

    /**
     * Start/stop voice recording. Calls onText(text) each time a final transcript arrives.
     * Returns { recording: boolean } to let the caller update UI.
     */
    function toggleVoice(onText) {
        if (fraRecording) { stopVoice(); return false; }
        if (!fraRecognition) fraRecognition = initFRARecognition();
        if (!fraRecognition) {
            if (typeof window.showCustomAlert === 'function')
                window.showCustomAlert('Speech recognition not supported in this browser.', 'error');
            return false;
        }
        fraRecordCallback = onText;
        fraRecording = true;
        try { fraRecognition.start(); } catch (e) { /* ignore */ }
        return true;
    }

    function stopVoice() {
        fraRecording = false;
        if (fraRecognition) try { fraRecognition.stop(); } catch (e) { /* ignore */ }
        fraRecordCallback = null;
    }

    function isRecording() { return fraRecording; }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════

    window.FRA.ai = {
        fraCallAI,
        buildAIPrompt,
        aiAnalyzeZone,
        detectMissingInfo,
        NUDGE_CATEGORIES,
        toggleVoice,
        stopVoice,
        isRecording
    };

})();
