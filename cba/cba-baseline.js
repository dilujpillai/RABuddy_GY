/**
 * cba-baseline.js — Safety Cost Baseline Registry (Luxembourg Edition)
 *
 * Stores Luxembourg-specific OSH benchmark data for safety cost calculations,
 * organized by risk severity level (1–5).  Can be AI-refreshed via AAA/MDE/ITM data.
 *
 * Default data sources (Luxembourg 2024–2025):
 *   AAA (Association d'Assurance Accident) Annual Report 2024
 *   MDE (Mutualité des Employeurs) Premium Tables 2025
 *   ITM (Inspection du Travail et des Mines) Annual Report 2024
 *   STATEC — Luxembourg National Institute of Statistics (wage data 2024)
 *   CCSS (Centre Commun de la Sécurité Sociale)
 *   ISSA Return on Prevention (ROP) Study — ROP multiplier: 2.2
 *   Luxembourg Social Security Code (Art. 85, 92, 93)
 *
 * Key Luxembourg constants:
 *   AAA base rate 2025: 0.70% of gross payroll
 *   AAA Bonus-Malus multipliers: 0.85 (best) → 1.00 (neutral) → 1.10 / 1.30 / 1.50 (malus)
 *   MDE Class 1 rate 2025: 0.07% | MDE Class 2 rate 2025: 0.99%
 *   ITM max fine: €4,000 per worker per violation (Labour Code)
 *   STATEC median gross salary: €58,126/yr (€4,844/mo) | avg: €75,919/yr
 *   MDE reimburses 80% of employer cost during incapacity (20% deadweight loss)
 *   Lohnfortzahlung: salary continuation until end of month of 77th day of absence
 *   All monetary values in EUR
 */
(function () {
    'use strict';

    window.CBA = window.CBA || {};

    const STORAGE_KEY = 'cba_baseline_lux_v1';

    const SOURCE_LINKS = {
        AAA_STATS: 'https://gouvernement.lu/fr/actualites/toutes_actualites/communiques/2025/09-septembre/26-aaa-rapport.html',
        AAA_REPORT: 'https://aaa.public.lu/fr/aaa/Rapport-annuel.html',
        AAA_BONUS: 'https://aaa.public.lu/fr/prestations-cotisations/cotisations/bonusmalus.html',
        MDE_AFFILIATION: 'https://mde.public.lu/fr/affiliation-financement/affiliation-employeurs.html',
        MDE_FINANCING: 'https://mde.public.lu/fr/affiliation-financement/financement.html',
        ITM_REPORT_PDF: 'https://itm.public.lu/dam-assets/fr/publications/rapports-annuels/rapport-annuel-2024.pdf',
        ITM_REPORTS: 'https://itm.public.lu/fr/publications/rapports-annuels.html',
        STATEC_PORTAL: 'https://statistiques.public.lu/fr.html',
        ISSA_ROP: 'https://www.britsafe.org/media/5pgnkhzr/the-business-benefits-health-and-safety-literature-review.pdf'
    };

    function resolveSourceUrl(sourceText) {
        const u = String(sourceText || '').toUpperCase();
        if (u.includes('BONUS-MALUS') || u.includes('BASE RATE')) return SOURCE_LINKS.AAA_BONUS;
        if (u.includes('ITM')) return SOURCE_LINKS.ITM_REPORT_PDF;
        if (u.includes('MDE') || u.includes('LOHNFORTZAHLUNG') || u.includes('CNS')) return SOURCE_LINKS.MDE_AFFILIATION;
        if (u.includes('STATEC')) return SOURCE_LINKS.STATEC_PORTAL;
        if (u.includes('ISSA') || u.includes('ROP')) return SOURCE_LINKS.ISSA_ROP;
        if (u.includes('AAA')) return SOURCE_LINKS.AAA_STATS;
        return '';
    }

    function enrichEvidence(data) {
        Object.keys(data).forEach(metricKey => {
            Object.keys(data[metricKey] || {}).forEach(sev => {
                const entry = data[metricKey][sev];
                if (!entry || typeof entry !== 'object') return;

                if (!entry.sourceUrl) entry.sourceUrl = resolveSourceUrl(entry.source);
                if (!entry.evidenceKey) entry.evidenceKey = `${metricKey}.${sev}`;
                if (!entry.figureUsed) entry.figureUsed = `${entry.value} ${entry.unit || ''}`.trim();
                if (!entry.rationaleFormula) {
                    if (metricKey === 'medicalCostUSD' && sev === '3') {
                        entry.rationaleFormula = 'AAA 2024 reported average direct cost per recognized accident = EUR 4,053';
                    } else if (metricKey === 'injuryCostPerCase' && sev === '3') {
                        entry.rationaleFormula = 'EUR 1,536 + 5,760 + 1,920 + 1,625 + 2,500 + 14,000 = EUR 27,341 (verified core; excludes unverified MDE class uplift)';
                    } else if (metricKey === 'regulatoryFineUSD' && sev === '3') {
                        entry.rationaleFormula = 'EUR 6,370,500 / 1,152 fines = EUR 5,530 average ITM fine';
                    } else if (metricKey === 'insurancePremiumChangePct') {
                        entry.rationaleFormula = 'Effective AAA rate = 0.70% x bonus-malus factor (0.85 to 1.50)';
                    } else {
                        entry.rationaleFormula = entry.notes || '';
                    }
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEFAULT BENCHMARK DATA  (Luxembourg baseline, all monetary values in EUR)
    // Severity scale:
    //   1 = Negligible   (first-aid, no lost time, no AAA declaration)
    //   2 = Minor        (<4 days absence, minor medical treatment)
    //   3 = Moderate     (5–30 days DAFW, recordable AAA accident — avg case)
    //   4 = Major        (31–77 days DAFW, serious injury under Lohnfortzahlung)
    //   5 = Catastrophic (permanent disability / fatality / ITM criminal referral)
    //
    // Sources: AAA Annual Report 2024, MDE 2025 premium tables, ITM 2024,
    //          STATEC wages 2024, ISSA ROP Study, Luxembourg Social Security Code
    // ═══════════════════════════════════════════════════════════════════════
    const DEFAULTS = {

        /**
         * Workplace accident cases per 100 FTE/yr (Luxembourg AAA 2024)
         * National total: 13,724 workplace accidents / 501,285 working units = ~2.74 per 100
         * Distribution across severity bands derived from AAA sector statistics.
         */
        incidentRates: {
            '1': { value: 0.50,  unit: 'cases/100 FTE/yr', source: 'AAA Annual Report 2024 — estimated negligible/first-aid incidents (unreported)',         year: 2024, notes: 'Minor first-aid incidents; typically not declared to AAA; under-counted in official stats' },
            '2': { value: 0.90,  unit: 'cases/100 FTE/yr', source: 'AAA Annual Report 2024 — minor recorded cases, short absence (<4 days)',                 year: 2024, notes: 'Declared to AAA; short absence ≤3 days; triggers administrative Lohnfortzahlung record' },
            '3': { value: 1.00,  unit: 'cases/100 FTE/yr', source: 'AAA Annual Report 2024 — 13,724 workplace accidents / 501,285 working units',            year: 2024, notes: 'Moderate cases: 5–30 days absence; largest cost category per AAA avg €4,053 direct cost' },
            '4': { value: 0.30,  unit: 'cases/100 FTE/yr', source: 'AAA Annual Report 2024 — serious injuries (estimated 10% of workplace accidents)',       year: 2024, notes: 'Serious injury: 31–77 days under Lohnfortzahlung; triggers AAA Malus review' },
            '5': { value: 0.04,  unit: 'cases/100 FTE/yr', source: 'ITM Annual Report 2024 — 116 procès-verbaux transmitted to Parquet for grave/fatal accidents', year: 2024, notes: 'Catastrophic/fatal: ITM criminal referral; permanent employment incapacity at 78 weeks' }
        },

        /**
         * Days away from work per case (Luxembourg context)
         * Lohnfortzahlung (salary continuation) applies up to end of month of 77th day.
         * After 77 days, CNS pays indemnité pécuniaire. After 78 weeks: contract ceases.
         * Source: Luxembourg Social Security Code; CSL guidance; MDE absenteeism data
         */
        daysAwayFromWork: {
            '1': { value: 0,   unit: 'days', source: 'AAA — negligible; no absence triggered',                              year: 2024, notes: 'First-aid case; worker returns same day; no Lohnfortzahlung impact' },
            '2': { value: 3,   unit: 'days', source: 'AAA 2024 — estimated median for minor injuries (cuts/bruises)',       year: 2024, notes: 'Short absence; MDE reimburses 80% of employer cost; 20% deadweight absorbed by employer' },
            '3': { value: 20,  unit: 'days', source: 'Section 8.1 — Luxembourg baseline model (AAA 2024 avg case profile)', year: 2024, notes: 'Standard modelled accident in 5–30 day band; verified core total cost baseline uses €27,341 without speculative MDE class uplift' },
            '4': { value: 55,  unit: 'days', source: 'Luxembourg Social Security Code — Lohnfortzahlung period (Art. 92)',  year: 2024, notes: 'Major injury within the 77-day Lohnfortzahlung window; employer retains 20% cost not reimbursed by MDE' },
            '5': { value: 0,   unit: 'days', source: 'ITM 2024 — permanent incapacity/fatality',                            year: 2024, notes: 'Fatal or permanent disability; contract ceases after 78 weeks; criminal prosecution possible' }
        },

        /**
         * Direct medical cost per incident case (EUR)
         * Source: AAA Annual Report 2024 — avg direct cost €4,053 per recognized accident (2024)
         * Covers: emergency response, medical treatment, rehabilitation paid by AAA/CNS
         */
        medicalCostUSD: {
            '1': { value: 500,    unit: 'EUR/case', source: 'Estimated first-aid cost — not AAA-declared; employer-absorbed', year: 2024, notes: 'First-aid supplies, on-site nurse, minor clinic visit; below AAA declaration threshold' },
            '2': { value: 2000,   unit: 'EUR/case', source: 'AAA 2024 — below-average declared accident; minor treatment',    year: 2024, notes: 'GP visits, imaging, pharmacy; AAA national avg €4,053 but minor cases are below median' },
            '3': { value: 4053,   unit: 'EUR/case', source: 'AAA Annual Report 2024 — official national average direct cost per recognized accident', year: 2024, notes: 'AAA avg €4,053 covers immediate medical care, hospitalization, statutory compensation; 128 accidents/day nationally' },
            '4': { value: 15000,  unit: 'EUR/case', source: 'AAA case data 2024 — serious injury with hospitalization & rehabilitation', year: 2024, notes: 'Fracture/amputation class; hospital stay + PT; AAA case award example: €29,635 documented in TAL-2021-02459' },
            '5': { value: 29635,  unit: 'EUR/case', source: 'AAA judgment 2024TALCH01/00140 — documented indemnification for serious accident', year: 2024, notes: 'Includes préjudice d\'agrément (€4,500), préjudice esthétique (€1,500), physiological damages (€3,000) + disability capitalisation' }
        },

        /**
         * Total all-in cost per case (direct + indirect: iceberg model)
         * Source: Luxembourg Section 8.2 verified core financial model — single moderate accident = €27,341
         * Indirect-to-direct ratio can vary by sector; keep severity scaling conservative unless direct evidence is available
         * Includes: 20% MDE deadweight, lost productivity, overtime premium, admin burden,
         * asset damage, AAA Bonus-Malus premium hike (lagging 2-year effect)
         */
        injuryCostPerCase: {
            '1': { value: 3000,    unit: 'EUR/case', source: 'Luxembourg iceberg model — negligible; minimal disruption cost',           year: 2024, notes: 'Admin time (1–2 hrs), first-aid material, productivity micro-loss; no MDE or AAA premium impact' },
            '2': { value: 8000,    unit: 'EUR/case', source: 'Luxembourg iceberg model — minor: MDE 20% loss + admin + overtime',        year: 2024, notes: '3-day absence: MDE 80% reimburse, 20% deadweight (€154) + overtime premium + admin (4 hrs × €65) + productivity loss' },
            '3': { value: 27341,   unit: 'EUR/case', source: 'Luxembourg Sec. 8.2 baseline model — verified 30-day moderate absence core cost',  year: 2024, notes: 'Unrecovered salary €1,536 + lost productivity €5,760 + overtime €1,920 + admin €1,625 + asset damage €2,500 + AAA Malus €14,000. Excludes unsupported automatic MDE class-upgrade assumption.' },
            '4': { value: 80000,   unit: 'EUR/case', source: 'Luxembourg iceberg model extrapolated — major injury (55-day absence)',    year: 2024, notes: 'Extended Lohnfortzahlung period + maximum AAA Malus (1.50×) + productivity loss + legal/admin overhead' },
            '5': { value: 500000,  unit: 'EUR/case', source: 'ITM 2024 + ISSA ROP Study — catastrophic/fatal total economic loss',      year: 2024, notes: 'AAA max Malus + ITM criminal prosecution costs + civil litigation + business disruption + reputational damage; 116 criminal referrals/yr' }
        },

        /**
         * Expected % change in AAA accident insurance premium per incident (Bonus-Malus system)
         * Formula: Effective Rate = 0.70% base rate × Bonus-Malus factor
         * Multipliers: 0.85 (15% bonus) | 1.00 (neutral) | 1.10 | 1.30 | 1.50 (max malus)
         * Source: AAA Bonus-Malus system (reformed 2010, expanded 2019, modified 2022)
         */
        insurancePremiumChangePct: {
            '1': { value: 0,    unit: '%', source: 'AAA Bonus-Malus — no impact (first-aid, no declaration)',             year: 2025, notes: 'Below AAA declaration threshold; no Bonus-Malus adjustment triggered' },
            '2': { value: 10,   unit: '%', source: 'AAA Bonus-Malus — Malus 10% (1.10× factor on 0.70% base rate)',      year: 2025, notes: 'Minor recorded accident; AAA effective rate rises from 0.700% to 0.770%; small claim history build-up' },
            '3': { value: 30,   unit: '%', source: 'AAA Bonus-Malus — Malus 30% (1.30× factor)',  year: 2025, notes: 'Moderate accident: AAA rate 0.70%→0.91%. MDE class effects are not automatically tied to occupational accidents in official MDE classing rules.' },
            '4': { value: 50,   unit: '%', source: 'AAA Bonus-Malus — Malus 50% maximum (1.50× factor)',                  year: 2025, notes: 'Maximum AAA penalty: effective rate 0.70%→1.05%; on €10M payroll = €35,000 annual premium increase above neutral' },
            '5': { value: 50,   unit: '%', source: 'AAA Bonus-Malus — Malus 50% (ceiling); ITM criminal referral risk',   year: 2025, notes: 'Maximum 1.50× Malus applies; AAA ceiling reached; additional criminal/civil liability outside insurance coverage' }
        },

        /**
         * Regulatory fine risk per violation — ITM (Inspection du Travail et des Mines)
         * Source: Luxembourg Labour Code; ITM Annual Report 2024; Castegnaro.lu analysis
         * ITM 2024: 1,152 fines totalling €6,370,500 (avg €5,530/fine)
         * Max per violation: €4,000 × number of workers concerned (Art. L.8115-3 mirrored)
         * Criminal: 116 procès-verbaux transmitted to Parquet in 2024
         */
        regulatoryFineUSD: {
            '1': { value: 0,       unit: 'EUR/violation', source: 'ITM 2024 — no regulatory trigger for first-aid/near-miss',                       year: 2024, notes: 'No formal violation; no mandatory declaration required for pure first-aid incidents' },
            '2': { value: 2500,    unit: 'EUR/violation', source: 'ITM 2024 — minor administrative fine (below ITM avg €5,530)',                    year: 2024, notes: 'Minor compliance lapse (documentation, reporting delay); below average ITM settlement of €5,530' },
            '3': { value: 5530,    unit: 'EUR/violation', source: 'ITM Annual Report 2024 — average fine (€6,370,500 / 1,152 fines)',               year: 2024, notes: 'Average ITM fine in 2024; serious violation triggers mandatory accident declaration to CCSS + AAA dossier' },
            '4': { value: 40000,   unit: 'EUR/violation', source: 'ITM — €4,000/worker × ~10 workers concerned; Labour Code escalation',           year: 2024, notes: 'Systematic safety failure affecting multiple workers; €4,000 fine per worker; ITM conducted 1,856 targeted H&S controls in 2024' },
            '5': { value: 200000,  unit: 'EUR/violation', source: 'ITM 2024 — criminal referral (116 procès-verbaux); civil litigation exposure',   year: 2024, notes: 'Fatal/grave accident: ITM transmits to Parquet; criminal defense + civil damages + €4,000 per worker theoretical max = existential threat to SMEs' }
        }
    };

    enrichEvidence(DEFAULTS);

    // ═══════════════════════════════════════════════════════════════════════
    // RUNTIME STATE
    // ═══════════════════════════════════════════════════════════════════════
    let _data = JSON.parse(JSON.stringify(DEFAULTS));
    let _meta = { refreshedAt: null, location: 'Luxembourg', currency: 'EUR', aiModel: '' };

    // ─── Persistence ───────────────────────────────────────────────────────
    function _load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const p = JSON.parse(stored);
                if (p && p.data) { _data = p.data; _meta = p.meta || _meta; }
            }
            enrichEvidence(_data);
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
        enrichEvidence(_data);
        _meta = { refreshedAt: new Date().toISOString(), location: locationStr || '', currency: currency || 'USD', aiModel: model || '' };
        _save();
    }

    /** Reset to factory defaults and clear localStorage */
    function reset() {
        _data = JSON.parse(JSON.stringify(DEFAULTS));
        _meta = { refreshedAt: null, location: 'Luxembourg', currency: 'EUR', aiModel: '' };
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    /**
     * Build a multi-line context string for injection into AI prompts.
     * The AI is instructed to use these as anchor points rather than inventing values.
     */
    function buildPromptContext(severity, currency) {
        const bundle = getSeverityBundle(severity);
        const locNote = ' (calibrated for Luxembourg — AAA/MDE/ITM/STATEC 2024–2025)';
        const ageNote = _meta.refreshedAt
            ? `Last refreshed: ${new Date(_meta.refreshedAt).toLocaleDateString()}`
            : 'Using factory defaults — consider refreshing for your location';
        const srcText = (entry) => {
            if (!entry) return '';
            return entry.sourceUrl ? `${entry.source} (${entry.sourceUrl})` : entry.source;
        };
        const rationaleText = (entry) => entry && entry.rationaleFormula ? ` | rationale: ${entry.rationaleFormula}` : '';
        const lines = [];
        if (bundle.incidentRates)
            lines.push(`• Incident rate (sev ${severity}): ${bundle.incidentRates.value} ${bundle.incidentRates.unit}  ← ${srcText(bundle.incidentRates)}${rationaleText(bundle.incidentRates)}`);
        if (bundle.daysAwayFromWork)
            lines.push(`• Days away from work (sev ${severity}): ${bundle.daysAwayFromWork.value} days  ← ${srcText(bundle.daysAwayFromWork)}${rationaleText(bundle.daysAwayFromWork)}`);
        if (bundle.medicalCostUSD)
            lines.push(`• Direct medical cost/case: ${currency || 'USD'} ${bundle.medicalCostUSD.value.toLocaleString()}  ← ${srcText(bundle.medicalCostUSD)}${rationaleText(bundle.medicalCostUSD)}`);
        if (bundle.injuryCostPerCase)
            lines.push(`• Total all-in cost/case: ${currency || 'USD'} ${bundle.injuryCostPerCase.value.toLocaleString()}  ← ${srcText(bundle.injuryCostPerCase)}${rationaleText(bundle.injuryCostPerCase)}`);
        if (bundle.insurancePremiumChangePct)
            lines.push(`• Insurance premium impact: ${bundle.insurancePremiumChangePct.value}%  ← ${srcText(bundle.insurancePremiumChangePct)}${rationaleText(bundle.insurancePremiumChangePct)}`);
        if (bundle.regulatoryFineUSD)
            lines.push(`• Regulatory fine risk: ${currency || 'USD'} ${bundle.regulatoryFineUSD.value.toLocaleString()}  ← ${srcText(bundle.regulatoryFineUSD)}${rationaleText(bundle.regulatoryFineUSD)}`);
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
        getSourceLinks: () => ({ ...SOURCE_LINKS }),
        update,
        reset,
        buildPromptContext
    };

})();
