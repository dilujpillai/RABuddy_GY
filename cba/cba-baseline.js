/**
 * cba-baseline.js — Safety Cost Baseline Registry
 *
 * Stores OSHA / BLS / NSC / HSE benchmark data for safety cost calculations,
 * organized by risk severity level (1–5).  Can be AI-refreshed for any location.
 *
 * Default data sources (US 2022-2023):
 *   OSHA Illness & Injury Summary 2022
 *   BLS Survey of Occupational Injuries (SOII) / Days Away from Work 2022
 *   NSC Injury Facts 2023
 *   Liberty Mutual Workplace Safety Index 2023
 *   OSHA Penalty Table 2024
 */
(function () {
    'use strict';

    window.CBA = window.CBA || {};

    const STORAGE_KEY = 'cba_baseline_v2';

    // ═══════════════════════════════════════════════════════════════════════
    // DEFAULT BENCHMARK DATA  (US baseline, all monetary values in USD)
    // Severity scale:
    //   1 = Negligible   (first-aid, no lost time)
    //   2 = Minor        (restricted work/medical treatment, <4 days away)
    //   3 = Moderate     (recordable DAFW, 5–14 days, e.g. strain/laceration)
    //   4 = Major        (serious injury, fracture/amputation, 15–60 days)
    //   5 = Catastrophic (permanent disability / fatality)
    // ═══════════════════════════════════════════════════════════════════════
    const DEFAULTS = {

        /**
         * Lost-workday cases per 100 FTE/yr for the *exposed task group*
         * Source: OSHA DART/DAFW rate by industry, 2022 manufacturing median
         * Severity 5 is the fatality rate per 100 FTE (rare, ~0.03-0.05)
         */
        incidentRates: {
            '1': { value: 0.30,  unit: 'cases/100 FTE/yr', source: 'OSHA TRIR minor (no DAFW) — mfg 2022',     year: 2022, notes: 'First-aid only; doesn\'t trigger OSHA 300 log entry' },
            '2': { value: 0.70,  unit: 'cases/100 FTE/yr', source: 'OSHA restricted-work case rate — mfg 2022', year: 2022, notes: 'Medical treatment, restricted duty; no significant lost time' },
            '3': { value: 1.10,  unit: 'cases/100 FTE/yr', source: 'OSHA DART rate — mfg 2022',                 year: 2022, notes: 'Recordable with days away from work; strains/sprains typical' },
            '4': { value: 3.00,  unit: 'cases/100 FTE/yr', source: 'OSHA lost-workday case rate — sev 4 mfg',   year: 2022, notes: 'Serious injuries (fractures, amputations, dislocations)' },
            '5': { value: 0.04,  unit: 'cases/100 FTE/yr', source: 'OSHA fatal injury rate — US mfg 2022',      year: 2022, notes: 'BLS Census of Fatal Occupational Injuries (CFOI)' }
        },

        /**
         * Median days away from work per case
         * Source: BLS SOII 2022 — days-away-from-work cases by nature of injury
         */
        daysAwayFromWork: {
            '1': { value: 0,   unit: 'days', source: 'BLS — no lost time, first-aid',    year: 2022, notes: 'No time away required; first-aid case only' },
            '2': { value: 3,   unit: 'days', source: 'BLS DAFW median — cuts/bruises',   year: 2022, notes: 'Minor lacerations, contusions: BLS median 3 days' },
            '3': { value: 8,   unit: 'days', source: 'BLS DAFW median — all injuries',   year: 2022, notes: 'Overall median for all DAFW cases per BLS 2022' },
            '4': { value: 30,  unit: 'days', source: 'BLS DAFW median — fractures',      year: 2022, notes: 'BLS median for fractures 28 days; amputations 31 days' },
            '5': { value: 0,   unit: 'days', source: 'Fatality — permanent',             year: 2022, notes: 'Fatality: no recovery; economic loss calculated separately' }
        },

        /**
         * Direct medical cost per incident case (USD)
         * Source: NSC Injury Facts 2023, Liberty Mutual WSI 2023
         */
        medicalCostUSD: {
            '1': { value: 1200,    unit: 'USD/case', source: 'NSC Injury Facts 2023 — minor',        year: 2023, notes: 'ER visit or clinic; no imaging; ~$1,000–$1,500 avg' },
            '2': { value: 8000,    unit: 'USD/case', source: 'NSC Injury Facts 2023 — moderate',     year: 2023, notes: 'Imaging, specialist visits, PT; ~$5,000–$12,000' },
            '3': { value: 27000,   unit: 'USD/case', source: 'NSC Injury Facts 2023 — serious',      year: 2023, notes: 'Surgery / hospital stay; strains avg ~$20,000–$35,000' },
            '4': { value: 56000,   unit: 'USD/case', source: 'Liberty Mutual WSI 2023 — major',      year: 2023, notes: 'Fractures/amputations — avg direct medical $40k–$80k' },
            '5': { value: 1150000, unit: 'USD/case', source: 'OSHA avg cost fatal accident 2023',    year: 2023, notes: 'Full economic/social cost per OSHA Value of Statistical Life' }
        },

        /**
         * Total all-in cost per case (direct + indirect: lost productivity, admin, hiring)
         * Indirect typically = 2–4× direct medical cost
         * Source: NSC Injury Facts 2023 total cost model; Liberty Mutual
         */
        injuryCostPerCase: {
            '1': { value: 7500,    unit: 'USD/case', source: 'NSC total cost (direct+indirect) — minor',    year: 2023, notes: 'Indirect multiplier ~5× direct for minor cases' },
            '2': { value: 38000,   unit: 'USD/case', source: 'NSC total cost — moderate injury',            year: 2023, notes: 'Includes admin, investigation, temp labour (~3× direct)' },
            '3': { value: 54000,   unit: 'USD/case', source: 'Liberty Mutual — strain/DAFW total',         year: 2023, notes: '#1 cause of WC claims; $54k per case 2023' },
            '4': { value: 90000,   unit: 'USD/case', source: 'Liberty Mutual — serious lost-workday 2023', year: 2023, notes: 'Fractures: $77k; caught-in: $115k; avg serious ~$90k' },
            '5': { value: 1600000, unit: 'USD/case', source: 'OSHA total cost fatal accident (VSL adj)',    year: 2023, notes: 'Includes economic loss, regulatory fines, legal costs' }
        },

        /**
         * Expected % change in Workers Comp / employer liability premium for one incident
         * Source: NCCI EMR study; industry surveys
         */
        insurancePremiumChangePct: {
            '1': { value: 0.5,  unit: '%', source: 'NCCI EMR impact — first-aid / near-miss',      year: 2022, notes: 'Near-zero impact; no recordable entry' },
            '2': { value: 3,    unit: '%', source: 'NCCI — one restricted-work recordable case',   year: 2022, notes: 'Single minor recordable raises EMR ~0.02–0.05' },
            '3': { value: 10,   unit: '%', source: 'NCCI — one DAFW recordable case',              year: 2022, notes: 'One serious DAFW can raise EMR 0.05–0.15; ~10% premium swing' },
            '4': { value: 20,   unit: '%', source: 'NCCI / insurer — serious injury case',         year: 2022, notes: 'Major injury can shift EMR >0.20; premium +15–30%' },
            '5': { value: 35,   unit: '%', source: 'NCCI — fatal/catastrophic incident',           year: 2022, notes: 'Fatality sharply raises EMR; premium can double for small firms' }
        },

        /**
         * Typical regulatory fine risk per violation (USD)
         * Source: OSHA 2024 penalty table; EU-equivalent approximations
         */
        regulatoryFineUSD: {
            '1': { value: 500,    unit: 'USD/violation', source: 'OSHA other-than-serious penalty — 2024',  year: 2024, notes: 'Paperwork / non-serious; max $16,131 but avg settlements much lower' },
            '2': { value: 7500,   unit: 'USD/violation', source: 'OSHA serious violation — avg settlement', year: 2024, notes: 'Serious: max $16,131 per item; avg with mitigation ~$5k–$10k' },
            '3': { value: 16131,  unit: 'USD/violation', source: 'OSHA serious citation max 2024',          year: 2024, notes: 'Per-item max; multiple items possible in one inspection' },
            '4': { value: 161323, unit: 'USD/violation', source: 'OSHA willful/repeat max per item 2024',   year: 2024, notes: 'Willful/repeat: max $161,323 per violation; multi-item penalties common' },
            '5': { value: 161323, unit: 'USD/violation', source: 'OSHA max penalty + potential criminal',   year: 2024, notes: 'Fatality: OSHA max + possible criminal referral + civil litigation' }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RUNTIME STATE
    // ═══════════════════════════════════════════════════════════════════════
    let _data = JSON.parse(JSON.stringify(DEFAULTS));
    let _meta = { refreshedAt: null, location: '', currency: 'USD', aiModel: '' };

    // ─── Persistence ───────────────────────────────────────────────────────
    function _load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const p = JSON.parse(stored);
                if (p && p.data) { _data = p.data; _meta = p.meta || _meta; }
            }
        } catch (e) { /* ignore */ }
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: _data, meta: _meta }));
        } catch (e) { /* ignore */ }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Returns true if cached data is absent, >30 days old, or from a different location.
     */
    function isStale(locationStr) {
        if (!_meta.refreshedAt) return true;
        if (locationStr && _meta.location !== locationStr) return true;
        const ageMs = Date.now() - new Date(_meta.refreshedAt).getTime();
        return ageMs > 30 * 24 * 60 * 60 * 1000;
    }

    /** Get one metric entry for a specific severity level */
    function get(key, severity) {
        const sv = String(severity || 3);
        return (_data[key] && _data[key][sv])
            ? _data[key][sv]
            : (DEFAULTS[key] && DEFAULTS[key][sv]) ? DEFAULTS[key][sv] : null;
    }

    /** Get all metrics for one severity level (convenience bundle) */
    function getSeverityBundle(severity) {
        const result = {};
        Object.keys(_data).forEach(k => { result[k] = get(k, severity); });
        return result;
    }

    /** Full dataset (all severities, all metrics) */
    function getAll() { return _data; }

    /** Metadata about last refresh */
    function getMeta() { return { ..._meta }; }

    /** Factory defaults for comparison display */
    function getDefaults() { return DEFAULTS; }

    /**
     * Merge AI-refreshed data into the registry and persist.
     * newData shape mirrors DEFAULTS (keyed by metric → severity-string → {value,source,...})
     */
    function update(newData, locationStr, currency, model) {
        Object.keys(newData).forEach(key => {
            if (typeof newData[key] === 'object' && newData[key] !== null) {
                if (!_data[key]) _data[key] = {};
                Object.keys(newData[key]).forEach(sv => {
                    if (newData[key][sv] && typeof newData[key][sv].value !== 'undefined') {
                        _data[key][sv] = Object.assign({}, DEFAULTS[key] ? DEFAULTS[key][sv] || {} : {}, newData[key][sv]);
                    }
                });
            }
        });
        _meta = { refreshedAt: new Date().toISOString(), location: locationStr || '', currency: currency || 'USD', aiModel: model || '' };
        _save();
    }

    /** Reset to factory defaults and clear localStorage */
    function reset() {
        _data = JSON.parse(JSON.stringify(DEFAULTS));
        _meta = { refreshedAt: null, location: '', currency: 'USD', aiModel: '' };
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    /**
     * Build a multi-line context string for injection into AI prompts.
     * The AI is instructed to use these as anchor points rather than inventing values.
     */
    function buildPromptContext(severity, currency) {
        const bundle = getSeverityBundle(severity);
        const locNote = _meta.location ? ` (calibrated for ${_meta.location})` : ' (US default benchmarks)';
        const ageNote = _meta.refreshedAt
            ? `Last refreshed: ${new Date(_meta.refreshedAt).toLocaleDateString()}`
            : 'Using factory defaults — consider refreshing for your location';
        const lines = [];
        if (bundle.incidentRates)
            lines.push(`• Incident rate (sev ${severity}): ${bundle.incidentRates.value} ${bundle.incidentRates.unit}  ← ${bundle.incidentRates.source}`);
        if (bundle.daysAwayFromWork)
            lines.push(`• Days away from work (sev ${severity}): ${bundle.daysAwayFromWork.value} days  ← ${bundle.daysAwayFromWork.source}`);
        if (bundle.medicalCostUSD)
            lines.push(`• Direct medical cost/case: ${currency || 'USD'} ${bundle.medicalCostUSD.value.toLocaleString()}  ← ${bundle.medicalCostUSD.source}`);
        if (bundle.injuryCostPerCase)
            lines.push(`• Total all-in cost/case: ${currency || 'USD'} ${bundle.injuryCostPerCase.value.toLocaleString()}  ← ${bundle.injuryCostPerCase.source}`);
        if (bundle.insurancePremiumChangePct)
            lines.push(`• Insurance premium impact: ${bundle.insurancePremiumChangePct.value}%  ← ${bundle.insurancePremiumChangePct.source}`);
        if (bundle.regulatoryFineUSD)
            lines.push(`• Regulatory fine risk: ${currency || 'USD'} ${bundle.regulatoryFineUSD.value.toLocaleString()}  ← ${bundle.regulatoryFineUSD.source}`);
        return `\nRESEARCHED SAFETY COST BASELINES${locNote} [${ageNote}]:\n${lines.join('\n')}\n→ USE THESE AS ANCHOR POINTS. Adjust for local currency (${currency || 'USD'}) and specific hazard context.`;
    }

    // ─── Init ──────────────────────────────────────────────────────────────
    _load();

    window.CBA.baseline = {
        isStale,
        get,
        getSeverityBundle,
        getAll,
        getMeta,
        getDefaults,
        update,
        reset,
        buildPromptContext
    };

})();
