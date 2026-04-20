/**
 * cba-engine.js — Cost-Benefit Analyzer: ALARP Calculation Engine & Data Model
 *
 * Manages the CBA state, ALARP disproportion factor logic, lifecycle cost/benefit
 * calculations, table row import, and project save/load serialization.
 */
(function () {
    'use strict';

    window.CBA = window.CBA || {};

    // ═══════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════

    const COST_CATEGORIES = [
        { key: 'capital',      label: 'Capital Expenditure',     hint: 'Equipment, engineering, construction',     recurring: false },
        { key: 'installation', label: 'Installation',            hint: 'Implementation & setup costs',             recurring: false },
        { key: 'maintenance',  label: 'Annual Maintenance',      hint: 'Ongoing operating & maintenance costs',    recurring: true  },
        { key: 'training',     label: 'Training',                hint: 'Initial + recurring training costs',       recurring: true  },
        { key: 'downtime',     label: 'Production Downtime',     hint: 'Hours of downtime × hourly production rate', recurring: false },
        { key: 'consultant',   label: 'Consultant / Specialist', hint: 'External fees and professional services',  recurring: false },
        { key: 'admin',        label: 'Administrative Overhead', hint: 'Permitting, documentation, management time', recurring: false },
        { key: 'otherRecurring', label: 'Other Recurring Costs', hint: 'Any other ongoing annual/monthly costs',   recurring: true  },
        { key: 'other',        label: 'Other One-Off Costs',     hint: 'Any additional one-time costs',            recurring: false }
    ];

    const BENEFIT_CATEGORIES = [
        { key: 'injuryCost',     label: 'Injury Cost Avoidance',       hint: 'Reduced lost workday cases × cost per case',  recurring: true, aiPrefill: true },
        { key: 'insurance',      label: 'Insurance Premium Reduction', hint: 'Annual savings on premiums',                  recurring: true, aiPrefill: true },
        { key: 'medical',        label: 'Medical Cost Savings',        hint: 'Reduced medical treatment expenses',          recurring: true, aiPrefill: true },
        { key: 'regulatory',     label: 'Regulatory Fine Avoidance',   hint: 'Expected penalty × probability of citation',  recurring: false, aiPrefill: true },
        { key: 'production',     label: 'Production Uptime Gain',      hint: 'Hours saved per year × hourly value',         recurring: true, aiPrefill: false },
        { key: 'material',       label: 'Material / Equipment Savings',hint: 'Reduced damage and replacement costs',        recurring: true, aiPrefill: false },
        { key: 'ppe',            label: 'PPE Cost Reduction',          hint: 'If hazard eliminated upstream',               recurring: true, aiPrefill: false },
        { key: 'manhours',      label: 'Man-Hours Saved',              hint: 'Hours saved per year × hourly labour rate',   recurring: true,  aiPrefill: false },
        { key: 'retention',      label: 'Worker Retention / Morale',   hint: 'Reduced turnover cost',                       recurring: true, aiPrefill: false },
        { key: 'otherBenefit',   label: 'Other Benefits',              hint: 'Any additional benefits',                     recurring: false, aiPrefill: false }
    ];

    const CM_LADDER = [
        { level: 6, label: 'Level 6 — Elimination',          desc: 'Remove the hazard entirely' },
        { level: 5, label: 'Level 5 — Substitution',         desc: 'Replace with a less hazardous alternative' },
        { level: 4, label: 'Level 4 — Engineering Controls', desc: 'Guards, barriers, ventilation, interlocks' },
        { level: 3, label: 'Level 3 — Visual Controls',      desc: 'Signs, markings, warnings, color coding' },
        { level: 2, label: 'Level 2 — Administrative',       desc: 'Training, SOPs, job rotation, permits' },
        { level: 1, label: 'Level 1 — Individual / PPE',     desc: 'Personal protective equipment' }
    ];

    const TIME_HORIZONS = [1, 3, 5, 10];

    const CURRENCIES = [
        { code: 'USD', symbol: '$',  name: 'US Dollar' },
        { code: 'EUR', symbol: '€',  name: 'Euro' },
        { code: 'GBP', symbol: '£',  name: 'British Pound' },
        { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
        { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan' },
        { code: 'INR', symbol: '₹',  name: 'Indian Rupee' },
        { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
        { code: 'THB', symbol: '฿',  name: 'Thai Baht' }
    ];

    // Disproportion Factor lookup (HSE R2P2 adapted to 4-tier scale)
    const DF_TABLE = [
        { maxScore: 19,  label: 'LOW',      factor: 1  },
        { maxScore: 49,  label: 'MEDIUM',   factor: 2  },
        { maxScore: 71,  label: 'HIGH',     factor: 4  },
        { maxScore: Infinity, label: 'CRITICAL', factor: 10 }
    ];

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    let state = createBlankState();

    function createBlankState() {
        return {
            mode: null,           // 'import' | 'fresh'
            location: { country: '', region: '', lat: null, lng: null, currency: 'USD' },
            currentRisk: {
                description: '',
                hazards: [],      // [{group, name, consequence}]
                frequency: 1,
                severity: 1,
                likelihood: 1,
                score: null,
                category: '',
                imageBase64: null,
                importedRowIndex: null
            },
            proposedMeasure: {
                description: '',
                controlLevel: null,  // 1-6
                costItems: {},       // { capital: 0, installation: 0, ... }
                costRationales: {},  // { capital: 'AI rationale text', ... }
                costBreakdowns: {},  // { capital: [{label,qty,rate,unit,source}], ... }
                timeHorizon: 5
            },
            benefits: {
                items: {},           // { injuryCost: 0, insurance: 0, ... }
                rationales: {},      // { injuryCost: 'AI rationale text', ... }
                breakdowns: {},      // { injuryCost: [{label,qty,rate,unit,source}], ... }
                aiEstimates: null    // raw AI response for reference
            },
            projectedRisk: {
                frequency: 1,
                severity: 1,
                likelihood: 1,
                score: null,
                category: ''
            },
            result: null,            // calculated after user clicks Analyze
            measures: []             // array of completed analyses for comparison
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // RISK SCORING (mirrors main app)
    // ═══════════════════════════════════════════════════════════════

    function calcRiskScore(f, s, l) {
        return (f || 1) * (s || 1) * (l || 1);
    }

    function getRiskCategory(score) {
        if (score >= 72) return 'CRITICAL';
        if (score >= 50) return 'HIGH';
        if (score >= 20) return 'MEDIUM';
        return 'LOW';
    }

    function getRiskColor(category) {
        const colors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#16a34a' };
        return colors[category] || '#64748b';
    }

    function getRiskBg(category) {
        const bgs = { CRITICAL: '#fecaca', HIGH: '#ffedd5', MEDIUM: '#fef9c3', LOW: '#dcfce7' };
        return bgs[category] || '#f1f5f9';
    }

    // ═══════════════════════════════════════════════════════════════
    // ALARP CALCULATION
    // ═══════════════════════════════════════════════════════════════

    function getDisproportionFactor(riskScore) {
        for (const tier of DF_TABLE) {
            if (riskScore <= tier.maxScore) return tier;
        }
        return DF_TABLE[DF_TABLE.length - 1];
    }

    function calculateLifecycleCost(costItems, timeHorizon) {
        let total = 0;
        for (const cat of COST_CATEGORIES) {
            const amount = parseFloat(costItems[cat.key]) || 0;
            total += cat.recurring ? amount * timeHorizon : amount;
        }
        return total;
    }

    function calculateLifecycleBenefit(benefitItems, timeHorizon) {
        let total = 0;
        for (const cat of BENEFIT_CATEGORIES) {
            const amount = parseFloat(benefitItems[cat.key]) || 0;
            total += cat.recurring ? amount * timeHorizon : amount;
        }
        return total;
    }

    function calculateALARP() {
        const s = state;
        const currentScore = calcRiskScore(s.currentRisk.frequency, s.currentRisk.severity, s.currentRisk.likelihood);
        s.currentRisk.score = currentScore;
        s.currentRisk.category = getRiskCategory(currentScore);

        const projectedScore = calcRiskScore(s.projectedRisk.frequency, s.projectedRisk.severity, s.projectedRisk.likelihood);
        s.projectedRisk.score = projectedScore;
        s.projectedRisk.category = getRiskCategory(projectedScore);

        const totalCost = calculateLifecycleCost(s.proposedMeasure.costItems, s.proposedMeasure.timeHorizon);
        const totalBenefit = calculateLifecycleBenefit(s.benefits.items, s.proposedMeasure.timeHorizon);

        const dfTier = getDisproportionFactor(currentScore);
        const adjustedBenefit = totalBenefit * dfTier.factor;
        const ratio = totalCost > 0 ? adjustedBenefit / totalCost : (totalBenefit > 0 ? Infinity : 0);

        let verdict, verdictColor, verdictLabel;
        if (ratio > 1.0) {
            verdict = 'IMPLEMENT';
            verdictColor = '#16a34a';
            verdictLabel = 'Measure is reasonably practicable — IMPLEMENT';
        } else if (ratio >= 0.5) {
            verdict = 'BORDERLINE';
            verdictColor = '#ca8a04';
            verdictLabel = 'Borderline — review with management';
        } else {
            verdict = 'DISPROPORTIONATE';
            verdictColor = '#dc2626';
            verdictLabel = 'Cost is grossly disproportionate — risk is already ALARP';
        }

        s.result = {
            totalCost,
            totalBenefit,
            dfFactor: dfTier.factor,
            dfLabel: dfTier.label,
            adjustedBenefit,
            ratio,
            verdict,
            verdictColor,
            verdictLabel,
            currentScore,
            currentCategory: s.currentRisk.category,
            projectedScore,
            projectedCategory: s.projectedRisk.category,
            riskReduction: currentScore - projectedScore,
            timeHorizon: s.proposedMeasure.timeHorizon
        };

        return s.result;
    }

    // ═══════════════════════════════════════════════════════════════
    // TABLE ROW IMPORT
    // ═══════════════════════════════════════════════════════════════

    function importFromTable(rowIndex) {
        const row = document.querySelector(`#table-container tbody tr[data-row-index="${rowIndex}"]`);
        if (!row) return false;

        const cells = row.querySelectorAll('td');
        if (cells.length < 14) return false;

        state.mode = 'import';
        state.currentRisk.importedRowIndex = parseInt(rowIndex);
        state.currentRisk.description = (cells[2] ? cells[2].textContent.trim() : '');

        // Hazard group
        const hgSelect = cells[3] ? cells[3].querySelector('select') : null;
        const hazardGroup = hgSelect ? hgSelect.value : '';

        // Hazard list
        const hlSelect = cells[4] ? cells[4].querySelector('select') : null;
        const hazardList = hlSelect ? hlSelect.value : '';

        // Consequence
        const cSelect = cells[5] ? cells[5].querySelector('select') : null;
        const consequence = cSelect ? cSelect.value : '';

        state.currentRisk.hazards = [{ group: hazardGroup, name: hazardList, consequence }];

        // F, S, L
        const fSelect = cells[6] ? cells[6].querySelector('select') : null;
        const sSelect = cells[7] ? cells[7].querySelector('select') : null;
        const lSelect = cells[8] ? cells[8].querySelector('select') : null;
        state.currentRisk.frequency = parseInt(fSelect ? fSelect.value : 1) || 1;
        state.currentRisk.severity = parseInt(sSelect ? sSelect.value : 1) || 1;
        state.currentRisk.likelihood = parseInt(lSelect ? lSelect.value : 1) || 1;
        state.currentRisk.score = calcRiskScore(state.currentRisk.frequency, state.currentRisk.severity, state.currentRisk.likelihood);
        state.currentRisk.category = getRiskCategory(state.currentRisk.score);

        // Image
        const imgEl = cells[0] ? cells[0].querySelector('img') : null;
        if (imgEl && imgEl.src) {
            state.currentRisk.imageBase64 = imgEl.src;
        }

        // Hazard source + current control
        const hsInput = cells[11] ? cells[11].querySelector('input') : null;
        const ccInput = cells[12] ? cells[12].querySelector('input') : null;
        if (hsInput) state.currentRisk.hazardSource = hsInput.value;
        if (ccInput) state.currentRisk.currentControl = ccInput.value;

        return true;
    }

    function getTableRows() {
        const rows = document.querySelectorAll('#table-container tbody tr[data-row-index]');
        const result = [];
        rows.forEach(row => {
            if (row.dataset.deleted === 'true' || row.classList.contains('deleted-row')) return;
            const idx = row.dataset.rowIndex;
            const cells = row.querySelectorAll('td');
            const stepText = cells[2] ? cells[2].textContent.trim() : `Row ${idx}`;
            const scoreCell = cells[9] ? cells[9].textContent.trim() : '?';
            const catCell = cells[10] ? cells[10].textContent.trim() : '';
            result.push({ index: idx, step: stepText, score: scoreCell, category: catCell });
        });
        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVE / LOAD
    // ═══════════════════════════════════════════════════════════════

    function exportData() {
        return JSON.parse(JSON.stringify({
            mode: state.mode,
            location: state.location,
            currentRisk: {
                description: state.currentRisk.description,
                hazards: state.currentRisk.hazards,
                frequency: state.currentRisk.frequency,
                severity: state.currentRisk.severity,
                likelihood: state.currentRisk.likelihood,
                score: state.currentRisk.score,
                category: state.currentRisk.category,
                importedRowIndex: state.currentRisk.importedRowIndex
            },
            proposedMeasure: state.proposedMeasure,
            benefits: state.benefits,
            projectedRisk: state.projectedRisk,
            result: state.result,
            measures: state.measures
        }));
    }

    function importData(data) {
        if (!data) return;
        state = createBlankState();
        Object.assign(state, data);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    window.CBA.engine = {
        // Constants
        COST_CATEGORIES,
        BENEFIT_CATEGORIES,
        CM_LADDER,
        TIME_HORIZONS,
        CURRENCIES,
        DF_TABLE,

        // State
        getState:       () => state,
        resetState:     () => { state = createBlankState(); },
        createBlankState,

        // Risk scoring
        calcRiskScore,
        getRiskCategory,
        getRiskColor,
        getRiskBg,

        // ALARP
        getDisproportionFactor,
        calculateLifecycleCost,
        calculateLifecycleBenefit,
        calculateALARP,

        // Table integration
        importFromTable,
        getTableRows,

        // Save / Load
        exportData,
        importData
    };

})();
