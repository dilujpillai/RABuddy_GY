/**
 * cba-ui.js — Cost-Benefit Analyzer UI
 *
 * Features:
 * - Left/Right layout: Costs (left, red) vs Benefits (right, green)
 * - Currency dropdown on analyze page
 * - Animated SVG ALARP triangle + Carrot/Bow-Tie diagram
 * - AI model selector (Claude, GPT-4o, Gemini)
 * - Month/Year toggle for recurring items
 */
(function () {
    'use strict';

    window.CBA = window.CBA || {};
    const E = window.CBA.engine;
    const A = window.CBA.ai;

    const AI_MODELS = [
        { value: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
        { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Best reasoning)' },
    ];

    const SOURCE_URLS = {
        AAA_STATS: 'https://gouvernement.lu/fr/actualites/toutes_actualites/communiques/2025/09-septembre/26-aaa-rapport.html',
        AAA_REPORT: 'https://aaa.public.lu/fr/aaa/Rapport-annuel.html',
        AAA_BONUS: 'https://aaa.public.lu/fr/prestations-cotisations/cotisations/bonusmalus.html',
        MDE_AFFILIATION: 'https://mde.public.lu/fr/affiliation-financement/affiliation-employeurs.html',
        MDE_FINANCING: 'https://mde.public.lu/fr/affiliation-financement/financement.html',
        ITM_REPORT_PDF: 'https://itm.public.lu/dam-assets/fr/publications/rapports-annuels/rapport-annuel-2024.pdf',
        STATEC_PORTAL: 'https://statistiques.public.lu/fr.html',
        ISSA_ROP: 'https://www.britsafe.org/media/5pgnkhzr/the-business-benefits-health-and-safety-literature-review.pdf'
    };

    let root = null;
    let step = 'landing';
    let resultsPanel = null;

    let uiState = {
        aiLoading: false, aiError: null, locationDetected: true,   // Luxembourg: always detected
        freshDescription: '', selectedRow: null, aiNotes: '',
        recurringPeriod: 'year', aiModel: 'anthropic/claude-sonnet-4-6',
        // Labour parameters: process frequency (per week) and effective task duration
        processFrequencyPerWeek: null,      // number of times task is performed per week
        processTimeMinutesPerTask: null,    // calculated effective minutes per task (480 / freq)
        taskBreakdownMinutes: 10,           // minimum task duration threshold for cost breakdown granularity
        avgHourlyWage: 28,                  // Luxembourg median hourly wage (STATEC 2024: €58,126/yr ÷ 2080hrs = €27.94/hr)
        baselineRefreshing: false,           // true while AI baseline refresh is running
        summaryLoading: false,               // true while executive summary helper is generating
        executiveSummary: null,              // last generated executive summary helper payload
        aiSnapshot: null,                    // deep copy of last AI-returned values (for revert)
        viewingMeasureIndex: null,           // index of saved measure being viewed (null = fresh)
        baselineApplied: false,              // true after "Apply Baseline to Table" has been used
        baselineBackStep: 'landing',         // where baseline editor navigates back to
        openCalcPanels: {},                  // remembers expanded breakdown panels by card key
        suppressNextAnalyzeFade: false,      // disables one render-cycle fade for in-place structure updates
        suppressNextRiskFade: false,         // disables one render-cycle fade for score dropdown edits on Step 1
        newBreakdownRow: null,               // one-shot marker for subtle enter animation on newly added split rows
        suppressNextResultsMotion: false,    // disables one results refresh cycle animation (projected risk dropdown edits)
        lastAddedRowHint: null               // fallback row-add animation marker { panelKey, at }
    };

    const RISK_SCALE_OPTIONS = {
        frequency: [
            { value: 1, label: 'RARELY', definition: 'Day: -, Week: -, Month: <0.5 day, Year: 1 day' },
            { value: 1.25, label: 'OCCASIONAL', definition: 'Day: <30 min, Week: <2 hours, Month: <1 day, Year: <5 days' },
            { value: 1.5, label: 'INTERMEDIATE', definition: 'Day: 30-120 min, Week: 2-8 hours, Month: 1-4 days, Year: 5 days to 2 months' },
            { value: 1.75, label: 'FREQUENTLY', definition: 'Day: 2-5 hours, Week: 1-3 days, Month: 4-15 days, Year: 2-5 months' },
            { value: 2, label: 'PERMANENT', definition: 'Day: >5 hours, Week: >3 days, Month: >15 days, Year: >5 months' }
        ],
        severity: [
            { value: 1, label: 'No potential of injury', definition: 'Most probable injury: No treatment needed' },
            { value: 3, label: 'Potential of FIRST AID', definition: 'Most probable injury: Non-prescription medication' },
            { value: 5, label: 'Potential of MEDICAL TREATMENT', definition: 'Most probable injury: Prescription medications' },
            { value: 7, label: 'Potential of DART', definition: 'Most probable injury: Temporary disability' },
            { value: 9, label: 'Potential of SIA', definition: 'Most probable injury: Amputation' },
            { value: 10, label: 'Potential of Fatality', definition: 'Most probable injury: Death' }
        ],
        likelihood: [
            { value: 1, label: 'Almost impossible', definition: 'Machinery: hazard not reachable per ISO 13857 + compliant with 13849. IH: no Class 1 / Class 2-3 with CML 1-3. Other H&S: CML 4-5 with no known event.' },
            { value: 3, label: 'Very unlikely', definition: 'Machinery: hazard not reachable per ISO 13857. IH: Class 1 with CML 1-3 / Class 2-3 with CML 1 and 3. Other H&S: CML 4 with 1 event in 5 years or CML 1-3 with no known event.' },
            { value: 5, label: 'Possible to happen', definition: 'Machinery: reachable and all apply (speed <250 cm/s, obvious hazard, room/time to escape, low task complexity). IH: Class 1 with CML 1 and 3 / Class 2-3 without CML. Other H&S: CML 1-3 with 1 event in 3 years or CML 1-2 with no known event.' },
            { value: 8, label: 'Likely to happen', definition: 'Machinery: reachable and all apply (speed 251 to 100 mm/s, obvious hazard, room/time to escape). IH: Class 1 with CML 1 or higher. Other H&S: CML 1 OR 2 OR 3 in place with 1 event over the past 3 years.' },
            { value: 10, label: 'Very likely to happen', definition: 'Machinery: reachable with speed >100 mm/s OR no room/time to escape. IH: record of confirmed occupational disease. Other H&S: 2 or more events over the past 3 years.' }
        ]
    };

    function formatScaleValue(v) {
        const n = Number(v);
        if (!isFinite(n)) return '0';
        return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
    }

    function normalizeScaleValue(type, raw, fallback) {
        if (E && typeof E.normalizeToScaleValue === 'function') {
            return E.normalizeToScaleValue(type, raw, fallback);
        }
        const list = (RISK_SCALE_OPTIONS[type] || []).map(x => x.value);
        const fb = fallback != null ? Number(fallback) : (list.length ? list[0] : 1);
        const n = Number(raw);
        if (!isFinite(n) || !list.length) return fb;
        let best = list[0];
        let bestDiff = Math.abs(n - best);
        list.slice(1).forEach((val) => {
            const diff = Math.abs(n - val);
            if (diff < bestDiff) {
                best = val;
                bestDiff = diff;
            }
        });
        return best;
    }

    function normalizeRiskState(riskObj) {
        riskObj.frequency = normalizeScaleValue('frequency', riskObj.frequency, 1);
        riskObj.severity = normalizeScaleValue('severity', riskObj.severity, 1);
        riskObj.likelihood = normalizeScaleValue('likelihood', riskObj.likelihood, 1);
        riskObj.score = E.calcRiskScore(riskObj.frequency, riskObj.severity, riskObj.likelihood);
        riskObj.category = E.getRiskCategory(riskObj.score);
    }

    function getScaleEntry(type, value) {
        const normalized = normalizeScaleValue(type, value, 1);
        return (RISK_SCALE_OPTIONS[type] || []).find(x => x.value === normalized) || null;
    }

    function toBaselineSeverityLevel(severityValue) {
        const s = normalizeScaleValue('severity', severityValue, 1);
        if (s <= 1) return 1;
        if (s <= 3) return 2;
        if (s <= 5) return 3;
        if (s <= 8) return 4;
        return 5;
    }

    function baselineSeverityName(level) {
        return ({ 1: 'Negligible', 2: 'Minor', 3: 'Moderate', 4: 'Major', 5: 'Catastrophic' })[level] || 'Selected';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROGRESS MODAL
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Shows a floating progress modal with animated step indicators.
     *
     * @param {string}   titleText    Main heading
     * @param {string}   subtitleText Sub-heading (mutated per step via returned helpers)
     * @param {string[]} steps        Array of step label strings
     * @returns {{setStep, setSubtitle, close, allDone, setError}}
     */
    function showProgressModal(titleText, subtitleText, steps) {
        // Remove any existing modal
        const old = document.getElementById('cba-progress-overlay');
        if (old) old.remove();

        const ICONS = { pending: '○', active: '⟳', done: '✓', error: '✗' };
        const ICON_COLORS = { pending: '#94a3b8', active: '#3b82f6', done: '#22c55e', error: '#ef4444' };
        const ROW_BG = { pending: '#f8fafc', active: '#eff6ff', done: '#f0fdf4', error: '#fef2f2' };

        const overlay = el('div', {
            id: 'cba-progress-overlay',
            style: 'position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);'
        });

        const card = el('div', {
            style: 'background:#fff;border-radius:20px;padding:32px 36px;max-width:460px;width:92%;box-shadow:0 30px 90px rgba(0,0,0,0.28);font-family:"Segoe UI",system-ui,sans-serif;'
        });

        // Spinner CSS (injected once)
        if (!document.getElementById('cba-pm-spin-style')) {
            const sty = document.createElement('style');
            sty.id = 'cba-pm-spin-style';
            sty.textContent = '@keyframes cba-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.cba-pm-spin{display:inline-block;animation:cba-spin .8s linear infinite;}';
            document.head.appendChild(sty);
        }

        const titleEl = el('div', { style: 'font-size:19px;font-weight:800;color:#1e293b;margin-bottom:5px;' }, titleText);
        // Title row with cancel button
        const titleRow = el('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px;' });
        titleRow.appendChild(titleEl);
        const cancelBtn = el('button', {
            style: 'background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;padding:0 2px;line-height:1;flex-shrink:0;',
            title: 'Cancel / Close',
            onClick: () => { close(); uiState.baselineRefreshing = false; render(); }
        }, '✕');
        titleRow.appendChild(cancelBtn);
        card.appendChild(titleRow);
        const subtitleEl = el('div', { id: 'cba-pm-subtitle', style: 'font-size:13px;color:#64748b;margin-bottom:22px;line-height:1.5;' }, subtitleText);
        card.appendChild(subtitleEl);
        const stepEls = steps.map((step, i) => {
            const row = el('div', {
                id: `cba-pm-step-${i}`,
                style: `display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;margin-bottom:6px;background:${ROW_BG.pending};transition:background .3s;`
            });
            const icon = el('span', {
                id: `cba-pm-icon-${i}`,
                style: `font-size:15px;width:20px;text-align:center;flex-shrink:0;color:${ICON_COLORS.pending};`
            }, ICONS.pending);
            const text = el('span', { style: 'font-size:13px;color:#475569;flex:1;' }, step);
            row.appendChild(icon);
            row.appendChild(text);
            card.appendChild(row);
            return { row, icon };
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        function setStep(i, state) {
            if (!stepEls[i]) return;
            const { row, icon } = stepEls[i];
            row.style.background = ROW_BG[state] || ROW_BG.pending;
            icon.style.color = ICON_COLORS[state] || ICON_COLORS.pending;
            if (state === 'active') {
                icon.innerHTML = '<span class="cba-pm-spin">⟳</span>';
            } else {
                icon.textContent = ICONS[state] || ICONS.pending;
            }
        }

        function setSubtitle(text) { subtitleEl.textContent = text; }

        function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }

        function allDone(closeAfterMs) {
            steps.forEach((_, i) => setStep(i, 'done'));
            setSubtitle('Done! Baselines updated.');
            setTimeout(close, closeAfterMs != null ? closeAfterMs : 1400);
        }

        function setError(i, msg) {
            setStep(i, 'error');
            setSubtitle(msg || 'An error occurred.');
            // Add a close button row below steps, and auto-close after 6s
            const errRow = el('div', { style: 'margin-top:16px;display:flex;justify-content:flex-end;' });
            const closeBtn = el('button', {
                style: 'background:#ef4444;color:#fff;border:none;border-radius:8px;padding:7px 18px;font-size:13px;font-weight:700;cursor:pointer;',
                onClick: () => { close(); uiState.baselineRefreshing = false; render(); }
            }, 'Close');
            errRow.appendChild(closeBtn);
            card.appendChild(errRow);
            setTimeout(() => { close(); uiState.baselineRefreshing = false; render(); }, 6000);
        }

        return { setStep, setSubtitle, close, allDone, setError };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BASELINE REFRESH  (wires AI call + modal together)
    // ═══════════════════════════════════════════════════════════════════════

    async function runBaselineRefresh(s, modelOverride) {
        const B = window.CBA.baseline;
        if (!B) { alert('Baseline module not loaded.'); return; }

        const locStr = 'Luxembourg';
        const currency = 'EUR';
        const severity = s.currentRisk && s.currentRisk.severity ? s.currentRisk.severity : 3;
        const model = modelOverride || uiState.aiModel;

        const STEPS = [
            'Loading Luxembourg OSH framework context',
            'Researching AAA 2024 accident rates & direct costs (€4,053 avg)',
            'Fetching Lohnfortzahlung / MDE absenteeism baselines (80% rule)',
            'Calibrating AAA Bonus-Malus premium impact anchors',
            'Checking ITM fine data (avg €5,530; max €4,000/worker)',
            'Applying STATEC wage data (median €28/hr) & ISSA ROP 2.2',
            'Updating Luxembourg baseline registry'
        ];

        const modal = showProgressModal(
            'Refreshing Luxembourg Safety Cost Baselines',
            `AI is researching AAA, MDE, ITM & STATEC benchmarks for Luxembourg…`,
            STEPS
        );

        uiState.baselineRefreshing = true;
        render();

        // Immediately mark step 0 done (sync context gathering)
        modal.setStep(0, 'done');
        modal.setStep(1, 'active');

        // Animate steps 1-5 while the single batched AI call runs
        let stepIndex = 1;
        const stepInterval = setInterval(() => {
            if (stepIndex < STEPS.length - 2) {
                modal.setStep(stepIndex, 'done');
                stepIndex++;
                modal.setStep(stepIndex, 'active');
                modal.setSubtitle(STEPS[stepIndex] + '…');
            }
        }, 3200);

        try {
            const newData = await A.refreshBaselineData(locStr, currency, model);
            clearInterval(stepInterval);

            // Finish remaining steps
            for (let i = 1; i <= STEPS.length - 2; i++) modal.setStep(i, 'done');
            modal.setStep(STEPS.length - 1, 'active');
            modal.setSubtitle('Saving to local registry…');

            B.update(newData, locStr, currency, model);

            modal.setStep(STEPS.length - 1, 'done');
            modal.allDone(1600);
        } catch (e) {
            clearInterval(stepInterval);
            modal.setError(stepIndex, 'Error: ' + e.message);
            setTimeout(() => modal.close(), 4000);
        } finally {
            uiState.baselineRefreshing = false;
            render();
        }
    }

    function seedManualBreakdownRows(cat, displayTotal, source, sourceUrl, qtyReason) {
        const val = Math.max(0, parseFloat(displayTotal) || 0);
        const unit = cat.recurring
            ? (uiState.recurringPeriod === 'month' ? 'per month' : 'per year')
            : 'one-off';
        const row = {
            label: `${cat.label} component`,
            qty: val > 0 ? 1 : 0,
            qtyReason: qtyReason || 'Manual split created by user. Edit qty and rate to match your site conditions.',
            rate: Math.round(val),
            unit,
            source: source || 'Manual user split',
            sourceUrl: sourceUrl || '',
            noteDetails: {
                definition: `${cat.label} component`,
                basis: 'Manual split created by user. Edit qty and rate to match your site conditions.',
                parameters: '',
                formula: 'Qty x Rate',
                autoParams: true
            }
        };
        syncRowQtyReasonFromNote(row, currencySymbol());
        return [row];
    }

    function buildExecutiveSummaryContext(s, sym) {
        const costRows = E.COST_CATEGORIES.map(cat => ({
            key: cat.key,
            label: cat.label,
            recurring: cat.recurring,
            amountAnnual: Math.round(parseFloat(s.proposedMeasure.costItems[cat.key]) || 0),
            amountShown: Math.round(toDisplay(parseFloat(s.proposedMeasure.costItems[cat.key]) || 0, cat.recurring)),
            rationale: (s.proposedMeasure.costRationales || {})[cat.key] || '',
            breakdownCount: ((s.proposedMeasure.costBreakdowns || {})[cat.key] || []).length
        }));
        const benefitRows = E.BENEFIT_CATEGORIES.map(cat => ({
            key: cat.key,
            label: cat.label,
            recurring: cat.recurring,
            amountAnnual: Math.round(parseFloat(s.benefits.items[cat.key]) || 0),
            amountShown: Math.round(toDisplay(parseFloat(s.benefits.items[cat.key]) || 0, cat.recurring)),
            rationale: (s.benefits.rationales || {})[cat.key] || '',
            breakdownCount: ((s.benefits.breakdowns || {})[cat.key] || []).length
        }));

        return {
            location: {
                country: s.location.country || 'Luxembourg',
                region: s.location.region || '',
                currency: s.location.currency || 'EUR',
                currencySymbol: sym,
                recurringShown: uiState.recurringPeriod
            },
            hazard: {
                description: s.currentRisk.description || '',
                hazards: (s.currentRisk.hazards || []).slice(0, 8),
                score: s.currentRisk.score || E.calcRiskScore(s.currentRisk.frequency, s.currentRisk.severity, s.currentRisk.likelihood),
                category: s.currentRisk.category || E.getRiskCategory(E.calcRiskScore(s.currentRisk.frequency, s.currentRisk.severity, s.currentRisk.likelihood)),
                frequency: s.currentRisk.frequency || 1,
                severity: s.currentRisk.severity || 1,
                likelihood: s.currentRisk.likelihood || 1
            },
            measure: {
                description: s.proposedMeasure.description || '',
                controlLevel: s.proposedMeasure.controlLevel || null,
                timeHorizonYears: s.proposedMeasure.timeHorizon || 5
            },
            projectedRisk: {
                frequency: s.projectedRisk.frequency || 1,
                severity: s.projectedRisk.severity || 1,
                likelihood: s.projectedRisk.likelihood || 1,
                score: E.calcRiskScore(s.projectedRisk.frequency || 1, s.projectedRisk.severity || 1, s.projectedRisk.likelihood || 1),
                category: E.getRiskCategory(E.calcRiskScore(s.projectedRisk.frequency || 1, s.projectedRisk.severity || 1, s.projectedRisk.likelihood || 1))
            },
            costs: costRows,
            benefits: benefitRows,
            aiNotes: uiState.aiNotes || '',
            userInputs: {
                processFrequencyPerWeek: uiState.processFrequencyPerWeek || null,
                processTimeMinutesPerTask: uiState.processTimeMinutesPerTask || null,
                avgHourlyWage: uiState.avgHourlyWage || null
            }
        };
    }

    function normalizeExecutiveSummary(raw) {
        const x = raw || {};
        return {
            headline: String(x.headline || 'Executive Summary'),
            overview: String(x.overview || ''),
            costDrivers: Array.isArray(x.costDrivers) ? x.costDrivers : [],
            benefitDrivers: Array.isArray(x.benefitDrivers) ? x.benefitDrivers : [],
            assumptions: Array.isArray(x.assumptions) ? x.assumptions : [],
            nextSteps: Array.isArray(x.nextSteps) ? x.nextSteps : []
        };
    }

    function cacheExecutiveSummary(summaryRaw, isFallback, contextRaw) {
        const safeSummary = normalizeExecutiveSummary(summaryRaw);
        let safeContext = null;
        try {
            safeContext = contextRaw ? JSON.parse(JSON.stringify(contextRaw)) : null;
        } catch (e) {
            safeContext = null;
        }

        uiState.executiveSummary = {
            summary: safeSummary,
            isFallback: !!isFallback,
            model: uiState.aiModel || '',
            generatedAt: new Date().toISOString(),
            context: safeContext
        };
        return safeSummary;
    }

    function buildFallbackExecutiveSummary(ctx, sym) {
        const topCosts = (ctx.costs || []).filter(i => i.amountAnnual > 0).sort((a, b) => b.amountAnnual - a.amountAnnual).slice(0, 3);
        const topBenefits = (ctx.benefits || []).filter(i => i.amountAnnual > 0).sort((a, b) => b.amountAnnual - a.amountAnnual).slice(0, 3);
        const hazardText = ctx.hazard && ctx.hazard.description ? ctx.hazard.description : 'No hazard description entered yet.';

        return {
            headline: 'Executive Summary (Quick Guide)',
            overview: `Main hazard: ${hazardText} Current risk is ${ctx.hazard.category} (${ctx.hazard.score}). The table is fully manual, so each line can be tuned to your site data. Start by validating top cost drivers, then confirm the largest benefits with your baseline assumptions.`,
            costDrivers: topCosts.map(c => ({
                item: c.label,
                amount: `${sym}${formatNum(c.amountAnnual)} /yr`,
                explanation: 'This is one of the biggest cost contributors in your current table.',
                userCanEdit: 'Edit total directly or use Split to adjust component qty and rates.'
            })),
            benefitDrivers: topBenefits.map(b => ({
                item: b.label,
                amount: `${sym}${formatNum(b.amountAnnual)} /yr`,
                explanation: 'This is one of the biggest expected gains from the measure.',
                userCanEdit: 'Tune assumptions in breakdown rows to match your process reality.'
            })),
            assumptions: [
                'Recurring entries are converted between monthly and yearly display automatically.',
                'Risk score and control level should match the real task conditions.'
            ],
            nextSteps: [
                'Use Split on key lines and enter your own quantities and rates.',
                'Review rationale text so each figure is traceable and auditable.',
                'Re-check projected risk after editing before final save.'
            ]
        };
    }

    function openExecutiveSummaryModal() {
        const old = document.getElementById('cba-summary-overlay');
        if (old) old.remove();

        const overlay = el('div', {
            id: 'cba-summary-overlay',
            style: 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:10010;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);'
        });
        const card = el('div', {
            style: 'background:#fff;border-radius:18px;width:min(960px,98vw);max-height:88vh;overflow:auto;box-shadow:0 30px 90px rgba(0,0,0,0.28);border:1px solid #e2e8f0;'
        });
        const hdr = el('div', { style: 'display:flex;align-items:center;gap:10px;position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 16px;z-index:1;' });
        hdr.appendChild(el('div', { style: 'font-size:15px;font-weight:800;color:#0f172a;flex:1;' }, 'Executive Summary Helper'));
        const closeBtn = el('button', {
            style: 'border:none;background:#e2e8f0;color:#0f172a;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;',
            onClick: () => overlay.remove()
        }, 'Close');
        hdr.appendChild(closeBtn);
        card.appendChild(hdr);

        const body = el('div', { style: 'padding:16px;display:flex;flex-direction:column;gap:12px;' });
        card.appendChild(body);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        function setLoading(message) {
            body.innerHTML = '';
            const row = el('div', { style: 'display:flex;align-items:center;gap:10px;color:#334155;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px;' });
            row.appendChild(svgSpinner(16, '#2563eb'));
            row.appendChild(el('span', { style: 'font-size:13px;font-weight:600;' }, message || 'Generating plain-language summary...'));
            body.appendChild(row);
        }

        function renderDriverSection(title, items, tone) {
            const panel = el('div', { style: `border:1px solid ${tone === 'cost' ? '#fecaca' : '#a7f3d0'};background:${tone === 'cost' ? '#fff7f7' : '#f0fdf4'};border-radius:12px;padding:12px;` });
            panel.appendChild(el('div', { style: 'font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px;' }, title));
            if (!items || items.length === 0) {
                panel.appendChild(el('div', { style: 'font-size:12px;color:#64748b;' }, 'No non-zero entries yet. Add values in the table to see a richer summary.'));
                return panel;
            }
            items.forEach(d => {
                const item = el('div', { style: 'border-top:1px dashed rgba(148,163,184,.5);padding-top:8px;margin-top:8px;' });
                item.appendChild(el('div', { style: 'font-size:12px;font-weight:700;color:#1e293b;' }, `${d.item || 'Item'} ${d.amount ? `(${d.amount})` : ''}`));
                if (d.explanation) item.appendChild(el('div', { style: 'font-size:12px;color:#334155;margin-top:4px;' }, d.explanation));
                if (d.userCanEdit) item.appendChild(el('div', { style: 'font-size:11px;color:#475569;margin-top:4px;' }, `You can edit: ${d.userCanEdit}`));
                panel.appendChild(item);
            });
            return panel;
        }

        function setSummary(summary, isFallback) {
            body.innerHTML = '';
            if (isFallback) {
                body.appendChild(el('div', {
                    style: 'font-size:12px;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:8px 10px;'
                }, 'AI helper was unavailable, so this summary is generated from your current table values.'));
            }
            body.appendChild(el('div', { style: 'font-size:18px;font-weight:900;color:#0f172a;' }, summary.headline || 'Executive Summary'));
            if (summary.overview) {
                body.appendChild(el('div', { style: 'font-size:13px;line-height:1.6;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;' }, summary.overview));
            }
            body.appendChild(renderDriverSection('What is driving your costs?', summary.costDrivers, 'cost'));
            body.appendChild(renderDriverSection('What benefits are you gaining?', summary.benefitDrivers, 'benefit'));

            const listsWrap = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;' });
            const assump = el('div', { style: 'border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#fff;' });
            assump.appendChild(el('div', { style: 'font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px;' }, 'Assumptions to check'));
            (summary.assumptions || []).forEach(a => assump.appendChild(el('div', { style: 'font-size:12px;color:#334155;margin-top:4px;' }, `• ${a}`)));
            if (!summary.assumptions || summary.assumptions.length === 0) assump.appendChild(el('div', { style: 'font-size:12px;color:#64748b;' }, 'No assumptions listed.'));

            const next = el('div', { style: 'border:1px solid #d1fae5;border-radius:12px;padding:10px;background:#ecfdf5;' });
            next.appendChild(el('div', { style: 'font-size:12px;font-weight:800;color:#065f46;margin-bottom:6px;' }, 'Suggested next steps'));
            (summary.nextSteps || []).forEach(n => next.appendChild(el('div', { style: 'font-size:12px;color:#065f46;margin-top:4px;' }, `• ${n}`)));
            if (!summary.nextSteps || summary.nextSteps.length === 0) next.appendChild(el('div', { style: 'font-size:12px;color:#64748b;' }, 'No next steps listed.'));

            listsWrap.appendChild(assump);
            listsWrap.appendChild(next);
            body.appendChild(listsWrap);
        }

        return { setLoading, setSummary };
    }

    async function runExecutiveSummaryHelper(s) {
        const sym = currencySymbol();
        const modal = openExecutiveSummaryModal();
        modal.setLoading('Reading hazard, risk, and table values to build a plain-language guide...');
        uiState.summaryLoading = true;
        render();

        try {
            const ctx = buildExecutiveSummaryContext(s, sym);
            if (A && typeof A.generateExecutiveSummary === 'function') {
                const aiSummary = await A.generateExecutiveSummary(ctx, uiState.aiModel);
                const normalized = cacheExecutiveSummary(aiSummary, false, ctx);
                modal.setSummary(normalized, false);
            } else {
                const fallbackSummary = buildFallbackExecutiveSummary(ctx, sym);
                const normalized = cacheExecutiveSummary(fallbackSummary, true, ctx);
                modal.setSummary(normalized, true);
            }
        } catch (e) {
            const fallbackCtx = buildExecutiveSummaryContext(s, sym);
            const fallbackSummary = buildFallbackExecutiveSummary(fallbackCtx, sym);
            const normalized = cacheExecutiveSummary(fallbackSummary, true, fallbackCtx);
            modal.setSummary(normalized, true);
        } finally {
            uiState.summaryLoading = false;
            render();
        }
    }

    function openParameterHelpModal(cat, type, sym, periodLabel) {
        const isCost = type === 'cost';
        const old = document.getElementById('cba-param-help-overlay');
        if (old) old.remove();

        const overlay = el('div', {
            id: 'cba-param-help-overlay',
            style: 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:10020;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(4px);'
        });
        const card = el('div', {
            style: 'background:#fff;border-radius:16px;width:min(760px,98vw);max-height:88vh;overflow:auto;box-shadow:0 30px 90px rgba(0,0,0,0.28);border:1px solid #e2e8f0;'
        });

        const header = el('div', {
            style: 'display:flex;align-items:center;gap:10px;position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:12px 14px;z-index:1;'
        });
        header.appendChild(el('div', { style: 'font-size:15px;font-weight:800;color:#0f172a;flex:1;' }, `How to fill: ${cat.label}`));
        const closeBtn = el('button', {
            style: 'border:none;background:#e2e8f0;color:#0f172a;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;',
            onClick: () => overlay.remove()
        }, 'Close');
        header.appendChild(closeBtn);
        card.appendChild(header);

        const body = el('div', { style: 'padding:14px;display:flex;flex-direction:column;gap:10px;' });
        body.appendChild(el('div', {
            style: 'font-size:13px;line-height:1.55;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;'
        }, cat.hint || 'Use this line to capture one cost or one benefit for your measure.'));

        const modeText = isCost
            ? 'This line is a cost. Larger values increase total cost.'
            : 'This line is a benefit. Larger values increase total benefit.';
        body.appendChild(el('div', {
            style: `font-size:12px;color:${isCost ? '#991b1b' : '#065f46'};background:${isCost ? '#fef2f2' : '#ecfdf5'};border:1px solid ${isCost ? '#fecaca' : '#a7f3d0'};border-radius:10px;padding:8px 10px;`
        }, modeText));

        const list = el('div', {
            style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px;'
        });

        const addParam = (name, desc) => {
            const box = el('div', { style: 'border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#fff;' });
            box.appendChild(el('div', { style: 'font-size:12px;font-weight:800;color:#0f172a;' }, name));
            box.appendChild(el('div', { style: 'font-size:12px;color:#475569;line-height:1.45;margin-top:3px;' }, desc));
            list.appendChild(box);
        };

        addParam('Total', `The final value for this line (${sym}). You can type it directly.`);
        addParam('split', 'Creates editable component rows so you can break one total into smaller parts.');
        addParam('Component', 'Short name of each part. Example: training time, PPE replacement, inspection labor.');
        addParam('Qty', 'How many units you have (people, events, hours, items, days, etc.).');
        addParam('Rate', isCost
            ? `Cost per one unit (${sym} per unit).`
            : `Benefit or saving per one unit (${sym} per unit).`);
        addParam('Subtotal', 'Calculated automatically as Qty x Rate for each component row.');
        addParam('Sigma total', 'Sum of all component subtotals. This syncs back to the line total.');
        addParam('Rationale', 'Plain-language reason for your number so reviewers understand your logic.');
        addParam('Source / evidence', 'Where the number came from (invoice, payroll data, supplier quote, baseline, etc.).');
        addParam('Quantity notes', 'Short note explaining why the chosen quantity is realistic for your process.');
        body.appendChild(list);

        const recurringExplain = cat.recurring
            ? `This line is recurring and currently shown ${periodLabel}. The app converts between monthly and yearly automatically.`
            : 'This line is one-off (paid once) and is not converted by month/year toggle.';
        body.appendChild(el('div', {
            style: 'font-size:12px;color:#334155;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 10px;'
        }, recurringExplain));

        body.appendChild(el('div', {
            style: 'font-size:12px;color:#1e293b;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:8px 10px;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;'
        }, 'Formula: line total = sum of (Qty x Rate) across component rows'));

        card.appendChild(body);
        overlay.appendChild(card);
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    /* ═══════ Average hourly wage lookup (ILO / BLS rough benchmarks, local currency) ═══════ */
    const AVG_WAGE_TABLE = {
        'luxembourg': 28,  // STATEC 2024: median €58,126/yr ÷ 2,080 hrs = €27.94/hr ≈ €28/hr
        'united states': 32, 'united kingdom': 20, 'germany': 28, 'france': 26,
        'brazil': 15, 'china': 40, 'india': 200, 'malaysia': 15,
        'thailand': 100, 'indonesia': 35000, 'mexico': 85, 'japan': 2500,
        'south korea': 22000, 'australia': 42, 'canada': 34, 'singapore': 30,
        'spain': 18, 'italy': 20, 'netherlands': 30, 'poland': 45,
        'turkey': 250, 'south africa': 100, 'saudi arabia': 50, 'uae': 55,
        'philippines': 120, 'vietnam': 55000, 'czech republic': 350,
        'portugal': 14, 'belgium': 28, 'austria': 27, 'switzerland': 48,
        'sweden': 290, 'norway': 380, 'denmark': 300, 'finland': 26,
        'ireland': 28, 'romania': 40, 'hungary': 3200, 'argentina': 4500,
        'colombia': 12000, 'chile': 6500, 'peru': 12, 'egypt': 80,
        'nigeria': 1200, 'kenya': 450, 'ghana': 30, 'pakistan': 450,
        'bangladesh': 120, 'sri lanka': 700
    };
    function lookupAvgWage(country, currency) {
        if (!country) return null;
        const key = country.toLowerCase().trim();
        if (AVG_WAGE_TABLE[key]) return AVG_WAGE_TABLE[key];
        // Fallback by currency
        const fallbacks = { USD: 30, EUR: 25, GBP: 20, BRL: 15, CNY: 40, INR: 200, MYR: 15, THB: 100 };
        return fallbacks[currency] || 25;
    }

    /* ═══════ SVG namespace helper ═══════ */
    function svgEl(tag, attrs) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    /* ═══════ DOM helpers ═══════ */
    function el(tag, attrs, ...children) {
        const e = document.createElement(tag);
        if (attrs) {
            for (const [k, v] of Object.entries(attrs)) {
                if (k === 'className') e.className = v;
                else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
                else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
                else if (k === 'innerHTML') e.innerHTML = v;
                else if (k === 'disabled') e.disabled = !!v;
                else if (k === 'checked') e.checked = !!v;
                else if (k === 'selected') e.selected = !!v;
                else if (k === 'value') e.value = v;
                else e.setAttribute(k, v);
            }
        }
        for (const c of children) {
            if (c == null) continue;
            if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
            else if (Array.isArray(c)) c.forEach(x => x && e.appendChild(x));
            else e.appendChild(c);
        }
        return e;
    }
    function currencySymbol() {
        const s = E.getState();
        const c = E.CURRENCIES.find(x => x.code === s.location.currency);
        return c ? c.symbol : '$';
    }
    function cls(...c) { return c.filter(Boolean).join(' '); }
    function formatNum(n) { if (n == null || isNaN(n)) return '0'; return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
    function toDisplay(v, rec) { if (!rec) return v || 0; return uiState.recurringPeriod === 'month' ? (v || 0) / 12 : (v || 0); }
    function toAnnual(v, rec) { if (!rec) return parseFloat(v) || 0; return uiState.recurringPeriod === 'month' ? (parseFloat(v) || 0) * 12 : (parseFloat(v) || 0); }

    function isDirectMedicalOverlapRow(row) {
        const txt = `${(row && row.label) || ''} ${(row && row.qtyReason) || ''} ${(row && row.source) || ''}`.toUpperCase();
        return /DIRECT MEDICAL|STATUTORY COMPENSATION|TREATMENT COST/.test(txt);
    }

    function normalizeInjuryMedicalBenefitSeparation(s) {
        if (!s || !s.benefits || !s.benefits.items) return;

        const items = s.benefits.items;
        const injuryRaw = Math.max(0, parseFloat(items.injuryCost) || 0);
        const medicalRaw = Math.max(0, parseFloat(items.medical) || 0);
        if (!(injuryRaw > 0 && medicalRaw > 0)) return;

        let overlap = 0;
        const breakdowns = s.benefits.breakdowns || {};
        const injuryRows = Array.isArray(breakdowns.injuryCost) ? breakdowns.injuryCost : [];

        if (injuryRows.length) {
            const keptRows = [];
            injuryRows.forEach((row) => {
                const subtotal = (parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0);
                if (isDirectMedicalOverlapRow(row)) overlap += Math.max(0, subtotal);
                else keptRows.push(row);
            });
            if (overlap > 0) breakdowns.injuryCost = keptRows;
        }

        if (overlap <= 0) {
            const injuryRationale = String((s.benefits.rationales || {}).injuryCost || '').toUpperCase();
            const explicitlyNonMedical = /NON[-\s]?MEDICAL|EXCLUDING DIRECT MEDICAL|EXCLUDES DIRECT MEDICAL|NET OF DIRECT MEDICAL|ALL-IN MINUS DIRECT MEDICAL|MEDICAL HANDLED IN MEDICAL COST SAVINGS|SEPARATE FROM MEDICAL|WITHOUT DIRECT MEDICAL/.test(injuryRationale);
            if (!explicitlyNonMedical && /ALL-IN|ICEBERG|NOT JUST MEDICAL|MEDICAL\s*\+/.test(injuryRationale)) {
                overlap = Math.min(injuryRaw, medicalRaw);
            }
        }

        if (overlap > 0) {
            items.injuryCost = Math.max(0, injuryRaw - overlap);
            s.benefits.rationales = s.benefits.rationales || {};
            if (!/non-medical/i.test(String(s.benefits.rationales.injuryCost || ''))) {
                s.benefits.rationales.injuryCost = `${s.benefits.rationales.injuryCost || ''}\nScope adjustment: Injury Cost Avoidance is treated as non-medical impact only (medical handled in Medical Cost Savings).`.trim();
            }
        }
    }

    /* ═══════ INJECT CSS ONCE ═══════ */
    (function injectCSS() {
        if (document.getElementById('cba-anim-css')) return;
        const style = document.createElement('style');
        style.id = 'cba-anim-css';
        style.textContent = `
            @keyframes cbaFadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
            @keyframes cbaGrow   { from { transform: scaleY(0) } to { transform: scaleY(1) } }
            @keyframes cbaPulse  { 0%,100% { r:7 } 50% { r:10 } }
            @keyframes cbaDraw   { from { stroke-dashoffset: 1000 } to { stroke-dashoffset: 0 } }
            @keyframes cbaBarGrow { from { width:0 } to { width: var(--bar-w) } }
            @keyframes cbaRowSoftIn {
                0%   { opacity: 0; transform: translateY(10px) scale(0.994); background-color: rgba(99,102,241,0.14); box-shadow: inset 0 0 0 1px rgba(99,102,241,0.22); }
                60%  { opacity: 1; transform: translateY(0) scale(1.002); background-color: rgba(99,102,241,0.05); box-shadow: inset 0 0 0 1px rgba(99,102,241,0.14); }
                100% { opacity: 1; transform: translateY(0) scale(1); background-color: transparent; box-shadow: inset 0 0 0 1px rgba(99,102,241,0.00); }
            }
            .cba-fade { animation: cbaFadeIn .45s ease-out both }
            .cba-fade-d1 { animation-delay: .08s }
            .cba-fade-d2 { animation-delay: .16s }
            .cba-fade-d3 { animation-delay: .24s }
            .cba-draw-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: cbaDraw 1.2s ease-out forwards }
            .cba-pulse-dot { animation: cbaPulse 1.6s ease-in-out infinite }
            .cba-bar-grow { animation: cbaBarGrow .6s ease-out forwards }
            .cba-panel { border-radius: 16px; padding: 20px; }
            .cba-cost-panel { background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border: 2px solid #fecaca; }
            .cba-benefit-panel { background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px solid #a7f3d0; }
            .cba-result-panel { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 2px solid #c7d2fe; }
            .cba-input-cost { border: 1.5px solid #fca5a5 !important; }
            .cba-input-cost:focus-within { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important; }
            .cba-input-benefit { border: 1.5px solid #86efac !important; }
            .cba-input-benefit:focus-within { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,.12) !important; }
            .cba-curr-dd { background: white; border: 1.5px solid #94a3b8; border-radius: 8px; padding: 4px 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
            .cba-curr-dd:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); outline: none; }

            /* ── Modern glassmorphic cards ── */
            .cba-item-card {
                background: rgba(255,255,255,0.88);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.6);
                box-shadow: 0 2px 10px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.07);
                padding: 16px 18px;
                transition: all .2s ease;
            }
            .cba-item-card:hover {
                box-shadow: 0 6px 20px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.07);
                transform: translateY(-1px);
            }
            .cba-item-card.cost-card { border-left: 5px solid #ef4444; }
            .cba-item-card.ben-card  { border-left: 5px solid #22c55e; }
            .cba-bkdn-toggle {
                cursor: pointer; user-select: none;
                display: inline-flex; align-items: center; gap: 5px;
                padding: 3px 10px; border-radius: 8px;
                font-size: 12px; font-weight: 600;
                transition: background .15s;
            }
            .cba-bkdn-toggle:hover { background: rgba(0,0,0,0.05); }
            .cba-bkdn-toggle.open {
                background: rgba(59,130,246,0.12);
                border: 1px solid rgba(59,130,246,0.25);
            }
            .cba-bkdn-panel {
                max-height: 0; overflow: hidden; opacity: 0;
                transition: max-height .4s ease, opacity .25s ease, margin .2s ease;
                margin-top: 0;
            }
            .cba-bkdn-panel.open {
                max-height: 2400px; opacity: 1; margin-top: 10px; overflow-x: auto; overflow-y: visible;
            }
            @keyframes cba-spin-svg { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .cba-svg-spinner { animation: cba-spin-svg 0.75s linear infinite; flex-shrink: 0; display: inline-block; vertical-align: middle; }
            .cba-bkdn-row {
                display: grid; grid-template-columns: 1fr 72px 10px 72px 14px 90px 28px;
                gap: 6px; align-items: center; padding: 6px 0;
                border-bottom: 1px dashed rgba(0,0,0,0.06);
                font-size: 13px;
            }
            .cba-bkdn-row-enter { animation: cbaRowSoftIn .4s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
            .cba-bkdn-row:last-child { border-bottom: none; }
            .cba-bkdn-del {
                border: 1px solid #fecaca;
                background: #fff1f2;
                color: #be123c;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 800;
                width: 24px;
                height: 24px;
                line-height: 1;
                cursor: pointer;
            }
            .cba-bkdn-del:hover {
                background: #ffe4e6;
            }
            .cba-bkdn-inp {
                width: 100%; text-align: center; font-size: 13px; font-weight: 600;
                border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px 6px;
                background: rgba(255,255,255,0.9); outline: none;
                transition: border-color .15s, box-shadow .15s;
            }
            .cba-bkdn-inp:focus { border-color: #818cf8; box-shadow: 0 0 0 2px rgba(129,140,248,0.2); }
            .cba-bkdn-src { font-size: 11px; color: #94a3b8; font-style: italic; padding:3px 6px; background:#f8fafc; border-radius:6px; }
            .cba-total-chip {
                display: inline-flex; align-items: center;
                font-size: 15px; font-weight: 800;
                padding: 5px 14px; border-radius: 10px;
                min-width: 80px; justify-content: center;
            }
            .cba-total-chip.cost-chip  { color: #dc2626; background: #fef2f2; }
            .cba-total-chip.ben-chip   { color: #16a34a; background: #f0fdf4; }
            .cba-rationale {
                font-size: 12px; color: #475569; font-style: italic;
                border: 1px solid #e2e8f0; border-radius: 8px;
                width: 100%; outline: none; display: block;
                padding: 7px 10px; margin-top: 6px;
                transition: border-color .2s, background .2s, box-shadow .2s;
                resize: none; min-height: 36px; line-height: 1.6;
                font-family: inherit; overflow: hidden;
            }
            .cba-rationale.cost-rationale {
                background: #fff5f5; border-color: #fca5a5;
            }
            .cba-rationale.ben-rationale {
                background: #f0fdf4; border-color: #86efac;
            }
            .cba-rationale:focus {
                border-color: #818cf8; background: #eef2ff;
                box-shadow: 0 0 0 2px rgba(129,140,248,0.15);
            }
            .cba-rationale::placeholder { color: #c4b5c8; font-style: italic; }
            /* Auto-generated from rows — visually distinct (dimmer, monospace formula look) */
            .cba-rationale.cba-rationale-auto {
                font-style: normal; font-family: 'Courier New', Courier, monospace;
                font-size: 11px; color: #64748b; cursor: default;
                background: repeating-linear-gradient(
                    135deg,
                    transparent,
                    transparent 4px,
                    rgba(0,0,0,0.015) 4px,
                    rgba(0,0,0,0.015) 8px
                );
            }
            .cba-rationale.cba-rationale-auto:focus { outline: none; box-shadow: none; border-color: inherit; background: inherit; }

            /* ── Appendix collapsible ── */
            .cba-appendix-body {
                max-height: 0; overflow: hidden; opacity: 0;
                transition: max-height .4s ease, opacity .3s ease;
            }
            .cba-appendix-body.open {
                max-height: 700px; opacity: 1;
            }
            .cba-term-row { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; transition: background .4s; }
            .cba-term-row:last-child { border-bottom: none; }
            .cba-term-hl { background: #e0e7ff !important; }
            .cba-bkdn-notes {
                margin-top: 10px;
                padding: 12px;
                background: linear-gradient(180deg, rgba(248,250,252,0.94), rgba(241,245,249,0.9));
                border-radius: 12px;
                border: 1px solid #dbeafe;
                font-size: 12px;
                color: #475569;
                font-style: normal;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .cba-bkdn-notes-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding-bottom: 8px;
                border-bottom: 1px dashed #cbd5e1;
            }
            .cba-bkdn-notes-title {
                font-size: 11px;
                font-weight: 800;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: .06em;
            }
            .cba-bkdn-notes-help {
                font-size: 11px;
                color: #64748b;
            }
            .cba-note-item {
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                padding: 10px;
                box-shadow: 0 8px 20px rgba(15,23,42,0.05);
            }
            .cba-note-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 10px;
            }
            .cba-note-badge {
                font-size: 11px;
                font-weight: 800;
                color: #0f766e;
                background: #ecfeff;
                border: 1px solid #99f6e4;
                border-radius: 999px;
                padding: 3px 8px;
                white-space: nowrap;
            }
            .cba-note-title {
                font-size: 12px;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 0;
                font-style: normal;
            }
            .cba-note-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 10px;
            }
            .cba-note-field {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .cba-note-field-wide {
                grid-column: 1 / -1;
            }
            .cba-note-label {
                font-size: 11px;
                font-weight: 700;
                color: #334155;
            }
            .cba-note-inline {
                display: grid;
                grid-template-columns: 1fr;
                gap: 8px;
            }
            .cba-note-mini {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .cba-note-mini-label {
                font-size: 10px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: .03em;
            }
            .cba-note-edit {
                width: 100%;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 7px 9px;
                font-size: 12px;
                color: #334155;
                background: #ffffff;
                resize: vertical;
                font-family: inherit;
                transition: border-color .2s, box-shadow .2s, background .2s;
            }
            .cba-note-edit:focus {
                outline: none;
                border-color: #60a5fa;
                background: #f8fbff;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
            }
            .cba-note-tools {
                display: flex;
                justify-content: flex-end;
                margin-top: 2px;
            }
            .cba-note-sync-btn {
                font-size: 11px;
                font-weight: 700;
                padding: 5px 8px;
                border-radius: 8px;
                border: 1px solid #cbd5e1;
                background: #f8fafc;
                color: #334155;
                cursor: pointer;
                transition: all .2s;
            }
            .cba-note-sync-btn:hover {
                border-color: #93c5fd;
                background: #eff6ff;
                color: #1d4ed8;
            }
            .cba-note-source-link {
                font-size: 11px;
                font-weight: 700;
                color: #1d4ed8;
                text-decoration: none;
                border: 1px solid #bfdbfe;
                background: #eff6ff;
                border-radius: 999px;
                padding: 3px 8px;
                display: inline-flex;
                align-items: center;
            }
            .cba-note-source-link:hover { background:#dbeafe; border-color:#93c5fd; }
            .cba-note-context {
                margin-top: 0;
                font-size: 11px;
                color: #0f766e;
                background: #f0fdfa;
                border: 1px solid #99f6e4;
                border-radius: 6px;
                padding: 6px 8px;
                line-height: 1.4;
                font-style: normal;
            }
            @media (min-width: 900px) {
                .cba-note-grid {
                    grid-template-columns: 1fr 1fr;
                }
                .cba-note-inline {
                    grid-template-columns: 1fr 1fr;
                }
            }
            .cba-term-link {
                color: #4f46e5; font-weight: 600;
                border-bottom: 1px dashed #4f46e5; cursor: pointer;
            }
            .cba-term-link:hover { color: #3730a3; border-bottom-color: #3730a3; }
            .cba-revert-btn { font-size:10px; color:#6366f1; background:#eef2ff; border:1px solid #c7d2fe; border-radius:6px; padding:2px 7px; cursor:pointer; line-height:1.4; white-space:nowrap; flex-shrink:0; transition: all .2s; }
            .cba-revert-btn:hover { background:#e0e7ff; border-color:#a5b4fc; }
            .cba-revert-btn.cba-revert-same { color:#94a3b8; background:#f8fafc; border-color:#e2e8f0; cursor:default; opacity:0.6; }
            .cba-revert-btn.cba-revert-diff { color:#fff; background:#6366f1; border-color:#4f46e5; box-shadow:0 0 0 2px rgba(99,102,241,.25); }
            .cba-revert-btn.cba-revert-diff:hover { background:#4f46e5; }
            .cba-param-help-btn {
                width: 18px; height: 18px;
                border-radius: 999px;
                border: 1px solid #cbd5e1;
                background: #f8fafc;
                color: #475569;
                font-size: 11px;
                font-weight: 800;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                flex-shrink: 0;
            }
            .cba-param-help-btn:hover { background:#eef2ff; border-color:#a5b4fc; color:#4338ca; }
            @keyframes cba-shimmer-slide { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
            @keyframes cba-pulse-border { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.35)} 50%{box-shadow:0 0 0 5px rgba(99,102,241,.0)} }
            .cba-panel-ai-loading {
                position:relative;
                border-color:#818cf8 !important;
                animation: cba-pulse-border 1.6s ease-in-out infinite;
            }
            .cba-panel-ai-loading::after {
                content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
                background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,.07) 40%, rgba(139,92,246,.12) 50%, rgba(99,102,241,.07) 60%, transparent 100%);
                background-size:400px 100%;
                animation: cba-shimmer-slide 1.6s linear infinite;
            }
            .cba-ai-loading-badge {
                display:inline-flex; align-items:center; gap:4px;
                font-size:10px; font-weight:700; color:#6366f1;
                background:#eef2ff; border:1px solid #c7d2fe;
                border-radius:20px; padding:2px 8px; animation: cba-pulse-border 1.6s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    })();

    // ── SVG Spinner helper ──────────────────────────────────────────────────
    function svgSpinner(size, color) {
        size = size || 18; color = color || '#6366f1';
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', size); svg.setAttribute('height', size);
        svg.setAttribute('class', 'cba-svg-spinner');
        const track = document.createElementNS(ns, 'circle');
        track.setAttribute('cx','12'); track.setAttribute('cy','12'); track.setAttribute('r','10');
        track.setAttribute('fill','none'); track.setAttribute('stroke', color + '33'); track.setAttribute('stroke-width','3');
        const arc = document.createElementNS(ns, 'circle');
        arc.setAttribute('cx','12'); arc.setAttribute('cy','12'); arc.setAttribute('r','10');
        arc.setAttribute('fill','none'); arc.setAttribute('stroke', color); arc.setAttribute('stroke-width','3');
        arc.setAttribute('stroke-linecap','round'); arc.setAttribute('stroke-dasharray','36 27');
        svg.appendChild(track); svg.appendChild(arc);
        return svg;
    }

    /* ═══════ RENDER DISPATCHER ═══════ */
    function render() {
        if (!root) return;
        root.innerHTML = '';
        resultsPanel = null;
        let content;
        switch (step) {
            case 'landing':   content = renderLanding(); break;
            case 'risk':      content = renderRiskInput(); break;
            case 'analyze':   content = renderAnalyze(); break;
            case 'compare':   content = renderCompare(); break;
            case 'baselines': content = renderBaselineEditor(); break;
            default:          content = renderLanding();
        }
        root.appendChild(content);
    }

    function renderPreservingView(cardKey, keepPanelOpen) {
        if (!root) return render();

        const selector = cardKey ? `[data-cba-panel-key="${cardKey}"]` : '';
        const beforeEl = selector ? root.querySelector(selector) : null;
        const beforeTop = beforeEl ? beforeEl.getBoundingClientRect().top : null;
        const beforeScrollY = window.scrollY;

        if (cardKey) {
            if (keepPanelOpen) uiState.openCalcPanels[cardKey] = true;
            else delete uiState.openCalcPanels[cardKey];
        }

        uiState.suppressNextAnalyzeFade = true;

        render();

        requestAnimationFrame(() => {
            const afterEl = selector ? root.querySelector(selector) : null;
            if (afterEl && beforeTop != null) {
                const afterTop = afterEl.getBoundingClientRect().top;
                window.scrollTo({ top: window.scrollY + (afterTop - beforeTop) });
            } else {
                window.scrollTo({ top: beforeScrollY });
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       LANDING
       ═══════════════════════════════════════════════════════════════ */
    function renderLanding() {
        const s = E.getState();
        const wrap = el('div', { className: 'space-y-6 cba-fade' });
        wrap.appendChild(el('div', { className: 'text-center space-y-2' },
            el('h3', { className: 'text-2xl font-bold text-slate-900' }, 'ALARP Cost-Benefit Analyzer'),
            el('p', { className: 'text-slate-600 text-sm max-w-2xl mx-auto' },
                'Evaluate whether proposed safety measures are reasonably practicable. The Disproportion Factor scales required benefits by risk severity.')
        ));
        wrap.appendChild(renderLocationBar());
        const grid = el('div', { className: 'grid md:grid-cols-3 gap-6' });
        const importCard = el('div', {
            className: 'cursor-pointer group border-2 border-slate-200 hover:border-indigo-400 rounded-2xl p-6 transition-all hover:shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50',
            onClick: () => startImportMode()
        });
        importCard.appendChild(el('div', { className: 'text-3xl mb-3' }, '📊'));
        importCard.appendChild(el('h4', { className: 'text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition' }, 'Import from Risk Table'));
        importCard.appendChild(el('p', { className: 'text-sm text-slate-600 mt-2' }, 'Select an existing risk row. Hazard, scoring, and image will be pre-filled automatically.'));
        importCard.appendChild(el('span', { className: 'inline-block mt-4 text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full' }, 'Recommended'));
        grid.appendChild(importCard);
        const freshCard = el('div', {
            className: 'cursor-pointer group border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-6 transition-all hover:shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50',
            onClick: () => startFreshMode()
        });
        freshCard.appendChild(el('div', { className: 'text-3xl mb-3' }, '🤖'));
        freshCard.appendChild(el('h4', { className: 'text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition' }, 'Fresh Start with AI'));
        freshCard.appendChild(el('p', { className: 'text-sm text-slate-600 mt-2' }, 'Describe a hazard in plain language. AI will identify risks, suggest controls, and estimate costs.'));
        freshCard.appendChild(el('span', { className: 'inline-block mt-4 text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full' }, 'AI-Powered'));
        grid.appendChild(freshCard);
        // Manual Workflow card
        const manualWorkCard = el('div', {
            className: 'cursor-pointer group border-2 border-slate-200 hover:border-violet-400 rounded-2xl p-6 transition-all hover:shadow-lg bg-gradient-to-br from-violet-50 to-purple-50',
            onClick: () => startManualMode()
        });
        manualWorkCard.appendChild(el('div', { className: 'text-3xl mb-3' }, '✏️'));
        manualWorkCard.appendChild(el('h4', { className: 'text-lg font-bold text-slate-900 group-hover:text-violet-700 transition' }, 'Manual Workflow'));
        manualWorkCard.appendChild(el('p', { className: 'text-sm text-slate-600 mt-2' },
            'Describe the hazard, score it yourself, then fill in the cost & benefit table manually. No AI required — use AI as an optional helper at any step.'));
        manualWorkCard.appendChild(el('span', { className: 'inline-block mt-4 text-xs font-semibold text-violet-700 bg-violet-100 px-3 py-1 rounded-full' }, 'No AI Required'));
        grid.appendChild(manualWorkCard);
        // Manual baseline editor card
        const manualCard = el('div', {
            className: 'cursor-pointer group border-2 border-slate-200 hover:border-amber-400 rounded-2xl p-6 transition-all hover:shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 md:col-span-3',
            onClick: () => { uiState.baselineBackStep = 'landing'; step = 'baselines'; render(); }
        });
        manualCard.appendChild(el('div', { className: 'text-3xl mb-3' }, '📋'));
        manualCard.appendChild(el('h4', { className: 'text-lg font-bold text-slate-900 group-hover:text-amber-700 transition' }, 'Edit Baseline Figures Manually'));
        manualCard.appendChild(el('p', { className: 'text-sm text-slate-600 mt-2' },
            'View and directly edit the Luxembourg OSH benchmark figures — incident rates, medical costs, AAA Bonus-Malus impact, ITM fines, and more — without using AI.'));
        manualCard.appendChild(el('span', { className: 'inline-block mt-4 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full' }, '🇱🇺 Luxembourg Baselines'));
        grid.appendChild(manualCard);
        wrap.appendChild(grid);
        /* Save / Load JSON buttons */
        const ioRow = el('div', { className: 'flex flex-wrap gap-3 justify-center' });
        ioRow.appendChild(el('button', {
            className: 'rab-btn rab-c-blue text-xs',
            onClick: () => {
                const data = E.exportData();
                data._processFrequencyPerWeek = uiState.processFrequencyPerWeek || null;
                data._processTimeMinutesPerTask = uiState.processTimeMinutesPerTask || null;
                data._taskBreakdownMinutes = uiState.taskBreakdownMinutes || 10;
                data._avgHourlyWage = uiState.avgHourlyWage || null;
                data._aiNotes = uiState.aiNotes || '';
                data._recurringPeriod = uiState.recurringPeriod || 'year';
                data._aiModel = uiState.aiModel || 'anthropic/claude-sonnet-4-6';
                data._aiSnapshot = uiState.aiSnapshot ? JSON.parse(JSON.stringify(uiState.aiSnapshot)) : null;
                data._executiveSummary = uiState.executiveSummary ? JSON.parse(JSON.stringify(uiState.executiveSummary)) : null;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CBA_${(data.currentRisk.description || 'analysis').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        }, 'Save Project as JSON'));
        ioRow.appendChild(el('button', {
            className: 'rab-btn rab-c-emerald text-xs',
            onClick: () => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = '.json';
                inp.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const data = JSON.parse(ev.target.result);
                            if (data._processFrequencyPerWeek) uiState.processFrequencyPerWeek = data._processFrequencyPerWeek;
                            if (data._processTimeMinutesPerTask) uiState.processTimeMinutesPerTask = data._processTimeMinutesPerTask;
                            if (data._taskBreakdownMinutes) uiState.taskBreakdownMinutes = data._taskBreakdownMinutes;
                            if (data._avgHourlyWage) uiState.avgHourlyWage = data._avgHourlyWage;
                            if (data._aiNotes !== undefined) uiState.aiNotes = data._aiNotes;
                            if (data._recurringPeriod) uiState.recurringPeriod = data._recurringPeriod;
                            if (data._aiModel) uiState.aiModel = data._aiModel;
                            uiState.executiveSummary = data._executiveSummary || null;
                            if (data._aiSnapshot != null) {
                                uiState.aiSnapshot = data._aiSnapshot;
                            } else if (data.proposedMeasure && data.proposedMeasure.costItems) {
                                // Backward compat: old JSONs without _aiSnapshot — reconstruct from saved values
                                uiState.aiSnapshot = {
                                    costs: Object.assign({}, data.proposedMeasure.costItems || {}),
                                    benefits: Object.assign({}, (data.benefits && data.benefits.items) ? data.benefits.items : {}),
                                    costBreakdowns: data.proposedMeasure.costBreakdowns ? JSON.parse(JSON.stringify(data.proposedMeasure.costBreakdowns)) : {},
                                    benefitBreakdowns: (data.benefits && data.benefits.breakdowns) ? JSON.parse(JSON.stringify(data.benefits.breakdowns)) : {}
                                };
                            }
                            E.importData(data);
                            const sImported = E.getState();
                            normalizeRiskState(sImported.currentRisk);
                            normalizeRiskState(sImported.projectedRisk);
                            uiState.locationDetected = !!data.location && !!data.location.country;
                            // Navigate to analysis page if data has a measure, else risk input
                            step = data.proposedMeasure && data.proposedMeasure.description ? 'analyze' : 'risk';
                            render();
                        } catch (err) { alert('Invalid JSON file: ' + err.message); }
                    };
                    reader.readAsText(file);
                });
                inp.click();
            }
        }, 'Load Project from JSON'));
        wrap.appendChild(ioRow);
        if (s.measures.length > 0) wrap.appendChild(renderMeasureHistory());
        return wrap;
    }

    function renderLocationBar() {
        const s = E.getState();
        const bar = el('div', { className: 'flex flex-wrap items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200' });
        bar.appendChild(el('span', { className: 'text-sm font-semibold text-blue-800' },
            '🇱🇺 Luxembourg — AAA / MDE / ITM framework (2024–2025)'));
        bar.appendChild(el('span', { className: 'text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-lg' },
            '€ EUR · AAA base rate 0.70% · STATEC median wage €28/hr'));
        return bar;
    }

    function buildCurrencyDropdown() {
        const s = E.getState();
        const sel = el('select', {
            className: 'cba-curr-dd',
            onChange: (ev) => { s.location.currency = ev.target.value; render(); }
        });
        E.CURRENCIES.forEach(c => {
            const opt = el('option', { value: c.code }, `${c.symbol}  ${c.code} — ${c.name}`);
            if (c.code === s.location.currency) opt.selected = true;
            sel.appendChild(opt);
        });
        return sel;
    }

    /* ═══════ MODE ENTRY ═══════ */
    function startImportMode() {
        const rows = E.getTableRows();
        if (rows.length === 0) { alert('No rows in risk table. Use "Fresh Start with AI" or "Manual Workflow".'); return; }
        uiState.selectedRow = null; step = 'risk'; E.getState().mode = 'import'; render();
    }
    function startFreshMode() { E.getState().mode = 'fresh'; uiState.freshDescription = ''; uiState.executiveSummary = null; step = 'risk'; render(); }
    function startManualMode() {
        const s = E.getState();
        s.mode = 'manual';
        uiState.freshDescription = '';
        uiState.executiveSummary = null;
        // Pre-compute default score so the editor is shown immediately
        if (s.currentRisk.score === null) {
            s.currentRisk.frequency = RISK_SCALE_OPTIONS.frequency[0].value;
            s.currentRisk.severity = RISK_SCALE_OPTIONS.severity[0].value;
            s.currentRisk.likelihood = RISK_SCALE_OPTIONS.likelihood[0].value;
            normalizeRiskState(s.currentRisk);
        }
        step = 'risk'; render();
    }

    /* ═══════════════════════════════════════════════════════════════
       STEP 1: RISK INPUT
       ═══════════════════════════════════════════════════════════════ */
    function renderRiskInput() {
        const s = E.getState();
        const noFade = !!uiState.suppressNextRiskFade;
        uiState.suppressNextRiskFade = false;
        const wrap = el('div', { className: noFade ? 'space-y-6' : 'space-y-6 cba-fade' });
        wrap.appendChild(renderStepHeader('Step 1 — Define the Risk', 'landing'));
        if (s.mode === 'import')  wrap.appendChild(renderImportPicker());
        else if (s.mode === 'manual') wrap.appendChild(renderManualStart());
        else wrap.appendChild(renderFreshStart());
        return wrap;
    }

    function renderImportPicker() {
        const rows = E.getTableRows();
        const container = el('div', { className: 'space-y-4' });
        container.appendChild(el('p', { className: 'text-sm text-slate-600' }, 'Select a risk row from your assessment table:'));
        const list = el('div', { className: 'space-y-2 max-h-72 overflow-y-auto' });
        rows.forEach(r => {
            const isSel = uiState.selectedRow === r.index;
            const item = el('div', {
                className: cls('flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all', isSel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'),
                onClick: () => { uiState.selectedRow = r.index; E.importFromTable(r.index); render(); }
            });
            item.appendChild(el('span', { className: 'text-xs font-bold text-white px-2 py-0.5 rounded', style: { backgroundColor: E.getRiskColor(r.category) } }, r.category || '—'));
            item.appendChild(el('span', { className: 'text-sm font-semibold text-slate-700' }, `Score: ${r.score}`));
            item.appendChild(el('span', { className: 'flex-1 text-sm text-slate-600 truncate' }, r.step));
            list.appendChild(item);
        });
        container.appendChild(list);
        if (uiState.selectedRow !== null) {
            container.appendChild(renderCurrentRiskSummary());
            container.appendChild(el('div', { className: 'flex justify-end' },
                el('button', { className: 'rab-btn rab-c-emerald', onClick: () => { step = 'analyze'; render(); } }, 'Continue → Analyze Measure')
            ));
        }
        return container;
    }

    function renderFreshStart() {
        const s = E.getState();
        const container = el('div', { className: 'space-y-4' });
        container.appendChild(el('label', { className: 'block text-sm font-semibold text-slate-700' }, 'Describe the hazard scenario in your own words:'));
        const ta = el('textarea', {
            className: 'w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none', rows: '4',
            placeholder: 'e.g., Workers using angle grinders near flammable solvents without local exhaust ventilation.'
        });
        ta.value = uiState.freshDescription;
        ta.addEventListener('input', (e) => { uiState.freshDescription = e.target.value; });
        container.appendChild(ta);
        container.appendChild(renderModelSelector());
        if (uiState.aiError) container.appendChild(el('div', { className: 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3' }, uiState.aiError));
        const btnRow = el('div', { className: 'flex items-center gap-3' });
        const analyzeBtn = el('button', {
            className: 'rab-btn rab-c-blue', disabled: uiState.aiLoading,
            onClick: async () => {
                if (!uiState.freshDescription.trim()) { alert('Please describe the hazard.'); return; }
                uiState.aiLoading = true; uiState.aiError = null; render();
                try {
                    const locStr = s.location.country ? `${s.location.region ? s.location.region + ', ' : ''}${s.location.country}` : '';
                    const analysis = await A.analyzeRiskDescription(uiState.freshDescription, locStr, uiState.aiModel);
                    s.currentRisk.description = uiState.freshDescription;
                    s.currentRisk.hazards = analysis.hazards || [];
                    s.currentRisk.frequency = normalizeScaleValue('frequency', analysis.frequency, s.currentRisk.frequency || 1);
                    s.currentRisk.severity = normalizeScaleValue('severity', analysis.severity, s.currentRisk.severity || 1);
                    s.currentRisk.likelihood = normalizeScaleValue('likelihood', analysis.likelihood, s.currentRisk.likelihood || 1);
                    normalizeRiskState(s.currentRisk);
                    s.currentRisk._suggestedMeasures = analysis.suggestedMeasures || [];
                    uiState.aiLoading = false; render();
                } catch (e) { uiState.aiLoading = false; uiState.aiError = e.message; render(); }
            }
        });
        if (uiState.aiLoading) {
            analyzeBtn.appendChild(svgSpinner(16, '#fff'));
            analyzeBtn.appendChild(document.createTextNode(' Analyzing…'));
        } else {
            analyzeBtn.appendChild(document.createTextNode('🤖 Analyze with AI'));
        }
        btnRow.appendChild(analyzeBtn);
        if (uiState.aiLoading) {
            const spinRow = el('span', { className: 'flex items-center gap-2 text-xs text-slate-500' });
            spinRow.appendChild(svgSpinner(14, '#6366f1'));
            spinRow.appendChild(document.createTextNode(' AI is analyzing your hazard…'));
            btnRow.appendChild(spinRow);
        }
        container.appendChild(btnRow);
        if (s.currentRisk.score !== null && s.mode === 'fresh') {
            container.appendChild(renderCurrentRiskSummary());
            if (s.currentRisk._suggestedMeasures && s.currentRisk._suggestedMeasures.length > 0) {
                const sugBox = el('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2' });
                sugBox.appendChild(el('h5', { className: 'font-semibold text-emerald-800 text-sm' }, '🤖 AI-Suggested Control Measures:'));
                s.currentRisk._suggestedMeasures.forEach(m => {
                    const item = el('div', {
                        className: 'flex items-start gap-2 p-2 bg-white rounded-lg border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition',
                        onClick: () => { s.proposedMeasure.description = m.description; s.proposedMeasure.controlLevel = m.controlLevel; step = 'analyze'; render(); }
                    });
                    item.appendChild(el('span', { className: 'text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded flex-shrink-0' }, `L${m.controlLevel}`));
                    item.appendChild(el('div', {}, el('p', { className: 'text-sm font-medium text-slate-800' }, m.description), el('p', { className: 'text-xs text-slate-500 mt-0.5' }, m.rationale || '')));
                    sugBox.appendChild(item);
                });
                container.appendChild(sugBox);
            }
            container.appendChild(renderRiskScoreEditor());
            container.appendChild(el('div', { className: 'flex justify-end' },
                el('button', { className: 'rab-btn rab-c-emerald', onClick: () => { step = 'analyze'; render(); } }, 'Continue → Analyze Measure')
            ));
        }
        return container;
    }

    /* ═══════════════════════════════════════════════════════════════
       MANUAL WORKFLOW — Step 1
       Description + instant scoring + optional AI assist
       ═══════════════════════════════════════════════════════════════ */
    function renderManualStart() {
        const s = E.getState();
        const container = el('div', { className: 'space-y-4' });

        // Mode banner
        const banner = el('div', { className: 'flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl' });
        banner.appendChild(el('span', { className: 'text-2xl flex-shrink-0' }, '✏️'));
        const bannerText = el('div', { className: 'text-sm text-violet-800' });
        bannerText.appendChild(el('b', {}, 'Manual Workflow '));
        bannerText.appendChild(document.createTextNode(
            '— No AI required. Type the hazard description, set the three risk scores using the dropdowns, then continue directly to the cost & benefit table. AI is available as an optional helper at any step.'
        ));
        banner.appendChild(bannerText);
        container.appendChild(banner);

        // Description
        container.appendChild(el('label', { className: 'block text-sm font-semibold text-slate-700' }, 'Hazard description:'));
        const ta = el('textarea', {
            className: 'w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-400 outline-none resize-none',
            rows: '3',
            placeholder: 'e.g., Workers operating counterbalance forklifts in a shared pedestrian walkway in the loading bay…'
        });
        ta.value = s.currentRisk.description || uiState.freshDescription || '';
        ta.addEventListener('input', (e) => {
            uiState.freshDescription = e.target.value;
            s.currentRisk.description = e.target.value;
        });
        container.appendChild(ta);

        // Risk scoring — always visible in manual mode
        container.appendChild(renderCurrentRiskSummary());
        container.appendChild(renderRiskScoreEditor());

        // Optional AI assist — collapsible
        const aiDetails = el('details', { className: 'bg-slate-50 border border-slate-200 rounded-xl overflow-hidden' });
        const aiSummary = el('summary', {
            className: 'cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600 select-none list-none flex items-center gap-2'
        });
        aiSummary.appendChild(el('span', {}, '🤖'));
        aiSummary.appendChild(el('span', {}, 'Optional: Use AI to suggest scores & control measures'));
        aiSummary.appendChild(el('span', { className: 'ml-auto text-slate-400 text-[10px] font-normal italic' }, '(click to expand)'));
        aiDetails.appendChild(aiSummary);

        const aiBody = el('div', { className: 'px-4 pb-4 pt-2 space-y-3 border-t border-slate-200' });
        aiBody.appendChild(renderModelSelector());

        if (uiState.aiError) {
            aiBody.appendChild(el('div', { className: 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3' }, uiState.aiError));
        }

        const aiAssistBtn = el('button', {
            className: 'rab-btn rab-c-blue text-sm',
            disabled: uiState.aiLoading,
            onClick: async () => {
                if (!s.currentRisk.description.trim()) { alert('Please describe the hazard first.'); return; }
                uiState.aiLoading = true; uiState.aiError = null; render();
                // Re-open the details panel after re-render
                try {
                    const locStr = s.location.country
                        ? `${s.location.region ? s.location.region + ', ' : ''}${s.location.country}` : '';
                    const analysis = await A.analyzeRiskDescription(s.currentRisk.description, locStr, uiState.aiModel);
                    s.currentRisk.hazards = analysis.hazards || [];
                    s.currentRisk.frequency    = normalizeScaleValue('frequency', analysis.frequency, s.currentRisk.frequency);
                    s.currentRisk.severity     = normalizeScaleValue('severity', analysis.severity, s.currentRisk.severity);
                    s.currentRisk.likelihood   = normalizeScaleValue('likelihood', analysis.likelihood, s.currentRisk.likelihood);
                    normalizeRiskState(s.currentRisk);
                    s.currentRisk._suggestedMeasures = analysis.suggestedMeasures || [];
                    uiState.aiLoading = false; render();
                } catch (e) { uiState.aiLoading = false; uiState.aiError = e.message; render(); }
            }
        });
        if (uiState.aiLoading) {
            aiAssistBtn.appendChild(svgSpinner(16, '#fff'));
            aiAssistBtn.appendChild(document.createTextNode(' Analyzing…'));
        } else {
            aiAssistBtn.appendChild(document.createTextNode('🤖 Get AI Score Suggestions'));
        }
        aiBody.appendChild(aiAssistBtn);

        // AI-suggested control measures (shown after AI runs)
        if (s.currentRisk._suggestedMeasures && s.currentRisk._suggestedMeasures.length > 0) {
            const sugBox = el('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 mt-2' });
            sugBox.appendChild(el('h5', { className: 'font-semibold text-emerald-800 text-sm' }, '🤖 AI-Suggested Control Measures (click to pre-fill):'));
            s.currentRisk._suggestedMeasures.forEach(m => {
                const item = el('div', {
                    className: 'flex items-start gap-2 p-2 bg-white rounded-lg border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition',
                    onClick: () => { s.proposedMeasure.description = m.description; s.proposedMeasure.controlLevel = m.controlLevel; step = 'analyze'; render(); }
                });
                item.appendChild(el('span', { className: 'text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded flex-shrink-0' }, `L${m.controlLevel}`));
                item.appendChild(el('div', {},
                    el('p', { className: 'text-sm font-medium text-slate-800' }, m.description),
                    el('p', { className: 'text-xs text-slate-500 mt-0.5' }, m.rationale || '')
                ));
                sugBox.appendChild(item);
            });
            aiBody.appendChild(sugBox);
        }

        aiDetails.appendChild(aiBody);
        container.appendChild(aiDetails);

        // Continue button
        container.appendChild(el('div', { className: 'flex justify-end pt-2' },
            el('button', {
                className: 'rab-btn rab-c-violet',
                onClick: () => {
                    if (!s.currentRisk.description.trim()) { alert('Please describe the hazard first.'); return; }
                    step = 'analyze'; render();
                }
            }, 'Continue → Cost & Benefit Table →')
        ));

        return container;
    }

    function renderModelSelector() {
        const row = el('div', { className: 'flex items-center gap-2' });
        row.appendChild(el('label', { className: 'text-xs font-semibold text-slate-500 whitespace-nowrap' }, 'AI Model:'));
        const sel = el('select', { className: 'text-xs border border-slate-300 rounded px-2 py-1 bg-white flex-1 max-w-xs', onChange: (e) => { uiState.aiModel = e.target.value; } });
        AI_MODELS.forEach(m => { const opt = el('option', { value: m.value }, m.label); if (m.value === uiState.aiModel) opt.selected = true; sel.appendChild(opt); });
        row.appendChild(sel);
        return row;
    }

    function renderCurrentRiskSummary() {
        const s = E.getState();
        const cat = s.currentRisk.category; const color = E.getRiskColor(cat); const bg = E.getRiskBg(cat); const df = E.getDisproportionFactor(s.currentRisk.score);
        const fEntry = getScaleEntry('frequency', s.currentRisk.frequency);
        const sEntry = getScaleEntry('severity', s.currentRisk.severity);
        const lEntry = getScaleEntry('likelihood', s.currentRisk.likelihood);
        const scoreText = formatScaleValue(s.currentRisk.score || 0);
        const box = el('div', { className: 'rounded-xl border-2 p-3 cba-fade', style: { borderColor: color, backgroundColor: bg } });
        const header = el('div', { className: 'flex items-center gap-3 flex-wrap' });
        header.appendChild(el('span', { className: 'text-xl font-black', style: { color } }, scoreText));
        header.appendChild(el('span', { className: 'text-xs font-bold text-white px-2 py-0.5 rounded', style: { backgroundColor: color } }, cat));
        header.appendChild(el('span', { className: 'text-xs text-slate-600' }, `F=${formatScaleValue(s.currentRisk.frequency)} (${fEntry ? fEntry.label : ''}) × S=${formatScaleValue(s.currentRisk.severity)} (${sEntry ? sEntry.label : ''}) × L=${formatScaleValue(s.currentRisk.likelihood)} (${lEntry ? lEntry.label : ''})`));
        header.appendChild(el('span', { className: 'ml-auto text-xs font-semibold', style: { color } }, `DF: ×${df.factor}`));
        box.appendChild(header);
        if (s.currentRisk.description) box.appendChild(el('p', { className: 'text-xs text-slate-600 mt-2' }, s.currentRisk.description));
        if (s.currentRisk.hazards && s.currentRisk.hazards.length > 0) {
            const tags = el('div', { className: 'flex flex-wrap gap-1 mt-1' });
            s.currentRisk.hazards.forEach(h => tags.appendChild(el('span', { className: 'text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full' }, `${h.group}: ${h.name}`)));
            box.appendChild(tags);
        }
        return box;
    }

    function renderRiskScoreEditor() {
        const s = E.getState();
        const container = el('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3' });
        container.appendChild(el('h5', { className: 'text-sm font-semibold text-slate-700' }, '✏️ Adjust Risk Scoring:'));
        const grid = el('div', { className: 'grid grid-cols-3 gap-3' });
        ['frequency', 'severity', 'likelihood'].forEach(field => {
            const grp = el('div', {});
            grp.appendChild(el('label', { className: 'text-xs font-medium text-slate-600 block mb-1' }, field.charAt(0).toUpperCase() + field.slice(1)));
            const sel = el('select', {
                className: 'w-full text-sm border border-slate-300 rounded px-2 py-1',
                onChange: (e) => {
                    s.currentRisk[field] = normalizeScaleValue(field, parseFloat(e.target.value), s.currentRisk[field]);
                    normalizeRiskState(s.currentRisk);
                    uiState.suppressNextRiskFade = true;
                    render();
                }
            });
            const currentVal = normalizeScaleValue(field, s.currentRisk[field], (RISK_SCALE_OPTIONS[field] || [])[0]?.value || 1);
            (RISK_SCALE_OPTIONS[field] || []).forEach((optData) => {
                const opt = el('option', { value: String(optData.value), title: optData.definition }, `${formatScaleValue(optData.value)} — ${optData.label}`);
                if (currentVal === optData.value) opt.selected = true;
                sel.appendChild(opt);
            });
            grp.appendChild(sel); grid.appendChild(grp);
        });
        container.appendChild(grid);

        const defs = el('details', { className: 'bg-white border border-slate-200 rounded-lg p-3' });
        defs.appendChild(el('summary', { className: 'cursor-pointer text-xs font-semibold text-slate-700' }, 'Show Standard F/S/L Definitions'));
        const defsWrap = el('div', { className: 'mt-2 space-y-2' });
        ['frequency', 'severity', 'likelihood'].forEach((field) => {
            const block = el('div', { className: 'border border-slate-100 rounded-md p-2 bg-slate-50' });
            block.appendChild(el('div', { className: 'text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide' }, field));
            (RISK_SCALE_OPTIONS[field] || []).forEach((row) => {
                block.appendChild(el('div', { className: 'text-[11px] text-slate-600 leading-5' }, `${formatScaleValue(row.value)} — ${row.label}: ${row.definition}`));
            });
            defsWrap.appendChild(block);
        });
        defs.appendChild(defsWrap);
        container.appendChild(defs);
        return container;
    }

    /* ── Term-linking helpers for breakdown sources ── */
    function termIdForSource(text) {
        if (!text) return null;
        const u = text.toUpperCase();
        if (u.includes('AAA')) return 'cba-term-aaa';
        if (u.includes('MDE') || u.includes('LOHNFORTZAHLUNG')) return 'cba-term-mde';
        if (u.includes('ITM')) return 'cba-term-itm';
        if (u.includes('STATEC')) return 'cba-term-statec';
        if (u.includes('ISSA') || u.includes('ROP')) return 'cba-term-issa-return-on-prevention-rop';
        if (u.includes('BLS') || u.includes('DAFW')) return 'cba-term-bls';
        if (u.includes('OSHA'))                      return 'cba-term-osha';
        if (u.includes('HSE') || u.includes('R2P2')) return 'cba-term-hse';
        if (u.includes('ALARP'))                     return 'cba-term-alarp';
        if (u.includes('LWC') || u.includes('WORKDAY')) return 'cba-term-lost-workday-cases-lwc';
        return null;
    }
    function sourceUrlForText(sourceText, explicitUrl) {
        if (explicitUrl) return explicitUrl;
        const u = String(sourceText || '').toUpperCase();
        if (u.includes('BONUS-MALUS') || u.includes('BASE RATE')) return SOURCE_URLS.AAA_BONUS;
        if (u.includes('AAA')) return SOURCE_URLS.AAA_REPORT;
        if (u.includes('MDE') || u.includes('LOHNFORTZAHLUNG') || u.includes('CNS')) return SOURCE_URLS.MDE_AFFILIATION;
        if (u.includes('ITM')) return SOURCE_URLS.ITM_REPORT_PDF;
        if (u.includes('STATEC')) return SOURCE_URLS.STATEC_PORTAL;
        if (u.includes('ISSA') || u.includes('ROP')) return SOURCE_URLS.ISSA_ROP;
        return '';
    }
    function scrollToAppendixTerm(termId) {
        const target = document.getElementById(termId);
        if (!target) return;
        const body = document.querySelector('.cba-appendix-body');
        if (body && !body.classList.contains('open')) {
            body.classList.add('open');
            const arrow = document.querySelector('.cba-appendix-arrow');
            if (arrow) arrow.textContent = '▾';
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('cba-term-hl');
        setTimeout(() => target.classList.remove('cba-term-hl'), 2500);
    }

    function parseQtyReasonBlocks(reasonText) {
        const raw = String(reasonText || '').replace(/\s+/g, ' ').trim();
        const out = { definition: '', basis: '', parameters: '', formula: '' };
        if (!raw) return out;

        const pKey = 'Parameters used:';
        const fKey = 'Formula =';
        const pIdx = raw.indexOf(pKey);

        if (pIdx >= 0) {
            out.basis = raw.slice(0, pIdx).replace(/^Audit basis:\s*/i, '').trim().replace(/[;\s]+$/, '');
            const tail = raw.slice(pIdx + pKey.length).trim();
            const fIdx = tail.indexOf(fKey);
            if (fIdx >= 0) {
                out.parameters = tail.slice(0, fIdx).trim().replace(/^[;\s]+|[;\s]+$/g, '');
                out.formula = tail.slice(fIdx).trim();
            } else {
                out.parameters = tail.trim().replace(/^[;\s]+|[;\s]+$/g, '');
            }
        } else {
            const fIdx = raw.indexOf(fKey);
            if (fIdx >= 0) {
                out.basis = raw.slice(0, fIdx).replace(/^Audit basis:\s*/i, '').trim().replace(/[;\s]+$/, '');
                out.formula = raw.slice(fIdx).trim();
            } else {
                out.basis = raw.replace(/^Audit basis:\s*/i, '').trim();
            }
        }

        if (out.formula && !/^Formula/i.test(out.formula)) out.formula = `Formula = ${out.formula}`;
        return out;
    }

    function autoParametersFromRow(row, sym) {
        const qty = Math.max(0, Number(row && row.qty) || 0);
        const rate = Math.max(0, Number(row && row.rate) || 0);
        const unit = String((row && row.unit) || 'unit').trim();
        return `Qty = ${formatNum(qty)}; Rate = ${(sym || currencySymbol())}${formatNum(rate)} per ${unit}`;
    }

    function getRowQtyNoteParts(row, sym) {
        const parsed = parseQtyReasonBlocks(row && row.qtyReason ? row.qtyReason : '');
        const note = (row && row.noteDetails && typeof row.noteDetails === 'object') ? row.noteDetails : {};
        const autoParams = note.autoParams !== false;
        const definition = String(note.definition || (row && row.label) || '').trim();
        const basis = String(note.basis || parsed.basis || '').trim();
        const formula = String(note.formula || parsed.formula || '').replace(/^Formula\s*=\s*/i, '').trim() || 'Qty x Rate';
        let parameters = String(note.parameters || parsed.parameters || '').trim();
        if (autoParams || !parameters) parameters = autoParametersFromRow(row || {}, sym);
        return { definition, basis, parameters, formula, autoParams };
    }

    function syncRowQtyReasonFromNote(row, sym) {
        if (!row) return;
        const note = getRowQtyNoteParts(row, sym);
        row.noteDetails = Object.assign({}, row.noteDetails || {}, note);
        const parts = [];
        if (note.basis) parts.push(`Audit basis: ${note.basis}`);
        if (note.parameters) parts.push(`Parameters used: ${note.parameters}`);
        if (note.formula) parts.push(`Formula = ${note.formula}`);
        row.qtyReason = parts.join('; ');
    }

    function getSourceContextLines(sourceText, reasonText) {
        const combined = `${sourceText || ''} ${reasonText || ''}`.toUpperCase();
        const lines = [];
        if (combined.includes('AAA')) lines.push('AAA = Association d\'Assurance Accident (Luxembourg workplace accident insurer).');
        if (combined.includes('ITM')) lines.push('ITM = Inspection du Travail et des Mines (Luxembourg labour inspectorate).');
        if (combined.includes('MDE')) lines.push('MDE = Mutualité des Employeurs (Luxembourg employer salary-continuation mutual).');
        if (combined.includes('STATEC')) lines.push('STATEC = Luxembourg national statistics institute (wage and labour benchmarks).');
        return lines;
    }

    function inferSourceChipLabel(sourceText, sourceUrl, preferredLabel) {
        const custom = String(preferredLabel || '').trim();
        if (custom && !/^source$/i.test(custom)) return custom.slice(0, 24);

        const textU = String(sourceText || '').toUpperCase();
        const urlU = String(sourceUrl || '').toUpperCase();
        const combined = `${textU} ${urlU}`;

        if (combined.includes('AAA') || combined.includes('AAA.PUBLIC.LU')) return 'AAA';
        if (combined.includes('ITM') || combined.includes('ITM.PUBLIC.LU')) return 'ITM';
        if (combined.includes('MDE') || combined.includes('MDE.PUBLIC.LU')) return 'MDE';
        if (combined.includes('STATEC') || combined.includes('STATISTIQUES.PUBLIC.LU')) return 'STATEC';
        if (combined.includes('ISSA') || combined.includes('ISSA.INT') || combined.includes('BRITSAFE')) return 'ISSA';
        if (/\bREPORT\b|\bRAPPORT\b|\bANNUAL\b/.test(combined)) return 'Report';
        if (combined.includes('BASELINE')) return 'Baseline';
        return 'Source';
    }

    function parseNumericTextToValue(rawText) {
        let t = String(rawText || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, '')
            .replace(/[€$£]/g, '')
            .trim();
        if (!t) return 0;

        t = t.replace(/[;:,)\]]+$/, '');
        const hasComma = t.includes(',');
        const hasDot = t.includes('.');

        if (hasComma && hasDot) {
            if (t.lastIndexOf(',') > t.lastIndexOf('.')) {
                // European format: 6.500,00 -> 6500.00
                t = t.replace(/\./g, '').replace(',', '.');
            } else {
                // US/UK format: 6,500.00 -> 6500.00
                t = t.replace(/,/g, '');
            }
        } else if (hasComma && !hasDot) {
            const fracLen = t.length - t.lastIndexOf(',') - 1;
            if (fracLen === 3 || fracLen === 0) t = t.replace(/,/g, '');
            else t = t.replace(',', '.');
        }

        t = t.replace(/[^0-9.-]/g, '');
        const n = parseFloat(t);
        return isFinite(n) && n > 0 ? n : 0;
    }

    function extractSuggestedDisplayValueFromRationale(rationaleText) {
        const text = String(rationaleText || '');
        const patterns = [
            /(?:^|\n)\s*(?:value|estimated\s+value|valeur|wert)\s*[:=]\s*(?:[A-Z]{3}\s*)?[€$£]?\s*([-+]?[0-9][0-9\s.,]*)/im,
            /(?:^|\n)\s*(?:non[-\s]?medical[^\n]*?)\s*[:=]\s*(?:[A-Z]{3}\s*)?[€$£]?\s*([-+]?[0-9][0-9\s.,]*)/im
        ];

        for (const p of patterns) {
            const m = text.match(p);
            if (m && m[1]) {
                const v = parseNumericTextToValue(m[1]);
                if (v > 0) return v;
            }
        }
        return 0;
    }

    /* ── Generate a human-readable rationale formula from structured row data ── */
    function generateRationaleFromRows(rows, sym) {
        if (!Array.isArray(rows) || rows.length === 0) return '';
        const parts = rows.map(r => {
            const qty  = Number(r.qty)  || 0;
            const rate = Number(r.rate) || 0;
            // Prefer the full noteDetails.definition over the possibly-abbreviated label
            const label = String((r.noteDetails && r.noteDetails.definition) || r.label || 'Component').trim();
            if (qty === 1) {
                return `${label} (${sym}${Math.round(rate).toLocaleString()})`;
            }
            return `${label} (${qty} × ${sym}${Math.round(rate).toLocaleString()})`;
        });
        const total = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
        let text = parts.join('\n+ ') + `\n= ${sym}${Math.round(total).toLocaleString()}`;
        const sources = [...new Set(rows.map(r => r.source).filter(Boolean))];
        if (sources.length) text += `\nSource: ${sources.join('; ')}`;
        return text;
    }

    function splitRationaleIntoBreakdownRows(cat, rationaleText, sym) {
        const text = String(rationaleText || '').trim();
        if (!text) return [];

        // Search all lines for a compound expression (must contain at least two `+` separated segments each ending with a currency amount)
        const lines = text.split(/\r?\n/);
        let expr = '';
        for (const line of lines) {
            let candidate = line.split(/\bSource\s*:/i)[0] || '';
            if (candidate.includes('=')) candidate = candidate.split('=')[0];
            candidate = candidate.trim();
            // Must have at least one `+` AND at least two segments that each end with a euro/dollar amount
            if (!candidate.includes('+')) continue;
            const segments = candidate.split('+');
            const withAmount = segments.filter(seg => /[€$£]\s*[0-9][\d\s.,]*\s*$/.test(seg.trim()) || /[0-9][\d\s.,]*\s*$/.test(seg.trim()));
            if (withAmount.length >= 2) { expr = candidate; break; }
        }
        if (!expr) return [];

        const sourceMeta = extractRationaleSourceMeta(text, []);
        const unit = cat && cat.recurring
            ? (uiState.recurringPeriod === 'month' ? 'per month' : 'per year')
            : 'one-off';

        const rows = [];
        const parts = expr.split('+').map(p => String(p || '').trim()).filter(Boolean);
        parts.forEach((part, i) => {
            const amountMatch = part.match(/(?:[A-Z]{3}\s*)?[€$£]?\s*([0-9][0-9\s.,]*)\s*$/i);
            if (!amountMatch || !amountMatch[1]) return;

            const rate = parseNumericTextToValue(amountMatch[1]);
            if (!(rate > 0)) return;

            let label = part.slice(0, amountMatch.index).trim();
            label = label.replace(/[\s,:;\-–—]+$/, '').trim();
            if (!label) label = `Component ${i + 1}`;

            const row = {
                label,
                qty: 1,
                qtyReason: `Split from rationale line item: ${label}.`,
                rate,
                unit,
                source: sourceMeta.sourceText || 'Manual user split',
                sourceUrl: sourceMeta.sourceUrl || '',
                noteDetails: {
                    definition: label,
                    basis: `Split automatically from rationale expression so each component can be fine-tuned independently.`,
                    parameters: '',
                    formula: 'Qty x Rate',
                    autoParams: true
                }
            };
            syncRowQtyReasonFromNote(row, sym || currencySymbol());
            rows.push(row);
        });

        return rows.length >= 2 ? rows : [];
    }

    function extractRationaleSourceMeta(rationaleText, fallbackRows) {
        const lines = String(rationaleText || '').split(/\r?\n/).map(s => String(s || '').trim()).filter(Boolean);
        const rows = Array.isArray(fallbackRows) ? fallbackRows : [];

        let sourceText = '';
        let sourceLabel = 'Source';
        let sourceUrl = '';

        lines.forEach((line) => {
            const srcMatch = line.match(/^Source:\s*(.+)$/i);
            if (srcMatch && !sourceText) sourceText = srcMatch[1].trim();

            const linkMatch = line.match(/^Source link:\s*(.+)$/i);
            if (!linkMatch) return;
            const raw = String(linkMatch[1] || '').trim();
            if (!raw) return;

            const md = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
            if (md) {
                sourceLabel = md[1] || 'Source';
                sourceUrl = md[2] || sourceUrl;
                return;
            }

            const bare = raw.match(/^(https?:\/\/\S+)$/i);
            if (bare) {
                sourceLabel = 'Source';
                sourceUrl = bare[1] || sourceUrl;
                return;
            }

            sourceLabel = raw || sourceLabel;
        });

        if (!sourceText) {
            const rowWithSource = rows.find((r) => r && r.source);
            if (rowWithSource) sourceText = rowWithSource.source;
        }

        if (!sourceUrl) {
            const rowWithUrl = rows.find((r) => r && r.sourceUrl);
            if (rowWithUrl) sourceUrl = rowWithUrl.sourceUrl;
        }

        if (!sourceUrl) sourceUrl = sourceUrlForText(sourceText, '');

        return {
            sourceText: sourceText || '',
            sourceLabel: inferSourceChipLabel(sourceText, sourceUrl, sourceLabel),
            sourceUrl: sourceUrl || ''
        };
    }

    /* ─── Glassmorphic item card with expandable breakdown calculations ─── */
    function buildItemCard(cat, type, s, sym, periodLabel) {
        const isCost = type === 'cost';
        const panelKey = `${type}:${cat.key}`;
        const items = isCost ? s.proposedMeasure.costItems : s.benefits.items;
        const rationales = isCost ? (s.proposedMeasure.costRationales || {}) : (s.benefits.rationales || {});
        const breakdowns = isCost ? (s.proposedMeasure.costBreakdowns || {}) : (s.benefits.breakdowns || {});

        // ── Auto-upgrade: if only the old generic fallback rows exist, silently replace
        //    with the rich template rows so users don't need to manually clear + re-calc.
        if (
            breakdowns[cat.key] && breakdowns[cat.key].length > 0 &&
            typeof CBA !== 'undefined' && CBA.buildTemplateRows && 
            !breakdowns[cat.key][0].autoUpgraded
        ) {
            // Check if these appear to be old format rows (looking for old markers like 'Manual user split', 'Unverified source', or simply missing noteDetails struct)
            const isOldFormat = breakdowns[cat.key].some(r => 
                !r.noteDetails || !r.noteDetails.definition || r.source === 'Manual user split' || r.source === 'Unverified source'
            );
            
            if (isOldFormat) {
                const catType = isCost ? 'cost' : 'benefit';
                const unitLabel = cat.recurring
                    ? (typeof uiState !== 'undefined' && uiState.recurringPeriod === 'month' ? 'per month' : 'per year')
                    : 'one-off';
                const upgraded = CBA.buildTemplateRows(catType, cat.key, unitLabel);
                if (upgraded.length > 0) {
                    upgraded[0].autoUpgraded = true; // prevent infinite loop if a template has 1 row
                    if (isCost) {
                        if (!s.proposedMeasure.costBreakdowns) s.proposedMeasure.costBreakdowns = {};
                        s.proposedMeasure.costBreakdowns[cat.key] = upgraded;
                        breakdowns[cat.key] = upgraded;
                    } else {
                        if (!s.benefits.breakdowns) s.benefits.breakdowns = {};
                        s.benefits.breakdowns[cat.key] = upgraded;
                        breakdowns[cat.key] = upgraded;
                    }
                }
            }
        }

        const bkRows = breakdowns[cat.key] || [];
        const cardClass = isCost ? 'cost-card' : 'ben-card';
        const accentColor = isCost ? 'red' : 'emerald';
        const chipClass = isCost ? 'cost-chip' : 'ben-chip';

        const card = el('div', { className: `cba-item-card ${cardClass}` });
        card.dataset.cbaPanelKey = panelKey;
        let bkPanelRef = null;
        let bkToggleArrow = null;
        let bkToggleEl = null;
        const setBreakdownOpen = (open) => {
            if (!bkPanelRef || !bkToggleArrow || !bkToggleEl) return;
            if (open) {
                bkPanelRef.classList.add('open');
                bkPanelRef.style.overflow = 'auto';
                bkToggleArrow.textContent = '▾';
                bkToggleEl.classList.add('open');
            } else {
                bkPanelRef.classList.remove('open');
                bkPanelRef.style.overflow = 'hidden';
                bkToggleArrow.textContent = '▸';
                bkToggleEl.classList.remove('open');
            }
        };

        /* ── Top row: Label + Total Chip + Expand toggle ── */
        const topRow = el('div', { className: 'flex items-center gap-2' });
        const labelText = cat.recurring ? `${cat.label} ${periodLabel}` : `${cat.label} (once)`;
        const labelWrap = el('div', { className: 'flex items-center gap-1.5 flex-1 min-w-0' });
        labelWrap.appendChild(el('span', { className: `text-sm text-${accentColor}-800 font-semibold leading-tight`, title: cat.hint }, labelText));
        labelWrap.appendChild(el('button', {
            className: 'cba-param-help-btn',
            title: 'Explain these parameters in simple language',
            onClick: (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                openParameterHelpModal(cat, type, sym, periodLabel);
            }
        }, '?'));
        topRow.appendChild(labelWrap);

        // Editable total chip
        const dv = toDisplay(items[cat.key] || 0, cat.recurring);
        const chipWrap = el('div', { className: `cba-total-chip ${chipClass}` });
        chipWrap.appendChild(el('span', { className: 'text-xs mr-1 opacity-60' }, sym));
        const totalInp = el('input', {
            type: 'number',
            className: `font-extrabold bg-transparent outline-none w-20 text-center text-sm ${isCost ? 'text-red-600' : 'text-emerald-600'}`,
            placeholder: '0', min: '0'
        });
        totalInp.value = dv > 0 ? String(Math.round(dv)) : '';
        totalInp.addEventListener('input', (e) => {
            const typed = parseFloat(e.target.value) || 0;
            items[cat.key] = toAnnual(typed, cat.recurring);
            // If this line has a single split row, keep it synchronized with total edits.
            if (bkRows.length === 1) {
                bkRows[0].qty = 1;
                bkRows[0].rate = typed;
                syncRowQtyReasonFromNote(bkRows[0], sym);
            }
            refreshResults();
            // Update revert button state based on divergence from AI snapshot
            if (revertBtn) {
                const snap = uiState.aiSnapshot;
                const snapVal = snap ? (isCost ? snap.costs[cat.key] : snap.benefits[cat.key]) : undefined;
                const isDiff = snapVal != null && Math.round(typed) !== Math.round(toDisplay(snapVal, cat.recurring));
                revertBtn.className = 'cba-revert-btn ' + (isDiff ? 'cba-revert-diff' : 'cba-revert-same');
            }
        });
        chipWrap.appendChild(totalInp);
        topRow.appendChild(chipWrap);

        // Revert-to-AI button — always visible when AI has run, dims when matching, highlights when diverged
        const snap0 = uiState.aiSnapshot;
        const snapVal0 = snap0 ? (isCost ? snap0.costs[cat.key] : snap0.benefits[cat.key]) : undefined;
        const isDiverged = snapVal0 != null && Math.round(dv) !== Math.round(toDisplay(snapVal0, cat.recurring));
        const revertBtn = (snapVal0 != null) ? el('button', {
            className: 'cba-revert-btn ' + (isDiverged ? 'cba-revert-diff' : 'cba-revert-same'),
            title: `Revert to AI value: ${sym}${Math.round(toDisplay(snapVal0, cat.recurring)).toLocaleString()}`,
            onClick: () => {
                if (revertBtn.classList.contains('cba-revert-same')) return; // no-op when values match AI
                items[cat.key] = snapVal0;
                if (isCost) {
                    if (snap0.costBreakdowns && snap0.costBreakdowns[cat.key]) s.proposedMeasure.costBreakdowns[cat.key] = JSON.parse(JSON.stringify(snap0.costBreakdowns[cat.key]));
                } else {
                    if (snap0.benefitBreakdowns && snap0.benefitBreakdowns[cat.key]) s.benefits.breakdowns[cat.key] = JSON.parse(JSON.stringify(snap0.benefitBreakdowns[cat.key]));
                }
                refreshResults(); render();
            }
        }, `↩ ${sym}${Math.round(toDisplay(snapVal0, cat.recurring)).toLocaleString()}`) : null;
        if (revertBtn) topRow.appendChild(revertBtn);

        // Breakdown toggle or split/calc button
        if (bkRows.length > 0) {
            const toggle = el('span', { className: `cba-bkdn-toggle text-${accentColor}-500` });
            bkToggleEl = toggle;
            const arrow = el('span', {}, '▸');
            bkToggleArrow = arrow;
            toggle.appendChild(arrow);
            toggle.appendChild(document.createTextNode('calc'));
            toggle.addEventListener('click', () => {
                const nextOpen = !bkPanelRef || !bkPanelRef.classList.contains('open');
                if (nextOpen) uiState.openCalcPanels[panelKey] = true;
                else delete uiState.openCalcPanels[panelKey];
                setBreakdownOpen(nextOpen);
            });
            topRow.appendChild(toggle);
        } else {
            const buildManualBreakdownFromTotal = () => {
                const catType = isCost ? 'cost' : 'benefit';
                const unitLabel = cat.recurring
                    ? (uiState.recurringPeriod === 'month' ? 'per month' : 'per year')
                    : 'one-off';

                // Use rich template rows if available, else fall back to a single seeded row
                const templateRows = (typeof CBA !== 'undefined' && CBA.buildTemplateRows)
                    ? CBA.buildTemplateRows(catType, cat.key, unitLabel)
                    : [];
                const newRows = templateRows.length
                    ? templateRows
                    : seedManualBreakdownRows(
                        cat,
                        toDisplay(items[cat.key] || 0, cat.recurring),
                        'Manual user split', '',
                        'User-created row. Edit qty and rate to match your site figures.'
                    );

                // Persist to state directly
                if (isCost) {
                    if (!s.proposedMeasure.costBreakdowns) s.proposedMeasure.costBreakdowns = {};
                    s.proposedMeasure.costBreakdowns[cat.key] = newRows;
                } else {
                    if (!s.benefits.breakdowns) s.benefits.breakdowns = {};
                    s.benefits.breakdowns[cat.key] = newRows;
                }

                // Pre-fill the rationale with the template paragraph if the user has not
                // written anything yet for this category
                if (typeof CBA !== 'undefined' && CBA.getBreakdownParagraph) {
                    const existing = (rationales[cat.key] || '').trim();
                    if (!existing) {
                        const para = CBA.getBreakdownParagraph(catType, cat.key);
                        if (para) {
                            // ratInp isn't built yet at this point — update state and let
                            // renderPreservingView re-render it with the paragraph in place
                            saveRationaleToState(para);
                            if (isCost) s.proposedMeasure.costRationales[cat.key] = para;
                            else s.benefits.rationales[cat.key] = para;
                        }
                    }
                }

                uiState.newBreakdownRow = { panelKey, rowIndex: 0 };
                uiState.lastAddedRowHint = { panelKey, at: Date.now() };
                renderPreservingView(panelKey, true);
            };

            const splitBtn = el('button', {
                className: `cba-bkdn-toggle text-${accentColor}-500`,
                title: 'Open calculations by converting this total into editable component rows',
                onClick: buildManualBreakdownFromTotal
            }, 'calc');
            topRow.appendChild(splitBtn);
        }
        card.appendChild(topRow);

        /* ── Rationale row ──
           Always an editable paragraph. Pre-filled from CBA.BREAKDOWN_TEMPLATES when
           rows are first created via the "calc" button. After that the user owns it. */
        const ratColorClass = isCost ? 'cost-rationale' : 'ben-rationale';
        const autoResize = (target) => { target.style.height = 'auto'; target.style.height = Math.max(36, target.scrollHeight) + 'px'; };

        const saveRationaleToState = (text) => {
            if (isCost) {
                if (!s.proposedMeasure.costRationales) s.proposedMeasure.costRationales = {};
                s.proposedMeasure.costRationales[cat.key] = text;
            } else {
                if (!s.benefits.rationales) s.benefits.rationales = {};
                s.benefits.rationales[cat.key] = text;
            }
        };

        const ratInp = el('textarea', {
            className: `cba-rationale ${ratColorClass}`,
            placeholder: isCost ? 'Notes on why this cost is needed and how the figure was estimated…' : 'Notes on why this benefit is expected and how the figure was estimated…',
            rows: '2'
        });
        ratInp.value = rationales[cat.key] || '';

        ratInp.addEventListener('input', (e) => {
            autoResize(e.target);
            saveRationaleToState(e.target.value);
        });
        ratInp.addEventListener('paste', () => {
            setTimeout(() => {
                autoResize(ratInp);
                // If no value yet, try to auto-fill total from a pasted number
                const suggested = extractSuggestedDisplayValueFromRationale(ratInp.value);
                if (suggested > 0 && !(toDisplay(items[cat.key] || 0, cat.recurring) > 0.5)) {
                    items[cat.key] = toAnnual(suggested, cat.recurring);
                    totalInp.value = String(Math.round(suggested));
                    refreshResults();
                }
            }, 0);
        });

        setTimeout(() => autoResize(ratInp), 0);
        card.appendChild(ratInp);

        // Small clickable source chip under rationale text (if a source URL is available).
        const sourceChipRow = el('div', { className: 'mt-1 flex items-center gap-2 flex-wrap' });
        const refreshSourceChip = (rationaleText) => {
            const meta = extractRationaleSourceMeta(rationaleText, bkRows);
            sourceChipRow.innerHTML = '';
            if (!meta.sourceUrl) return;

            const chip = el('a', {
                href: meta.sourceUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: `inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${isCost ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`,
                title: meta.sourceText || 'Open source'
            }, meta.sourceLabel || 'Source');
            sourceChipRow.appendChild(chip);

            if (meta.sourceText) {
                sourceChipRow.appendChild(el('span', {
                    className: 'text-[10px] text-slate-500',
                    style: 'max-width:80%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
                }, meta.sourceText));
            }
        };

        refreshSourceChip(ratInp.value);
        ratInp.addEventListener('input', (e) => refreshSourceChip(e.target.value));
        card.appendChild(sourceChipRow);

        /* ── Breakdown panel (expandable) ── */
        if (bkRows.length > 0) {
            const bkPanel = el('div', { className: 'cba-bkdn-panel' });
            bkPanelRef = bkPanel;
            setBreakdownOpen(!!uiState.openCalcPanels[panelKey]);

            // Header row
            const hdrRow = el('div', { className: 'cba-bkdn-row', style: 'border-bottom:1px solid rgba(0,0,0,0.12);padding-bottom:4px;' });
            hdrRow.appendChild(el('span', { className: 'text-[11px] text-slate-500 font-bold uppercase tracking-wide' }, 'Component'));
            hdrRow.appendChild(el('span', { className: 'text-[11px] text-slate-500 font-bold text-center uppercase' }, 'Qty'));
            hdrRow.appendChild(el('span', { className: 'text-slate-300 text-sm' }, '×'));
            hdrRow.appendChild(el('span', { className: 'text-[11px] text-slate-500 font-bold text-center uppercase' }, 'Rate'));
            hdrRow.appendChild(el('span', { className: 'text-slate-300 text-sm' }, '='));
            hdrRow.appendChild(el('span', { className: 'text-[11px] text-slate-500 font-bold text-center uppercase' }, 'Subtotal'));
            hdrRow.appendChild(el('span', { className: 'text-[11px] text-slate-400 font-bold text-center uppercase' }, ''));
            bkPanel.appendChild(hdrRow);

            const toolsRow = el('div', { className: 'flex justify-between mt-2 mb-1' });
            // Clear & rebuild — wipes the rows for this card so user can start fresh with a clean calc
            toolsRow.appendChild(el('button', {
                className: 'text-[10px] font-semibold px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100',
                title: 'Remove all rows and reset to a single editable total for this item',
                onClick: () => {
                    if (!confirm('Clear all breakdown rows for this item?')) return;
                    if (isCost) {
                        if (s.proposedMeasure.costBreakdowns) delete s.proposedMeasure.costBreakdowns[cat.key];
                    } else {
                        if (s.benefits.breakdowns) delete s.benefits.breakdowns[cat.key];
                    }
                    renderPreservingView(panelKey, false);
                }
            }, '✕ Clear rows'));
            toolsRow.appendChild(el('button', {
                className: 'text-[10px] font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                onClick: () => {
                    const newRowIndex = bkRows.length;
                    bkRows.push({
                        label: `Component ${bkRows.length + 1}`,
                        qty: 0,
                        qtyReason: 'User-defined component row.',
                        rate: 0,
                        unit: cat.recurring ? (uiState.recurringPeriod === 'month' ? 'per month' : 'per year') : 'one-off',
                        source: 'Manual user split',
                        sourceUrl: '',
                        noteDetails: {
                            definition: `Component ${bkRows.length + 1}`,
                            basis: 'User-defined component row.',
                            parameters: '',
                            formula: 'Qty x Rate',
                            autoParams: true
                        }
                    });
                    syncRowQtyReasonFromNote(bkRows[bkRows.length - 1], sym);
                    uiState.newBreakdownRow = { panelKey, rowIndex: newRowIndex };
                    uiState.lastAddedRowHint = { panelKey, at: Date.now() };
                    renderPreservingView(panelKey, true);
                }
            }, '+ Add row'));
            bkPanel.appendChild(toolsRow);

            let sumLabel = null;
            const parameterEditors = {};
            const qtyEditors = {};
            const rateEditors = {};
            const recalcFns = {};
            const updateTotalFromBreakdown = () => {
                const newTotal = bkRows.reduce((sum, br) => sum + ((br.qty || 0) * (br.rate || 0)), 0);
                items[cat.key] = toAnnual(newTotal, cat.recurring);
                totalInp.value = newTotal > 0 ? String(Math.round(newTotal)) : '';
                if (sumLabel) sumLabel.textContent = `Σ ${sym}${Math.round(newTotal).toLocaleString()}`;
                refreshResults();
                if (revertBtn) {
                    const snapV = snap0 ? (isCost ? snap0.costs[cat.key] : snap0.benefits[cat.key]) : undefined;
                    const diff = snapV != null && Math.round(newTotal) !== Math.round(toDisplay(snapV, cat.recurring));
                    revertBtn.className = 'cba-revert-btn ' + (diff ? 'cba-revert-diff' : 'cba-revert-same');
                }
            };

            bkRows.forEach((row, idx) => {
                syncRowQtyReasonFromNote(row, sym);
                const explicitNew = !!uiState.newBreakdownRow && uiState.newBreakdownRow.panelKey === panelKey && uiState.newBreakdownRow.rowIndex === idx;
                const hintedNew = !!uiState.lastAddedRowHint && uiState.lastAddedRowHint.panelKey === panelKey && (Date.now() - uiState.lastAddedRowHint.at) < 1500 && idx === (bkRows.length - 1);
                const isNewlyAdded = explicitNew || hintedNew;
                if (explicitNew) uiState.newBreakdownRow = null;
                if (hintedNew) uiState.lastAddedRowHint = null;
                const bkRow = el('div', { className: isNewlyAdded ? 'cba-bkdn-row cba-bkdn-row-enter' : 'cba-bkdn-row' });

                // Label (editable)
                const lblInp = el('input', {
                    type: 'text',
                    className: 'text-xs text-slate-700 bg-transparent outline-none w-full truncate',
                    title: row.source || ''
                });
                lblInp.value = row.label || '';
                lblInp.addEventListener('input', (e) => {
                    bkRows[idx].label = e.target.value;
                });
                const lblWrap = el('div', { className: 'flex flex-col', style: { minWidth: 0, overflow: 'hidden' } });
                lblWrap.appendChild(lblInp);
                if (row.source) {
                    const srcTermId = termIdForSource(row.source);
                    const srcUrl = sourceUrlForText(row.source, row.sourceUrl);
                    const srcEl = el('div', { className: 'cba-bkdn-src truncate flex items-center gap-2 flex-wrap', title: row.source }, `📎 ${row.source}`);
                    if (srcUrl) {
                        srcEl.appendChild(el('a', {
                            href: srcUrl,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className: 'text-[10px] underline text-blue-600 hover:text-blue-700'
                        }, 'Open source'));
                    } else {
                        srcEl.appendChild(el('span', {
                            className: 'text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5'
                        }, 'Unverified source'));
                    }
                    if (srcTermId) {
                        const termLnk = el('span', { className: 'cba-term-link text-[10px]', title: 'View definition in appendix' }, 'Terms');
                        termLnk.addEventListener('click', (ev) => { ev.stopPropagation(); scrollToAppendixTerm(srcTermId); });
                        srcEl.appendChild(termLnk);
                    }
                    lblWrap.appendChild(srcEl);
                }
                bkRow.appendChild(lblWrap);

                // Qty input
                const qtyWrap = el('div', { className: 'flex flex-col items-center' });
                const qtyInp = el('input', { type: 'number', className: 'cba-bkdn-inp', min: '0', step: 'any' });
                qtyInp.value = row.qty || 0;
                qtyEditors[idx] = qtyInp;
                qtyWrap.appendChild(qtyInp);
                bkRow.appendChild(qtyWrap);

                bkRow.appendChild(el('span', { className: 'text-slate-400 text-xs font-bold text-center' }, '×'));

                // Rate input
                const rateInp = el('input', { type: 'number', className: 'cba-bkdn-inp', min: '0', step: 'any' });
                rateInp.value = row.rate || 0;
                rateEditors[idx] = rateInp;
                bkRow.appendChild(rateInp);

                bkRow.appendChild(el('span', { className: 'text-slate-400 text-xs font-bold text-center' }, '='));

                // Subtotal (auto-calculated)
                const sub = el('span', {
                    className: `text-sm font-bold text-center ${isCost ? 'text-red-500' : 'text-emerald-500'}`
                });
                const calcSub = () => {
                    const q = parseFloat(qtyInp.value) || 0;
                    const r = parseFloat(rateInp.value) || 0;
                    bkRows[idx].qty = q;
                    bkRows[idx].rate = r;
                    syncRowQtyReasonFromNote(bkRows[idx], sym);
                    if (parameterEditors[idx] && (bkRows[idx].noteDetails || {}).autoParams !== false) {
                        parameterEditors[idx].value = getRowQtyNoteParts(bkRows[idx], sym).parameters;
                    }
                    sub.textContent = `${sym}${Math.round(q * r).toLocaleString()}`;
                    updateTotalFromBreakdown();
                };
                sub.textContent = `${sym}${Math.round((row.qty || 0) * (row.rate || 0)).toLocaleString()}`;
                qtyInp.addEventListener('input', calcSub);
                rateInp.addEventListener('input', calcSub);
                recalcFns[idx] = calcSub;
                bkRow.appendChild(sub);

                const delBtn = el('button', {
                    className: 'cba-bkdn-del',
                    title: 'Remove this component row',
                    onClick: () => {
                        bkRows.splice(idx, 1);
                        const hasRowsAfter = bkRows.length > 0;
                        if (bkRows.length === 0) {
                            delete breakdowns[cat.key];
                            items[cat.key] = 0;
                        } else {
                            const remTotal = bkRows.reduce((sum, br) => sum + ((br.qty || 0) * (br.rate || 0)), 0);
                            items[cat.key] = toAnnual(remTotal, cat.recurring);
                        }
                        renderPreservingView(panelKey, hasRowsAfter);
                    }
                }, '✕');
                bkRow.appendChild(delBtn);

                bkPanel.appendChild(bkRow);
            });

            // Unit summary + formula under breakdown
            const unitRow = el('div', { className: 'flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-200' });
            const units = [...new Set(bkRows.map(r => r.unit).filter(Boolean))].join(' / ');
            if (units) unitRow.appendChild(el('span', { className: 'text-xs text-slate-400' }, `Unit: ${units}`));
            sumLabel = el('span', { className: `text-xs font-bold ${isCost ? 'text-red-500' : 'text-emerald-500'}` });
            sumLabel.textContent = `Σ ${sym}${Math.round(bkRows.reduce((s, r) => s + (r.qty || 0) * (r.rate || 0), 0)).toLocaleString()}`;
            unitRow.appendChild(sumLabel);
            bkPanel.appendChild(unitRow);

            // Formula summary — compact expression built from row data
            const formulaDiv = el('div', {
                className: 'mt-2 p-2 rounded-lg text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-100 leading-relaxed',
                style: 'white-space:pre-wrap;word-break:break-word;'
            });
            const refreshFormulaDiv = () => {
                const expr = bkRows.map(r => {
                    const qty  = Number(r.qty)  || 0;
                    const rate = Number(r.rate) || 0;
                    const lbl  = String((r.noteDetails && r.noteDetails.definition) || r.label || 'Component').trim();
                    return qty === 1
                        ? `${lbl}: ${sym}${Math.round(rate).toLocaleString()}`
                        : `${lbl}: ${qty} × ${sym}${Math.round(rate).toLocaleString()} = ${sym}${Math.round(qty * rate).toLocaleString()}`;
                }).join('\n');
                const total = bkRows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
                formulaDiv.textContent = expr + `\n─────────────────\nTotal: ${sym}${Math.round(total).toLocaleString()}`;
            };
            refreshFormulaDiv();
            bkPanel.appendChild(formulaDiv);
            // Keep formula div in sync when rows change
            const _origUpdateTotal = updateTotalFromBreakdown;
            // Patch updateTotalFromBreakdown to also refresh the formula div
            // We do this by wrapping via a closure-level override
            Object.defineProperty(bkPanel, '_refreshFormula', { value: refreshFormulaDiv, writable: true });
            bkPanel.addEventListener('input', () => { refreshFormulaDiv(); });

            // Quantity notes footer — shows qtyReason for each row
            const reasons = bkRows
                .map((row, rowIndex) => ({ row, rowIndex }))
                .filter(({ row }) => !!(row.qtyReason || row.noteDetails));
            if (reasons.length > 0) {
                const notesDiv = el('div', { className: 'cba-bkdn-notes' });
                const notesHead = el('div', { className: 'cba-bkdn-notes-head' });
                notesHead.appendChild(el('span', { className: 'cba-bkdn-notes-title' }, 'Quantity notes'));
                notesHead.appendChild(el('span', { className: 'cba-bkdn-notes-help' }, 'Edit each assumption clearly and keep source evidence linked.'));
                notesDiv.appendChild(notesHead);
                reasons.forEach(({ row: noteRow, rowIndex }) => {
                    syncRowQtyReasonFromNote(noteRow, sym);
                    const note = getRowQtyNoteParts(noteRow, sym);
                    const line = el('div', { className: 'cba-note-item' });
                    const head = el('div', { className: 'cba-note-head' });
                    head.appendChild(el('div', { className: 'cba-note-title' }, noteRow.label || 'Component note'));
                    const liveSubtotal = Math.round((Number(noteRow.qty) || 0) * (Number(noteRow.rate) || 0));
                    const subtotalBadge = el('span', { className: 'cba-note-badge' }, `${sym}${liveSubtotal.toLocaleString()}`);
                    head.appendChild(subtotalBadge);
                    line.appendChild(head);

                    const fieldGrid = el('div', { className: 'cba-note-grid' });

                    const buildField = (labelText, controlEl, wide) => {
                        const field = el('div', { className: `cba-note-field${wide ? ' cba-note-field-wide' : ''}` });
                        field.appendChild(el('label', { className: 'cba-note-label' }, labelText));
                        field.appendChild(controlEl);
                        return field;
                    };

                    const defInp = el('input', {
                        type: 'text',
                        className: 'cba-note-edit',
                        value: note.definition || noteRow.label || ''
                    });
                    defInp.addEventListener('input', (e) => {
                        noteRow.noteDetails = noteRow.noteDetails || {};
                        noteRow.noteDetails.definition = e.target.value;
                        syncRowQtyReasonFromNote(noteRow, sym);
                    });
                    fieldGrid.appendChild(buildField('Definition', defInp, false));

                    const basisInp = el('textarea', {
                        className: 'cba-note-edit',
                        rows: '2'
                    });
                    basisInp.value = note.basis || '';
                    basisInp.addEventListener('input', (e) => {
                        noteRow.noteDetails = noteRow.noteDetails || {};
                        noteRow.noteDetails.basis = e.target.value;
                        syncRowQtyReasonFromNote(noteRow, sym);
                    });
                    fieldGrid.appendChild(buildField('Basis', basisInp, true));

                    const figWrap = el('div', { className: 'cba-note-inline' });
                    const figQtyWrap = el('div', { className: 'cba-note-mini' });
                    figQtyWrap.appendChild(el('span', { className: 'cba-note-mini-label' }, 'Qty'));
                    const figQty = el('input', {
                        type: 'number',
                        className: 'cba-note-edit',
                        min: '0',
                        step: 'any',
                        placeholder: 'Qty',
                        value: noteRow.qty || 0
                    });
                    figQtyWrap.appendChild(figQty);

                    const figRateWrap = el('div', { className: 'cba-note-mini' });
                    figRateWrap.appendChild(el('span', { className: 'cba-note-mini-label' }, 'Rate'));
                    const figRate = el('input', {
                        type: 'number',
                        className: 'cba-note-edit',
                        min: '0',
                        step: 'any',
                        placeholder: 'Rate',
                        value: noteRow.rate || 0
                    });
                    figRateWrap.appendChild(figRate);
                    figQty.addEventListener('input', (e) => {
                        noteRow.qty = parseFloat(e.target.value) || 0;
                        if (qtyEditors[rowIndex]) qtyEditors[rowIndex].value = noteRow.qty;
                        if (rateEditors[rowIndex]) rateEditors[rowIndex].value = noteRow.rate;
                        if (recalcFns[rowIndex]) recalcFns[rowIndex]();
                        subtotalBadge.textContent = `${sym}${Math.round((noteRow.qty || 0) * (noteRow.rate || 0)).toLocaleString()}`;
                    });
                    figRate.addEventListener('input', (e) => {
                        noteRow.rate = parseFloat(e.target.value) || 0;
                        if (qtyEditors[rowIndex]) qtyEditors[rowIndex].value = noteRow.qty;
                        if (rateEditors[rowIndex]) rateEditors[rowIndex].value = noteRow.rate;
                        if (recalcFns[rowIndex]) recalcFns[rowIndex]();
                        subtotalBadge.textContent = `${sym}${Math.round((noteRow.qty || 0) * (noteRow.rate || 0)).toLocaleString()}`;
                    });
                    figWrap.appendChild(figQtyWrap);
                    figWrap.appendChild(figRateWrap);
                    fieldGrid.appendChild(buildField('Figures', figWrap, true));

                    const pInp = el('textarea', {
                        className: 'cba-note-edit',
                        rows: '2'
                    });
                    pInp.value = note.parameters || '';
                    parameterEditors[rowIndex] = pInp;
                    pInp.addEventListener('input', (e) => {
                        noteRow.noteDetails = noteRow.noteDetails || {};
                        noteRow.noteDetails.parameters = e.target.value;
                        noteRow.noteDetails.autoParams = false;
                        syncRowQtyReasonFromNote(noteRow, sym);
                    });
                    const pWrap = el('div', { className: 'cba-note-field cba-note-field-wide' });
                    pWrap.appendChild(el('label', { className: 'cba-note-label' }, 'Parameters'));
                    pWrap.appendChild(pInp);
                    const pTools = el('div', { className: 'cba-note-tools' });
                    pTools.appendChild(el('button', {
                        className: 'cba-note-sync-btn',
                        onClick: () => {
                            noteRow.noteDetails = noteRow.noteDetails || {};
                            noteRow.noteDetails.autoParams = true;
                            noteRow.noteDetails.parameters = '';
                            syncRowQtyReasonFromNote(noteRow, sym);
                            pInp.value = getRowQtyNoteParts(noteRow, sym).parameters;
                        }
                    }, 'Sync with Qty x Rate'));
                    pWrap.appendChild(pTools);
                    fieldGrid.appendChild(pWrap);

                    const fInp = el('input', {
                        type: 'text',
                        className: 'cba-note-edit',
                        value: note.formula || 'Qty x Rate'
                    });
                    fInp.addEventListener('input', (e) => {
                        noteRow.noteDetails = noteRow.noteDetails || {};
                        noteRow.noteDetails.formula = e.target.value;
                        syncRowQtyReasonFromNote(noteRow, sym);
                    });
                    fieldGrid.appendChild(buildField('Formula', fInp, false));

                    const srcInp = el('input', {
                        type: 'text',
                        className: 'cba-note-edit',
                        value: noteRow.source || ''
                    });
                    srcInp.addEventListener('input', (e) => {
                        noteRow.source = e.target.value;
                    });
                    fieldGrid.appendChild(buildField('Source', srcInp, false));

                    const srcUrlInp = el('input', {
                        type: 'url',
                        className: 'cba-note-edit',
                        value: noteRow.sourceUrl || sourceUrlForText(noteRow.source, noteRow.sourceUrl) || ''
                    });
                    srcUrlInp.addEventListener('input', (e) => {
                        noteRow.sourceUrl = e.target.value;
                    });
                    fieldGrid.appendChild(buildField('Source URL', srcUrlInp, false));

                    const noteSrcUrl = sourceUrlForText(noteRow.source, noteRow.sourceUrl);
                    if (noteSrcUrl) {
                        const srcLinkRow = el('div', { className: 'cba-note-field cba-note-field-wide' });
                        srcLinkRow.appendChild(el('a', {
                            href: noteSrcUrl,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className: 'cba-note-source-link'
                        }, 'Open source'));
                        fieldGrid.appendChild(srcLinkRow);
                    }

                    const ctxLines = getSourceContextLines(noteRow.source, noteRow.qtyReason);
                    if (ctxLines.length > 0) {
                        const ctx = el('div', { className: 'cba-note-context cba-note-field-wide' }, `Context: ${ctxLines.join(' ')}`);
                        fieldGrid.appendChild(ctx);
                    }

                    line.appendChild(fieldGrid);

                    notesDiv.appendChild(line);
                });
                bkPanel.appendChild(notesDiv);
            }

            card.appendChild(bkPanel);
        }

        return card;
    }

    /* ═══════════════════════════════════════════════════════════════
       STEP 2: ANALYZE — Left (Costs red) / Right (Benefits green)
       ═══════════════════════════════════════════════════════════════ */
    function renderAnalyze() {
        const s = E.getState();
        const sym = currencySymbol();
        const noFade = !!uiState.suppressNextAnalyzeFade;
        uiState.suppressNextAnalyzeFade = false;
        const wrap = el('div', { className: noFade ? 'space-y-4' : 'space-y-4 cba-fade' });

        /* Header bar: back + title + currency dropdown */
        const hdr = el('div', { className: 'flex items-center gap-3 flex-wrap' });
        hdr.appendChild(el('button', { className: 'rab-btn rab-c-slate text-xs', onClick: () => { step = 'risk'; render(); } }, '← Back'));
        hdr.appendChild(el('h4', { className: 'text-lg font-bold text-slate-900 flex-1' }, 'Cost-Benefit Analysis'));
        hdr.appendChild(el('span', { className: 'text-xs font-semibold text-slate-500' }, 'Currency:'));
        hdr.appendChild(buildCurrencyDropdown());
        wrap.appendChild(hdr);

        /* Viewing saved measure banner */
        if (uiState.viewingMeasureIndex !== null) {
            const vi = uiState.viewingMeasureIndex;
            const banner = el('div', { className: 'flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2' });
            banner.appendChild(el('span', { className: 'text-sm text-amber-800 flex-1' }, `👁 Viewing saved measure #${vi + 1} — edit freely and click Save Measure to add as a new entry, or go to Compare to delete it.`));
            banner.appendChild(el('button', { className: 'rab-btn text-xs', style: { background: '#f59e0b', color: '#fff' }, onClick: () => { uiState.viewingMeasureIndex = null; step = 'compare'; render(); } }, '← Back to Compare'));
            wrap.appendChild(banner);
        }

        wrap.appendChild(renderCurrentRiskSummary());

        /* Manual workflow banner */
        if (s.mode === 'manual') {
            const manBanner = el('div', { className: 'flex items-start gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-800' });
            manBanner.appendChild(el('span', { className: 'text-xl flex-shrink-0' }, '✏️'));
            const manBannerText = el('div', { className: 'flex-1' });
            manBannerText.appendChild(el('b', {}, 'Manual Workflow — '));
            manBannerText.appendChild(document.createTextNode(
                'Enter the control measure below, then type your own cost & benefit figures directly into the table. ' +
                'All fields are editable. Use the '
            ));
            manBannerText.appendChild(el('b', {}, '🤖 AI Estimate'));
            manBannerText.appendChild(document.createTextNode(' button at any time to have AI fill in suggested values — you can then accept, adjust, or override them freely.'));
            manBanner.appendChild(manBannerText);
            wrap.appendChild(manBanner);
        }

        /* Measure description */
        wrap.appendChild(el('div', { className: 'space-y-1' },
            el('label', { className: 'block text-sm font-semibold text-slate-700' }, 'What measure do you want to evaluate?')
        ));
        const descTA = el('textarea', {
            className: 'w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none', rows: '2',
            placeholder: 'e.g., Install a fume extraction hood with HEPA filtration over the grinding station'
        });
        descTA.value = s.proposedMeasure.description || '';
        descTA.addEventListener('input', (e) => { s.proposedMeasure.description = e.target.value; });
        wrap.appendChild(descTA);

        /* CM Ladder */
        const ladderGrid = el('div', { className: 'grid grid-cols-3 gap-1.5' });
        E.CM_LADDER.forEach(cm => {
            const isSel = s.proposedMeasure.controlLevel === cm.level;
            const card = el('div', {
                className: cls('cursor-pointer border-2 rounded-lg p-2 transition-all text-center text-xs', isSel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'),
                onClick: () => { s.proposedMeasure.controlLevel = cm.level; render(); }
            });
            card.appendChild(el('div', { className: 'font-bold text-slate-800' }, `L${cm.level}`));
            card.appendChild(el('div', { className: 'text-slate-500 mt-0.5 leading-tight' }, cm.desc));
            ladderGrid.appendChild(card);
        });
        wrap.appendChild(ladderGrid);

        /* Labour Parameters: Process Frequency & Hourly Wage */
        const processRow = el('div', { className: 'flex flex-col gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3' });
        processRow.appendChild(el('div', { className: 'flex items-center gap-2' },
            el('span', { className: 'text-xs font-bold text-amber-800 uppercase tracking-wide' }, '⏱️ Labour Parameters'),
            el('span', { className: 'text-[10px] text-amber-600 italic' }, '(Standard 40-hour work week)')
        ));
        
        // Process frequency per week
        const freqGrp = el('div', { className: 'flex items-center gap-2' });
        freqGrp.appendChild(el('label', { className: 'text-xs font-medium text-amber-700 whitespace-nowrap' }, 'Task occurs:'));
        const freqInp = el('input', {
            type: 'number', min: '0.1', step: '0.5', max: '100',
            className: 'w-20 text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-amber-400',
            placeholder: '#'
        });
        freqInp.value = uiState.processFrequencyPerWeek || '';
        freqInp.addEventListener('input', (e) => {
            const freq = parseFloat(e.target.value) || null;
            uiState.processFrequencyPerWeek = freq;
            // Auto-calculate per-task minutes: 40 hrs/week = 2400 minutes ÷ frequency
            uiState.processTimeMinutesPerTask = freq ? Math.round(2400 / freq) : null;
            render(); // refresh to show calculated value
        });
        freqGrp.appendChild(freqInp);
        freqGrp.appendChild(el('span', { className: 'text-xs text-amber-600' }, 'times/week'));
        processRow.appendChild(freqGrp);
        
        // Display calculated per-task time
        if (uiState.processTimeMinutesPerTask) {
            const calcDisplay = el('div', { className: 'text-xs text-amber-700 italic bg-amber-100 rounded-lg px-2 py-1.5' });
            calcDisplay.textContent = `→ Calculated: ${uiState.processTimeMinutesPerTask} minutes per task`;
            processRow.appendChild(calcDisplay);
        }

        // Average hourly wage
        const wgGrp = el('div', { className: 'flex items-center gap-2' });
        wgGrp.appendChild(el('label', { className: 'text-xs font-medium text-amber-700 whitespace-nowrap' }, 'Avg hourly wage:'));
        const wgInp = el('input', {
            type: 'number', min: '0', step: '0.5',
            className: 'w-24 text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-amber-400',
            placeholder: 'auto'
        });
        wgInp.value = uiState.avgHourlyWage || '';
        wgInp.addEventListener('input', (e) => { uiState.avgHourlyWage = parseFloat(e.target.value) || null; });
        wgGrp.appendChild(wgInp);
        wgGrp.appendChild(el('span', { className: 'text-xs text-amber-600' }, `${sym}/${s.location.currency || 'hour'}`));
        if (uiState.avgHourlyWage && s.location.country) {
            wgGrp.appendChild(el('span', { className: 'text-[10px] text-amber-500 italic ml-2' }, `(${s.location.country})`));
        }
        processRow.appendChild(wgGrp);

        // Task breakdown minimum time threshold
        const brGrp = el('div', { className: 'flex items-center gap-2' });
        brGrp.appendChild(el('label', { className: 'text-xs font-medium text-amber-700 whitespace-nowrap' }, 'Breakdown granularity:'));
        const brInp = el('input', {
            type: 'number', min: '1', step: '1', max: '120',
            className: 'w-20 text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-amber-400',
            placeholder: 'min'
        });
        brInp.value = uiState.taskBreakdownMinutes || 10;
        brInp.addEventListener('input', (e) => { uiState.taskBreakdownMinutes = parseFloat(e.target.value) || 10; });
        brGrp.appendChild(brInp);
        brGrp.appendChild(el('span', { className: 'text-xs text-amber-600' }, 'min tasks'));
        brGrp.appendChild(el('span', { className: 'text-[10px] text-amber-500 italic' }, '(detail threshold)'));
        processRow.appendChild(brGrp);
        wrap.appendChild(processRow);

        /* Controls row: time horizon + month/year toggle */
        const controlsRow = el('div', { className: 'flex flex-wrap items-center gap-4' });
        const horzGrp = el('div', { className: 'flex items-center gap-2' });
        horzGrp.appendChild(el('span', { className: 'text-xs font-semibold text-slate-600' }, 'Time horizon:'));
        E.TIME_HORIZONS.forEach(yr => {
            horzGrp.appendChild(el('button', {
                className: cls('rab-btn text-xs', s.proposedMeasure.timeHorizon === yr ? 'rab-c-blue' : 'rab-c-slate'),
                onClick: () => { s.proposedMeasure.timeHorizon = yr; render(); }
            }, `${yr}yr`));
        });
        controlsRow.appendChild(horzGrp);
        const periodGrp = el('div', { className: 'flex items-center gap-2' });
        periodGrp.appendChild(el('span', { className: 'text-xs font-semibold text-slate-600' }, 'Recurring shown:'));
        ['year', 'month'].forEach(p => {
            periodGrp.appendChild(el('button', {
                className: cls('rab-btn text-xs', uiState.recurringPeriod === p ? 'rab-c-blue' : 'rab-c-slate'),
                onClick: () => { uiState.recurringPeriod = p; render(); }
            }, p === 'year' ? 'Per Year' : 'Per Month'));
        });
        controlsRow.appendChild(periodGrp);
        wrap.appendChild(controlsRow);

        /* AI estimate section */
        const aiSection = el('div', { className: 'space-y-2 bg-blue-50 rounded-xl border border-blue-200 p-3' });
        aiSection.appendChild(renderModelSelector());

        /* ── Baseline info callout ── */
        const B = window.CBA.baseline;
        if (B) {
            const bmeta = B.getMeta();
            const locStr0 = s.location.country ? `${s.location.region ? s.location.region + ', ' : ''}${s.location.country}` : '';
            const isStale = B.isStale(locStr0);
            const callout = el('div', {
                className: `text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${isStale ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`
            });
            callout.appendChild(el('span', { className: 'text-base leading-none mt-px flex-shrink-0' }, isStale ? '⚠️' : '✅'));
            const calloutText = el('div');
            if (bmeta.refreshedAt && !isStale) {
                calloutText.appendChild(el('b', {}, 'Baselines up to date'));
                calloutText.appendChild(document.createTextNode(` — calibrated for ${bmeta.location || 'Luxembourg defaults'}, refreshed ${new Date(bmeta.refreshedAt).toLocaleDateString()}`));
            } else if (bmeta.refreshedAt && isStale) {
                calloutText.appendChild(el('b', {}, 'Baselines may be outdated'));
                calloutText.appendChild(document.createTextNode(` — last refreshed ${new Date(bmeta.refreshedAt).toLocaleDateString()}. Click Refresh to update AI anchors.`));
            } else {
                calloutText.appendChild(el('b', {}, 'Using factory Luxembourg defaults'));
                calloutText.appendChild(document.createTextNode(' — click Refresh Baselines to update figures from the latest Luxembourg sources.'));
            }
            callout.appendChild(calloutText);
            aiSection.appendChild(callout);
        }

        /* ── Button row: Refresh Baselines + AI Estimate ── */
        const btnRow = el('div', { className: 'flex flex-wrap gap-2 mt-1' });

        const refreshBtn = el('button', {
            className: 'rab-btn rab-c-slate text-xs',
            disabled: uiState.baselineRefreshing || uiState.aiLoading,
            title: 'AI researches current Luxembourg AAA/MDE/ITM/STATEC benchmarks and stores them as calibration anchors for cost estimation.',
            onClick: async () => { await runBaselineRefresh(s, uiState.aiModel); }
        });
        if (uiState.baselineRefreshing) { refreshBtn.appendChild(svgSpinner(14,'#475569')); refreshBtn.appendChild(document.createTextNode(' Refreshing…')); }
        else { refreshBtn.appendChild(document.createTextNode('🔬 Refresh Baselines (AI)')); }
        btnRow.appendChild(refreshBtn);

        const manualBaselineBtn = el('button', {
            className: 'rab-btn rab-c-amber text-xs',
            disabled: uiState.aiLoading || uiState.baselineRefreshing,
            title: 'Manually view and edit all Luxembourg baseline figures without AI.',
            onClick: () => { uiState.baselineBackStep = 'analyze'; step = 'baselines'; render(); }
        }, '✏️ Edit Manually');
        btnRow.appendChild(manualBaselineBtn);

        /* ── Apply Baseline to Table button ── */
        if (B) {
            const applyBaselineBtn = el('button', {
                className: 'rab-btn rab-c-violet text-xs',
                disabled: uiState.aiLoading || uiState.baselineRefreshing,
                title: 'Pre-fills the benefit table with Luxembourg baseline figures for the current risk severity. You can edit any value afterwards.',
                onClick: () => {
                    const sevValue = normalizeScaleValue('severity', s.currentRisk.severity || 1, 1);
                    const sevBand = toBaselineSeverityLevel(sevValue);
                    const sev = String(sevBand);
                    const bundle = B.getSeverityBundle(sev);

                    // Check if any benefit items are already set — ask before overwriting
                    const hasExisting = Object.values(s.benefits.items).some(v => v && v !== 0);
                    if (hasExisting && !confirm(
                        'This will overwrite your current benefit figures with Luxembourg baseline values for Severity S=' + formatScaleValue(sevValue) + ' (mapped to baseline level ' + sevBand + ').\n\nContinue?'
                    )) return;

                    const inj = bundle.injuryCostPerCase || {};
                    const med = bundle.medicalCostUSD || {};
                    const reg = bundle.regulatoryFineUSD || {};
                    const day = bundle.daysAwayFromWork || {};
                    const injuryTotal = Math.max(0, inj.value || 0);
                    const directMedical = Math.max(0, med.value || 0);
                    const indirectOverhead = Math.max(0, injuryTotal - directMedical);

                    // ── Map baseline metrics → benefit categories ──
                    // injuryCost  = non-medical impact only (all-in iceberg minus direct medical)
                    s.benefits.items.injuryCost  = indirectOverhead;
                    // medical     = direct AAA-covered medical cost per case
                    s.benefits.items.medical     = directMedical;
                    // regulatory  = ITM fine risk per violation
                    s.benefits.items.regulatory  = reg.value || 0;
                    // manhours    = days away from work × 8 hrs × avg hourly wage
                    const days = day.value || 0;
                    const wage = uiState.avgHourlyWage || 28; // STATEC median €28/hr
                    s.benefits.items.manhours = Math.round(days * 8 * wage);
                    // insurance   = AAA Bonus-Malus % change is a ratio; set 0 (requires payroll to compute)
                    // Leave insurance as-is — too payroll-dependent to auto-fill
                    // Store rationales so user can see where each value came from
                    s.benefits.rationales = s.benefits.rationales || {};
                    s.benefits.rationales.injuryCost  =
                        `Non-medical injury impact benchmark (Severity ${sev})\n` +
                        `What: Productivity, admin and insurance-effect savings per prevented case, excluding direct medical/statutory compensation.\n` +
                        `Value: ${sym}${formatNum(indirectOverhead)} per case (= all-in ${sym}${formatNum(injuryTotal)} - direct medical ${sym}${formatNum(directMedical)}).\n` +
                        `Why this value: Derived from Luxembourg iceberg baseline to avoid double counting with Medical Cost Savings. ${inj.rationaleFormula || inj.notes || 'Luxembourg baseline evidence.'}\n` +
                        `Source: ${inj.source || 'Luxembourg baseline'}${inj.sourceUrl ? '\nSource link: Source' : ''}`;

                    s.benefits.rationales.medical     =
                        `Direct medical cost benchmark for (Severity ${sev} case)\n` +
                        `What: Hospital/treatment and statutory medical compensation for one recognized case.\n` +
                        `Value: ${sym}${formatNum(med.value || 0)} per case.\n` +
                        `Why this value: ${med.rationaleFormula || med.notes || 'Luxembourg baseline evidence.'}\n` +
                        `Context: AAA means Association d'Assurance Accident, Luxembourg's workplace accident insurer.\n` +
                        `Source: ${med.source || 'Luxembourg baseline'}${med.sourceUrl ? '\nSource link: Source' : ''}`;

                    s.benefits.rationales.regulatory  =
                        `Regulatory exposure benchmark (Severity ${sev})\n` +
                        `What: Expected enforcement/fine exposure for a serious violation event.\n` +
                        `Value: ${sym}${formatNum(reg.value || 0)} per violation.\n` +
                        `Why this value: ${reg.rationaleFormula || reg.notes || 'Luxembourg baseline evidence.'}\n` +
                        `Context: ITM means Inspection du Travail et des Mines (Luxembourg labour inspectorate).\n` +
                        `Source: ${reg.source || 'Luxembourg baseline'}${reg.sourceUrl ? '\nSource link: Source' : ''}`;

                    s.benefits.rationales.manhours    =
                        `Labour-time recovery benchmark (Severity ${sev})\n` +
                        `What: Work-hours recovered when this case is avoided.\n` +
                        `Value: ${days || 0} day(s) x 8 hour/day x ${sym}${formatNum(wage)}/hour = ${sym}${formatNum(Math.round(days * 8 * wage))}.\n` +
                        `Why this value: Based on severity-level days-away profile and selected wage.\n` +
                        `Source: ${day.source || 'Luxembourg baseline'}${day.sourceUrl ? '\nSource link: Source' : ''}`;

                    // Pre-build editable split rows so users can immediately tune each component.
                    const hoursRecovered = Math.max(0, Math.round(days * 8));
                    const sevLabelForNotes = `Severity S=${formatScaleValue(sevValue)} (baseline level ${sevBand}: ${baselineSeverityName(sevBand)})`;
                    const inc = bundle.incidentRates || {};
                    const incRate = Math.max(0, parseFloat(inc.value) || 0);
                    const hoursPerCase = incRate > 0 ? Math.round((100 * 2080) / incRate) : null;
                    const incidenceNarrative = incRate > 0
                        ? `${incRate} case(s) per 100 FTE-year (approximately 1 case per ${formatNum(hoursPerCase)} man-hours worked)`
                        : 'no validated incident-rate anchor available in the current baseline';

                    s.benefits.breakdowns = s.benefits.breakdowns || {};
                    
                    // Medical Cost template injection
                    try {
                        const medRows = CBA.buildTemplateRows('benefit', 'medical', 'per year');
                        if (medRows && medRows.length > 0) {
                            medRows[0].qty = (med.value || 0) > 0 ? 1 : 0;
                            medRows[0].rate = med.value || 0;
                            s.benefits.breakdowns.medical = medRows;
                        }
                    } catch(e) {}

                    // Regulatory Cost template injection
                    try {
                        const regRows = CBA.buildTemplateRows('benefit', 'regulatory', 'one-off');
                        if (regRows && regRows.length > 0) {
                            regRows[0].qty = (reg.value || 0) > 0 ? 1 : 0;
                            regRows[0].rate = reg.value || 0;
                            s.benefits.breakdowns.regulatory = regRows;
                        }
                    } catch(e) {}

                    // Manhours template injection
                    try {
                        const mhRows = CBA.buildTemplateRows('benefit', 'manhours', 'per year');
                        if (mhRows && mhRows.length > 0) {
                            mhRows[0].qty = hoursRecovered;
                            mhRows[0].rate = wage;
                            s.benefits.breakdowns.manhours = mhRows;
                        }
                    } catch(e) {}

                    // Injury Cost template injection
                    try {
                        const injRows = CBA.buildTemplateRows('benefit', 'injuryCost', 'per year');
                        if (injRows && injRows.length > 0) {
                            const formula = inj.rationaleFormula || '';
                            let parsedSuccessfully = false;
                            
                            if (formula.includes('+') && formula.includes('=')) {
                                const eqSplit = formula.split('=');
                                const parts = eqSplit[0].split('+');
                                let parsedRows = [];
                                
                                parts.forEach(part => {
                                    // Match all currency amounts in the part
                                    const regex = /[€\\$£]\s*([\d,.]+)/g;
                                    let match;
                                    let lastMatch = null;
                                    while ((match = regex.exec(part)) !== null) {
                                        lastMatch = match;
                                    }
                                    
                                    if (lastMatch) {
                                        const lbl = part.substring(0, lastMatch.index).replace(/^Direct\s+/i, '').trim();
                                        const val = parseFloat(lastMatch[1].replace(/,/g, ''));
                                        if (val > 0) {
                                            parsedRows.push({ lbl, val });
                                        }
                                    }
                                });
                                
                                if (parsedRows.length > 1) {
                                    parsedSuccessfully = true;
                                    // Map parsedRows into injRows
                                    let targetIdx = 0;
                                    parsedRows.forEach(pr => {
                                        if (targetIdx < injRows.length) {
                                            injRows[targetIdx].label = pr.lbl || injRows[targetIdx].label;
                                            injRows[targetIdx].qty = 1;
                                            injRows[targetIdx].rate = pr.val;
                                            targetIdx++;
                                        } else {
                                            const newRow = JSON.parse(JSON.stringify(injRows[injRows.length-1]));
                                            newRow.label = pr.lbl;
                                            newRow.qty = 1;
                                            newRow.rate = pr.val;
                                            newRow.noteDetails.definition = 'From baseline: ' + pr.lbl;
                                            injRows.push(newRow);
                                        }
                                    });
                                }
                            }
                            
                            if (!parsedSuccessfully) {
                                // Fallback if no clean parse
                                injRows[0].qty = indirectOverhead > 0 ? 1 : 0;
                                injRows[0].rate = indirectOverhead;
                            }
                            
                            s.benefits.breakdowns.injuryCost = injRows;
                        }
                    } catch(e) {}

                    normalizeInjuryMedicalBenefitSeparation(s);

                    uiState.baselineApplied = true;
                    render();
                }
            }, '📊 Apply Baseline to Table');
            btnRow.appendChild(applyBaselineBtn);
        }

        // Show a dismissable confirmation strip after baseline was applied
        if (uiState.baselineApplied) {
            const strip = el('div', { className: 'flex items-center gap-2 text-xs bg-violet-50 border border-violet-200 text-violet-800 rounded-lg px-3 py-2 mt-1' });
            strip.appendChild(el('span', { className: 'font-semibold' }, '✅ Baseline figures applied'));
            const sevValue = normalizeScaleValue('severity', s.currentRisk.severity || 1, 1);
            const sevBand = toBaselineSeverityLevel(sevValue);
            strip.appendChild(document.createTextNode(` — Severity S=${formatScaleValue(sevValue)} mapped to baseline level ${sevBand} (${baselineSeverityName(sevBand)}) values pre-filled into Injury Cost, Medical, Regulatory Fine & Man-Hours with editable split rows. Insurance requires your payroll figure. Edit any value freely.`));
            strip.appendChild(el('button', {
                className: 'ml-auto text-violet-400 hover:text-violet-700 font-bold',
                onClick: () => { uiState.baselineApplied = false; render(); }
            }, '✕'));
            aiSection.appendChild(strip);
        }

        const aiBtn = el('button', {
            className: 'rab-btn rab-c-blue text-xs', disabled: uiState.aiLoading || uiState.baselineRefreshing,
            onClick: async () => {
                if (!s.proposedMeasure.description) { alert('Enter a measure description first.'); return; }
                uiState.aiLoading = true; uiState.aiError = null; render();
                try {
                    const locStr = s.location.country ? `${s.location.region ? s.location.region + ', ' : ''}${s.location.country}` : '';
                    const severityBand = toBaselineSeverityLevel(s.currentRisk.severity || 1);
                    const baselineCtx = B ? B.buildPromptContext(severityBand, s.location.currency) : '';
                    const extraCtx = {
                        processFrequencyPerWeek: uiState.processFrequencyPerWeek || null,
                        processTimeMinutesPerTask: uiState.processTimeMinutesPerTask || null,
                        avgHourlyWage: uiState.avgHourlyWage || null,
                        baselineContext: baselineCtx
                    };
                    const est = await A.estimateCosts(s.currentRisk, s.proposedMeasure.description, locStr, s.location.currency, uiState.aiModel, extraCtx);
                    if (est.costs) Object.entries(est.costs).forEach(([k, v]) => { s.proposedMeasure.costItems[k] = v; });
                    if (est.costRationales) s.proposedMeasure.costRationales = est.costRationales;
                    if (est.costBreakdowns) {
                        Object.keys(est.costBreakdowns).forEach(k => {
                            est.costBreakdowns[k].forEach(row => {
                                if(!row.noteDetails) row.noteDetails = { definition: row.label || '', basis: 'AI Estimated', autoParams: true };
                            });
                        });
                        s.proposedMeasure.costBreakdowns = est.costBreakdowns;
                    }
                    if (est.benefits) { Object.entries(est.benefits).forEach(([k, v]) => { s.benefits.items[k] = v; }); s.benefits.aiEstimates = est; }
                    if (est.benefitRationales) s.benefits.rationales = est.benefitRationales;
                    if (est.benefitBreakdowns) {
                        Object.keys(est.benefitBreakdowns).forEach(k => {
                            est.benefitBreakdowns[k].forEach(row => {
                                if(!row.noteDetails) row.noteDetails = { definition: row.label || '', basis: 'AI Estimated', autoParams: true };
                            });
                        });
                        s.benefits.breakdowns = est.benefitBreakdowns;
                    }
                    normalizeInjuryMedicalBenefitSeparation(s);
                    if (est.projectedRisk) {
                        s.projectedRisk.frequency = normalizeScaleValue('frequency', est.projectedRisk.frequency, s.projectedRisk.frequency || 1);
                        s.projectedRisk.severity = normalizeScaleValue('severity', est.projectedRisk.severity, s.projectedRisk.severity || 1);
                        s.projectedRisk.likelihood = normalizeScaleValue('likelihood', est.projectedRisk.likelihood, s.projectedRisk.likelihood || 1);
                    }
                    uiState.aiNotes = est.notes || '';
                    // Store AI snapshot for revert
                    uiState.aiSnapshot = {
                        costs: est.costs ? Object.assign({}, est.costs) : {},
                        benefits: est.benefits ? Object.assign({}, est.benefits) : {},
                        costBreakdowns: est.costBreakdowns ? JSON.parse(JSON.stringify(est.costBreakdowns)) : {},
                        benefitBreakdowns: est.benefitBreakdowns ? JSON.parse(JSON.stringify(est.benefitBreakdowns)) : {}
                    };
                    uiState.aiLoading = false; render();
                } catch (e) { uiState.aiLoading = false; uiState.aiError = e.message; render(); }
            }
        });
        if (uiState.aiLoading) {
            aiBtn.appendChild(svgSpinner(14,'#fff'));
            const timerSpan = el('span', {}, ' Estimating… 0s');
            aiBtn.appendChild(timerSpan);
            // Live elapsed timer — updates the span directly, no re-render needed
            const startTime = Date.now();
            const MESSAGES = [
                [0,   'Estimating…'],
                [20,  'Analysing risks…'],
                [45,  'Building breakdowns…'],
                [75,  'Researching costs…'],
                [110, 'Almost there…'],
                [150, 'Finalising…']
            ];
            const timerInterval = setInterval(() => {
                if (!document.body.contains(timerSpan)) { clearInterval(timerInterval); return; }
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const msg = MESSAGES.reduce((m, [t, txt]) => elapsed >= t ? txt : m, 'Estimating…');
                timerSpan.textContent = ` ${msg} ${elapsed}s`;
            }, 1000);
        } else { aiBtn.appendChild(document.createTextNode('🤖 AI Estimate Costs & Benefits')); }
        btnRow.appendChild(aiBtn);

        const helperBtn = el('button', {
            className: 'rab-btn rab-c-indigo text-xs',
            disabled: uiState.aiLoading || uiState.baselineRefreshing || uiState.summaryLoading,
            title: 'Generates a beginner-friendly executive summary using hazard/risk and current table entries.',
            onClick: async () => { await runExecutiveSummaryHelper(s); }
        });
        if (uiState.summaryLoading) {
            helperBtn.appendChild(svgSpinner(14, '#fff'));
            helperBtn.appendChild(document.createTextNode(' Building helper...'));
        } else {
            helperBtn.appendChild(document.createTextNode('📘 Executive Summary Helper'));
        }
        btnRow.appendChild(helperBtn);

        aiSection.appendChild(btnRow);

        if (uiState.aiError) aiSection.appendChild(el('div', { className: 'text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2' }, uiState.aiError));
        if (uiState.aiNotes) aiSection.appendChild(el('div', { className: 'text-xs text-slate-500 bg-white rounded p-2 border border-slate-200 mt-1' }, '💡 ' + uiState.aiNotes));
        wrap.appendChild(aiSection);

        /* ════ LEFT / RIGHT: COSTS vs BENEFITS ════ */
        const twoCols = el('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' });

        const periodLabel = uiState.recurringPeriod === 'month' ? '/mo' : '/yr';

        /* LEFT: COSTS (Red theme) */
        const costPanel = el('div', { className: 'cba-panel cba-cost-panel' + (noFade ? '' : ' cba-fade cba-fade-d1') + (uiState.aiLoading ? ' cba-panel-ai-loading' : '') });
        const costHdr = el('div', { className: 'flex items-center justify-between mb-3 flex-wrap gap-2' });
        costHdr.appendChild(el('h5', { className: 'text-sm font-bold text-red-700 uppercase tracking-wider' }, '💰 Costs'));
        const costHdrRight = el('div', { className: 'flex items-center gap-2' });
        if (uiState.aiLoading) {
            const badge = el('span', { className: 'cba-ai-loading-badge' });
            badge.appendChild(svgSpinner(10, '#6366f1'));
            badge.appendChild(document.createTextNode('AI updating…'));
            costHdrRight.appendChild(badge);
        }
        costHdrRight.appendChild(el('span', { className: 'text-[10px] text-red-400 font-medium' }, `Recurring: ${periodLabel}`));
        costHdr.appendChild(costHdrRight);
        costPanel.appendChild(costHdr);
        const costGrid = el('div', { className: 'space-y-2.5' });
        E.COST_CATEGORIES.forEach(cat => {
            costGrid.appendChild(buildItemCard(cat, 'cost', s, sym, periodLabel));
        });
        costPanel.appendChild(costGrid);
        twoCols.appendChild(costPanel);

        /* RIGHT: BENEFITS (Green theme) */
        const benPanel = el('div', { className: 'cba-panel cba-benefit-panel' + (noFade ? '' : ' cba-fade cba-fade-d2') + (uiState.aiLoading ? ' cba-panel-ai-loading' : '') });
        const benHdr = el('div', { className: 'flex items-center justify-between mb-3 flex-wrap gap-2' });
        benHdr.appendChild(el('h5', { className: 'text-sm font-bold text-emerald-700 uppercase tracking-wider' }, '📈 Benefits'));
        const benHdrRight = el('div', { className: 'flex items-center gap-2' });
        if (uiState.aiLoading) {
            const badge2 = el('span', { className: 'cba-ai-loading-badge' });
            badge2.appendChild(svgSpinner(10, '#6366f1'));
            badge2.appendChild(document.createTextNode('AI updating…'));
            benHdrRight.appendChild(badge2);
        }
        benHdrRight.appendChild(el('span', { className: 'text-[10px] text-emerald-400 font-medium' }, `Recurring: ${periodLabel}`));
        benHdr.appendChild(benHdrRight);
        benPanel.appendChild(benHdr);
        const benGrid = el('div', { className: 'space-y-2.5' });
        E.BENEFIT_CATEGORIES.forEach(cat => {
            benGrid.appendChild(buildItemCard(cat, 'benefit', s, sym, periodLabel));
        });
        benPanel.appendChild(benGrid);
        twoCols.appendChild(benPanel);
        wrap.appendChild(twoCols);

        /* Projected risk */
        wrap.appendChild(renderProjectedRiskSection());

        /* Results panel (full width below) */
        resultsPanel = el('div', { className: noFade ? '' : 'cba-fade cba-fade-d3' });
        refreshResults();
        wrap.appendChild(resultsPanel);

        /* Action buttons */
        const saveRow = el('div', { className: 'flex flex-wrap gap-3 pt-2' });
        saveRow.appendChild(el('button', {
            className: 'rab-btn rab-c-emerald',
            onClick: () => {
                E.calculateALARP();
                const ss = E.getState(); if (!ss.result) return;
                ss.measures.push({ proposedMeasure: JSON.parse(JSON.stringify(ss.proposedMeasure)), benefits: JSON.parse(JSON.stringify(ss.benefits)), projectedRisk: JSON.parse(JSON.stringify(ss.projectedRisk)), result: JSON.parse(JSON.stringify(ss.result)), currentRisk: JSON.parse(JSON.stringify(ss.currentRisk)), _aiNotes: uiState.aiNotes, _aiSnapshot: uiState.aiSnapshot ? JSON.parse(JSON.stringify(uiState.aiSnapshot)) : null, _executiveSummary: uiState.executiveSummary ? JSON.parse(JSON.stringify(uiState.executiveSummary)) : null, _recurringPeriod: uiState.recurringPeriod, _savedAt: new Date().toISOString() });
                ss.proposedMeasure = E.createBlankState().proposedMeasure; ss.benefits = E.createBlankState().benefits; ss.projectedRisk = E.createBlankState().projectedRisk; ss.result = null;
                uiState.aiNotes = ''; uiState.aiError = null; uiState.executiveSummary = null; uiState.viewingMeasureIndex = null; render();
            }
        }, 'Save Measure'));

        // Download Report button
        const dlBtn = el('button', {
            className: 'rab-btn rab-c-indigo',
            onClick: () => {
                E.calculateALARP();
                dlBtn.textContent = 'Generating…';
                dlBtn.disabled = true;
                setTimeout(() => {
                    downloadReport();
                    dlBtn.textContent = 'Downloaded!';
                    setTimeout(() => { dlBtn.innerHTML = 'Download Report'; dlBtn.disabled = false; }, 2500);
                }, 100);
            }
        });
        dlBtn.innerHTML = 'Download Report';
        saveRow.appendChild(dlBtn);

        saveRow.appendChild(el('button', { className: 'rab-btn rab-c-blue text-xs', onClick: () => { E.resetState(); uiState.aiNotes = ''; uiState.aiError = null; uiState.executiveSummary = null; step = 'landing'; render(); } }, 'New Analysis'));
        if (E.getState().measures.length > 0) saveRow.appendChild(el('button', { className: 'rab-btn rab-c-slate text-xs', onClick: () => { step = 'compare'; render(); } }, 'Compare All'));
        wrap.appendChild(saveRow);

        /* Terms & Definitions appendix */
        wrap.appendChild(renderAppendix());

        return wrap;
    }

    function renderProjectedRiskSection() {
        const s = E.getState();
        const container = el('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3 space-y-2' });
        container.appendChild(el('span', { className: 'text-xs font-bold text-emerald-800 uppercase tracking-wider block' }, '🎯 Projected Risk After Measure'));
        const grid = el('div', { className: 'grid grid-cols-3 gap-2' });
        ['frequency', 'severity', 'likelihood'].forEach(field => {
            const grp = el('div', {});
            grp.appendChild(el('label', { className: 'text-xs font-medium text-emerald-700 block mb-1' }, field.charAt(0).toUpperCase() + field.slice(1)));
            const sel = el('select', {
                className: 'w-full text-sm border border-emerald-300 rounded px-2 py-1 bg-white',
                onChange: (e) => {
                    s.projectedRisk[field] = normalizeScaleValue(field, parseFloat(e.target.value), s.projectedRisk[field]);
                    uiState.suppressNextResultsMotion = true;
                    refreshResults();
                }
            });
            const projectedVal = normalizeScaleValue(field, s.projectedRisk[field], (RISK_SCALE_OPTIONS[field] || [])[0]?.value || 1);
            (RISK_SCALE_OPTIONS[field] || []).forEach((optData) => {
                const opt = el('option', { value: String(optData.value), title: optData.definition }, `${formatScaleValue(optData.value)} — ${optData.label}`);
                if (projectedVal === optData.value) opt.selected = true;
                sel.appendChild(opt);
            });
            grp.appendChild(sel); grid.appendChild(grp);
        });
        container.appendChild(grid);
        return container;
    }

    /* ═══════════════════════════════════════════════════════════════
       RESULTS PANEL — Animated SVG diagrams
       ═══════════════════════════════════════════════════════════════ */
    function refreshResults() {
        if (!resultsPanel) return;
        E.calculateALARP();
        const noMotion = !!uiState.suppressNextResultsMotion;
        uiState.suppressNextResultsMotion = false;
        resultsPanel.innerHTML = '';
        resultsPanel.appendChild(buildResultsPanel(noMotion));
    }

    function buildResultsPanel(noMotion) {
        const s = E.getState(); const r = s.result; const sym = currencySymbol();
        const wrap = el('div', { className: 'space-y-4' });
        if (!r || (r.totalCost === 0 && r.totalBenefit === 0)) {
            const ph = el('div', { className: 'flex flex-col items-center justify-center text-center p-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200' });
            ph.appendChild(el('div', { className: 'text-5xl mb-3' }, '⚖️'));
            ph.appendChild(el('p', { className: 'text-sm font-semibold text-slate-500' }, 'Live ALARP results will appear here'));
            ph.appendChild(el('p', { className: 'text-xs text-slate-400 mt-1' }, 'Enter costs and benefits above to see animated analysis'));
            wrap.appendChild(ph);
            return wrap;
        }

        /* Time horizon quick-select bar — live controls above verdict */
        const horzBar = el('div', { className: 'flex items-center justify-center gap-3 bg-slate-50 rounded-xl border border-slate-200 px-4 py-2' });
        horzBar.appendChild(el('span', { className: 'text-xs font-semibold text-slate-500 mr-1' }, '⏱ Lifecycle:'));
        E.TIME_HORIZONS.forEach(yr => {
            const btn = el('button', {
                className: cls('rab-btn text-xs', s.proposedMeasure.timeHorizon === yr ? 'rab-c-blue' : 'rab-c-slate'),
                onClick: () => { s.proposedMeasure.timeHorizon = yr; render(); }
            }, `${yr} yr`);
            horzBar.appendChild(btn);
        });
        horzBar.appendChild(el('span', { className: 'text-xs text-slate-400 ml-1' }, `→ ${sym}${formatNum(r.totalCost)} cost / ${sym}${formatNum(r.totalBenefit)} benefit over ${s.proposedMeasure.timeHorizon} yr`));
        wrap.appendChild(horzBar);

        /* Verdict banner */
        const ratioStr = r.ratio === Infinity ? '∞' : r.ratio.toFixed(2);
        const banner = el('div', {
            className: 'cba-panel text-center' + (noMotion ? '' : ' cba-fade'),
            style: { background: `linear-gradient(135deg, ${r.verdictColor}12 0%, ${r.verdictColor}08 100%)`, border: `3px solid ${r.verdictColor}` }
        });
        banner.appendChild(el('div', { className: 'text-xl font-black', style: { color: r.verdictColor } }, r.verdict));
        banner.appendChild(el('p', { className: 'text-xs mt-1', style: { color: r.verdictColor } }, r.verdictLabel));
        banner.appendChild(el('div', { className: 'text-5xl font-black mt-2', style: { color: r.verdictColor } }, ratioStr));
        banner.appendChild(el('p', { className: 'text-xs text-slate-400 mt-0.5' }, 'Adjusted Benefit ÷ Cost Ratio'));
        wrap.appendChild(banner);

        /* Stats grid */
        const stats = el('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' + (noMotion ? '' : ' cba-fade cba-fade-d1') });
        [
            { label: 'Total Cost',   value: `${sym}${formatNum(r.totalCost)}`,       sub: `${r.timeHorizon}-yr lifecycle`, accent: '#ef4444' },
            { label: 'Raw Benefit',  value: `${sym}${formatNum(r.totalBenefit)}`,    sub: `${r.timeHorizon}-yr lifecycle`, accent: '#22c55e' },
            { label: 'Disp. Factor', value: `×${r.dfFactor}`,                        sub: `${r.dfLabel} risk`,            accent: '#6366f1' },
            { label: 'Adj. Benefit', value: `${sym}${formatNum(r.adjustedBenefit)}`, sub: 'Benefit × DF',                 accent: '#0ea5e9' },
        ].forEach(stat => {
            const card = el('div', { className: 'rounded-xl border p-3 text-center bg-white', style: { borderColor: stat.accent + '40' } });
            card.appendChild(el('div', { className: 'text-[10px] uppercase tracking-wide font-semibold', style: { color: stat.accent } }, stat.label));
            card.appendChild(el('div', { className: 'text-lg font-black text-slate-800 mt-1' }, stat.value));
            card.appendChild(el('div', { className: 'text-[10px] text-slate-400' }, stat.sub));
            stats.appendChild(card);
        });
        wrap.appendChild(stats);

        /* Animated cost-vs-benefit bar chart */
        wrap.appendChild(buildCostBenefitBars(r, sym, noMotion));

        /* Risk reduction cards */
        const compRow = el('div', { className: 'grid grid-cols-2 gap-3' + (noMotion ? '' : ' cba-fade cba-fade-d2') });
        [{ label: 'Before', score: r.currentScore, cat: r.currentCategory }, { label: 'After', score: r.projectedScore, cat: r.projectedCategory }].forEach(item => {
            const c = E.getRiskColor(item.cat); const b = E.getRiskBg(item.cat);
            const card = el('div', { className: 'rounded-xl border-2 p-3 text-center', style: { borderColor: c, backgroundColor: b } });
            card.appendChild(el('div', { className: 'text-[10px] text-slate-500' }, item.label));
            card.appendChild(el('div', { className: 'text-3xl font-black', style: { color: c } }, String(item.score)));
            card.appendChild(el('span', { className: 'text-[10px] font-bold text-white px-2 py-0.5 rounded', style: { backgroundColor: c } }, item.cat));
            compRow.appendChild(card);
        });
        wrap.appendChild(compRow);
        if (r.riskReduction > 0) wrap.appendChild(el('div', { className: 'text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-2' }, `↓ ${r.riskReduction} pts risk reduction (${Math.round((r.riskReduction / r.currentScore) * 100)}%)`));

        /* Two diagrams side by side */
        const diagrams = el('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' + (noMotion ? '' : ' cba-fade cba-fade-d3') });
        diagrams.appendChild(buildALARPTriangle(r));
        diagrams.appendChild(buildCarrotDiagram(r, s));
        wrap.appendChild(diagrams);

        return wrap;
    }

    /* ═══════ ANIMATED COST vs BENEFIT BARS ═══════ */
    function buildCostBenefitBars(r, sym, noMotion) {
        const maxVal = Math.max(r.totalCost, r.adjustedBenefit, 1);
        const container = el('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 space-y-3' + (noMotion ? '' : ' cba-fade cba-fade-d1') });
        container.appendChild(el('h6', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider' }, '📊 Cost vs Adjusted Benefit'));

        [{ label: 'Total Cost', value: r.totalCost, color: '#ef4444', bg: '#fecaca' },
         { label: 'Adj. Benefit', value: r.adjustedBenefit, color: '#22c55e', bg: '#bbf7d0' }
        ].forEach(item => {
            const row = el('div', { className: 'space-y-1' });
            const labelRow = el('div', { className: 'flex justify-between text-xs' });
            labelRow.appendChild(el('span', { className: 'font-semibold', style: { color: item.color } }, item.label));
            labelRow.appendChild(el('span', { className: 'font-bold text-slate-700' }, `${sym}${formatNum(item.value)}`));
            row.appendChild(labelRow);
            const track = el('div', { className: 'h-5 bg-slate-100 rounded-full overflow-hidden' });
            const pct = Math.min((item.value / maxVal) * 100, 100);
            const bar = el('div', {
                className: 'h-full rounded-full' + (noMotion ? '' : ' cba-bar-grow'),
                style: { '--bar-w': pct + '%', width: pct + '%', background: `linear-gradient(90deg, ${item.bg}, ${item.color})` }
            });
            track.appendChild(bar);
            row.appendChild(track);
            container.appendChild(row);
        });
        return container;
    }

    /* ═══════ ALARP TRIANGLE — HSE Tolerability of Risk (Canvas 2D) ═══════ */
    function buildALARPTriangle(r) {
        const container = el('div', { className: 'bg-white rounded-2xl border border-slate-200 p-5 shadow-sm' });
        container.appendChild(el('h6', { className: 'text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center' }, '🔺 ALARP Tolerability Triangle'));

        const dpr = window.devicePixelRatio || 1;
        const W = 560, H = 360;
        const canvas = el('canvas', { width: String(W * dpr), height: String(H * dpr), style: `width:${W}px;height:${H}px;display:block;margin:auto` });
        container.appendChild(canvas);

        requestAnimationFrame(() => {
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // --- geometry --- (triangle occupies 34..426, callout at 436..530)
            const apexX = 230, apexY = 28;
            const baseY = 290, baseL = 34, baseR = 420;
            function lx(y) { return apexX - (apexX - baseL) * (y - apexY) / (baseY - apexY); }
            function rx(y) { return apexX + (baseR - apexX) * (y - apexY) / (baseY - apexY); }
            const d1 = 128, d2 = 210;

            // --- zone fill helper ---
            function fillZone(pts, color1, color2) {
                const grad = ctx.createLinearGradient(0, pts[0][1], 0, pts[pts.length-1][1]);
                grad.addColorStop(0, color1);
                grad.addColorStop(1, color2);
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Zone 1 — Unacceptable (top / narrow)
            fillZone([[apexX,apexY],[lx(d1),d1],[rx(d1),d1]], 'rgba(220,38,38,0.92)', 'rgba(239,68,68,0.75)');
            // Zone 2 — ALARP / Tolerable (middle)
            fillZone([[lx(d1),d1],[rx(d1),d1],[rx(d2),d2],[lx(d2),d2]], 'rgba(245,158,11,0.88)', 'rgba(251,191,36,0.70)');
            // Zone 3 — Broadly Acceptable (bottom / wide)
            fillZone([[lx(d2),d2],[rx(d2),d2],[baseR,baseY],[baseL,baseY]], 'rgba(22,163,74,0.82)', 'rgba(74,222,128,0.65)');

            // --- divider dashed lines ---
            [[d1,'rgba(255,255,255,0.6)'],[d2,'rgba(255,255,255,0.6)']].forEach(([dy, sc]) => {
                ctx.beginPath(); ctx.setLineDash([7,4]);
                ctx.moveTo(lx(dy), dy); ctx.lineTo(rx(dy), dy);
                ctx.strokeStyle = sc; ctx.lineWidth = 2; ctx.stroke();
                ctx.setLineDash([]);
            });

            // --- outer triangle border shadow ---
            ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.moveTo(apexX,apexY); ctx.lineTo(baseL,baseY); ctx.lineTo(baseR,baseY); ctx.closePath();
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.shadowBlur = 0;

            // --- zone labels (positioned near center of each zone, clear of dot area) ---
            // Dot will be placed at the BOTTOM third of each zone — labels go in the TOP/CENTER
            function zoneLabel(title, subtitle, topY, botY) {
                const midY = topY + (botY - topY) * 0.38; // upper 38% of zone
                const zoneWidth = rx(midY) - lx(midY);
                // Only draw pill if zone is wide enough
                if (zoneWidth > 60) {
                    const pillW = Math.min(zoneWidth - 16, 220);
                    const pillX = apexX - pillW / 2;
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';
                    ctx.beginPath(); ctx.roundRect(pillX, midY - 20, pillW, 40, 6); ctx.fill();
                }
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px "Segoe UI", sans-serif';
                ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4;
                ctx.fillText(title, apexX, midY - 4);
                ctx.font = '10px "Segoe UI", sans-serif'; ctx.globalAlpha = 0.9;
                ctx.fillText(subtitle, apexX, midY + 11);
                ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            }

            zoneLabel('Unacceptable',       'Risk cannot be justified',                   apexY, d1);
            zoneLabel('ALARP \u2013 Tolerable', 'Reduce risk so far as reasonably practicable', d1,    d2);
            zoneLabel('Broadly Acceptable', 'No additional ALARP demonstration needed',   d2,    baseY);

            // --- left side rotated label ---
            ctx.save();
            ctx.translate(14, (apexY + baseY) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.font = 'bold 9px "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(100,116,139,0.8)';
            ctx.fillText('▲  INCREASING RISK  ▲', 0, 0);
            ctx.restore();

            // --- verdict dot: placed at LOWER portion of its zone (clear of top labels) ---
            // Zones: 1=(apexY..d1), 2=(d1..d2), 3=(d2..baseY)
            const dotYMap = {
                DISPROPORTIONATE: d1    - (d1 - apexY) * 0.22,   // ~78% down zone 1
                BORDERLINE:       d1    + (d2 - d1)   * 0.72,   // ~72% down zone 2
                IMPLEMENT:        d2    + (baseY - d2) * 0.72    // ~72% down zone 3
            };
            const dotY = dotYMap[r.verdict] || dotYMap['BORDERLINE'];
            const dotX = apexX;
            const ratioStr = r.ratio === Infinity ? '∞' : r.ratio.toFixed(2);
            const vc = r.verdictColor || '#6366f1';

            // glow behind dot
            const grd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 20);
            grd.addColorStop(0, vc + 'aa');
            grd.addColorStop(1, vc + '00');
            ctx.beginPath(); ctx.arc(dotX, dotY, 20, 0, Math.PI * 2);
            ctx.fillStyle = grd; ctx.fill();

            // dot
            ctx.beginPath(); ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
            ctx.fillStyle = vc; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

            // callout box to the right
            const cbX = baseR + 8, cbY = dotY - 22, cbW = 90, cbH = 44;
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.roundRect(cbX, cbY, cbW, cbH, 8); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = vc; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(cbX, cbY, cbW, cbH, 8); ctx.stroke();

            // dashed leader
            ctx.beginPath(); ctx.setLineDash([5,3]);
            ctx.moveTo(dotX + 11, dotY); ctx.lineTo(cbX, dotY);
            ctx.strokeStyle = vc; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.setLineDash([]);

            ctx.textAlign = 'center';
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillStyle = vc;
            ctx.fillText(r.verdict, cbX + cbW / 2, cbY + 16);
            ctx.font = '9px "Segoe UI", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(`BCR: ${ratioStr}`, cbX + cbW / 2, cbY + 32);

            // --- legend ---
            const legY = baseY + 20;
            [['#dc2626','Unacceptable'],['#f59e0b','ALARP'],['#22c55e','Acceptable']].forEach(([c,t], i) => {
                const lx2 = 34 + i * 160;
                ctx.fillStyle = c;
                ctx.beginPath(); ctx.roundRect(lx2, legY, 12, 12, 3); ctx.fill();
                ctx.font = '10px "Segoe UI", sans-serif';
                ctx.fillStyle = '#475569'; ctx.textAlign = 'left';
                ctx.fillText(t, lx2 + 16, legY + 10);
            });
        });

        return container;
    }

    /* ═══════ COST vs BENEFIT — Professional Bar Chart (Canvas 2D) ═══════ */
    function buildCarrotDiagram(r, s) {
        const container = el('div', { className: 'bg-white rounded-2xl border border-slate-200 p-5 shadow-sm' });
        container.appendChild(el('h6', { className: 'text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center' }, '⚖️ Cost vs Benefit Analysis'));

        const sym = currencySymbol();

        const dpr = window.devicePixelRatio || 1;
        const W = 460, H = 360;
        const canvas = el('canvas', { width: String(W * dpr), height: String(H * dpr), style: `width:${W}px;height:${H}px;display:block;margin:auto` });
        container.appendChild(canvas);

        requestAnimationFrame(() => {
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            const pad = { l: 88, r: 20, t: 50, b: 90 };
            const chartL = pad.l, chartR = W - pad.r, chartT = pad.t, chartB = H - pad.b;
            const chartW = chartR - chartL, chartH = chartB - chartT;
            const maxVal = Math.max(r.totalCost, r.totalBenefit, r.adjustedBenefit, 1) * 1.1;

            // Subtle background
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath(); ctx.roundRect(chartL - 10, chartT - 10, chartW + 20, chartH + 20, 8); ctx.fill();

            // Gridlines
            for (let i = 0; i <= 5; i++) {
                const gy = chartB - (i / 5) * chartH;
                const gv = Math.round((i / 5) * maxVal);
                ctx.beginPath();
                ctx.setLineDash(i === 0 ? [] : [4, 3]);
                ctx.moveTo(chartL, gy); ctx.lineTo(chartR, gy);
                ctx.strokeStyle = i === 0 ? '#94a3b8' : '#e2e8f0';
                ctx.lineWidth = i === 0 ? 2 : 1; ctx.stroke();
                ctx.setLineDash([]);
                if (i > 0) {
                    ctx.textAlign = 'right'; ctx.font = '10px "Segoe UI", sans-serif';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(`${sym}${formatNum(gv)}`, chartL - 6, gy + 4);
                }
            }

            // Y axis line
            ctx.beginPath(); ctx.moveTo(chartL, chartT - 15); ctx.lineTo(chartL, chartB);
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

            // Bars
            const bars3 = [
                { label: 'Total Cost',       value: r.totalCost,       c1: '#ef4444', c2: '#fca5a5' },
                { label: 'Raw Benefit',      value: r.totalBenefit,    c1: '#22c55e', c2: '#86efac' },
                { label: 'Adj. Benefit',     value: r.adjustedBenefit, c1: '#3b82f6', c2: '#93c5fd' }
            ];
            const barW3 = Math.floor(chartW / 5);
            const totalBar = barW3 * 3 + barW3 / 2 * 2;
            const bStart = chartL + (chartW - totalBar) / 2;

            bars3.forEach((b, i) => {
                const bx = bStart + i * (barW3 + barW3 / 2);
                const bH = maxVal > 0 ? (b.value / maxVal) * chartH : 4;
                const by = chartB - bH;

                // Drop shadow
                ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowOffsetY = 4; ctx.shadowBlur = 8;
                const g = ctx.createLinearGradient(bx, by, bx, chartB);
                g.addColorStop(0, b.c1); g.addColorStop(1, b.c2);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.roundRect(bx, by, barW3, bH, [8, 8, 0, 0]); ctx.fill();
                ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;

                // Value label above bar
                ctx.textAlign = 'center'; ctx.font = 'bold 11px "Segoe UI", sans-serif';
                ctx.fillStyle = b.c1;
                ctx.fillText(`${sym}${formatNum(b.value)}`, bx + barW3 / 2, by - 8);

                // Axis label
                ctx.font = '10px "Segoe UI", sans-serif'; ctx.fillStyle = '#475569';
                ctx.fillText(b.label, bx + barW3 / 2, chartB + 18);
            });

            // DF bracket annotation (between Raw Benefit and Adj Benefit bars)
            const rawCx = bStart + (barW3 + barW3 / 2) + barW3 / 2;
            const adjCx = bStart + 2 * (barW3 + barW3 / 2) + barW3 / 2;
            const bracketY = chartT - 30;
            ctx.beginPath();
            ctx.moveTo(rawCx, bracketY + 10); ctx.lineTo(rawCx, bracketY);
            ctx.lineTo(adjCx, bracketY);
            ctx.lineTo(adjCx, bracketY + 10);
            ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.setLineDash([]);
            ctx.stroke();
            // Arrow head
            ctx.beginPath(); ctx.moveTo(adjCx - 5, bracketY + 5); ctx.lineTo(adjCx, bracketY + 12); ctx.lineTo(adjCx + 5, bracketY + 5);
            ctx.fillStyle = '#6366f1'; ctx.fill();
            // DF label
            const midBrack = (rawCx + adjCx) / 2;
            ctx.textAlign = 'center'; ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#4f46e5';
            ctx.fillText(`× ${r.dfFactor} DF`, midBrack, bracketY - 4);

            // Verdict pill
            const pillY = chartB + 50;
            const pillW2 = 200, pillH2 = 30;
            const pillX2 = W / 2 - pillW2 / 2;
            const vc = r.verdictColor || '#6366f1';
            const pillG = ctx.createLinearGradient(pillX2, pillY, pillX2 + pillW2, pillY);
            pillG.addColorStop(0, vc);
            pillG.addColorStop(1, vc + 'cc');
            ctx.shadowColor = vc + '55'; ctx.shadowBlur = 12;
            ctx.fillStyle = pillG;
            ctx.beginPath(); ctx.roundRect(pillX2, pillY, pillW2, pillH2, pillH2 / 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center'; ctx.font = 'bold 12px "Segoe UI", sans-serif';
            ctx.fillStyle = '#fff';
            const ratioStr2 = r.ratio === Infinity ? '∞' : r.ratio.toFixed(2);
            ctx.fillText(`${r.verdict}  •  BCR ${ratioStr2}`, W / 2, pillY + 20);

            // Legend
            const legY2 = pillY + pillH2 + 12;
            bars3.forEach((b, i) => {
                const lx3 = 50 + i * 140;
                ctx.fillStyle = b.c1;
                ctx.beginPath(); ctx.roundRect(lx3, legY2, 12, 12, 3); ctx.fill();
                ctx.font = '10px "Segoe UI", sans-serif'; ctx.fillStyle = '#475569'; ctx.textAlign = 'left';
                ctx.fillText(b.label + (i === 2 ? ` (×${r.dfFactor} DF)` : ''), lx3 + 16, legY2 + 10);
            });
        });

        return container;
    }

    /* ═══════════════════════════════════════════════════════════════
       COMPARE VIEW
       ═══════════════════════════════════════════════════════════════ */
    function renderCompare() {
        const s = E.getState(); const sym = currencySymbol();
        const wrap = el('div', { className: 'space-y-6 cba-fade' });
        wrap.appendChild(renderStepHeader('Measure Comparison', null));
        if (s.measures.length === 0) { wrap.appendChild(el('p', { className: 'text-sm text-slate-600' }, 'No saved measures to compare.')); return wrap; }

        const tableWrap = el('div', { className: 'overflow-x-auto' });
        const table = el('table', { className: 'w-full text-sm border-collapse' });
        const thead = el('thead');
        const hRow = el('tr', { className: 'bg-slate-100' });
        ['#', 'Measure', 'Level', 'Total Cost', 'Adj. Benefit', 'Ratio', 'Verdict', 'Actions'].forEach(h => hRow.appendChild(el('th', { className: 'text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200' }, h)));
        thead.appendChild(hRow); table.appendChild(thead);
        const tbody = el('tbody');
        s.measures.forEach((m, i) => {
            const res = m.result || {};
            const loadMeasure = () => {
                const ss = E.getState();
                ss.proposedMeasure = JSON.parse(JSON.stringify(m.proposedMeasure));
                ss.benefits = JSON.parse(JSON.stringify(m.benefits));
                ss.projectedRisk = JSON.parse(JSON.stringify(m.projectedRisk));
                ss.result = JSON.parse(JSON.stringify(m.result));
                ss.currentRisk = JSON.parse(JSON.stringify(m.currentRisk));
                uiState.aiNotes = m._aiNotes || '';
                uiState.aiSnapshot = m._aiSnapshot || null;
                uiState.executiveSummary = m._executiveSummary || null;
                if (m._recurringPeriod) uiState.recurringPeriod = m._recurringPeriod;
                uiState.viewingMeasureIndex = i;
                step = 'analyze';
                render();
            };
            const savedAt = m._savedAt ? ` — saved ${new Date(m._savedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : '';
            const tr = el('tr', { className: (i % 2 === 0 ? 'bg-white' : 'bg-slate-50') + ' cursor-pointer hover:bg-blue-50 transition-colors', onClick: loadMeasure, title: `Click to view full analysis for measure #${i+1}${savedAt}` });
            tr.appendChild(el('td', { className: 'px-3 py-2 font-bold text-slate-800 border-b border-slate-100' }, String(i + 1)));
            tr.appendChild(el('td', { className: 'px-3 py-2 text-slate-700 border-b border-slate-100 max-w-[160px] truncate' }, m.proposedMeasure ? m.proposedMeasure.description : '—'));
            tr.appendChild(el('td', { className: 'px-3 py-2 text-slate-600 border-b border-slate-100' }, m.proposedMeasure && m.proposedMeasure.controlLevel ? `L${m.proposedMeasure.controlLevel}` : '—'));
            tr.appendChild(el('td', { className: 'px-3 py-2 font-semibold border-b border-slate-100' }, `${sym}${formatNum(res.totalCost || 0)}`));
            tr.appendChild(el('td', { className: 'px-3 py-2 font-semibold border-b border-slate-100' }, `${sym}${formatNum(res.adjustedBenefit || 0)}`));
            tr.appendChild(el('td', { className: 'px-3 py-2 font-bold border-b border-slate-100', style: { color: res.verdictColor || '#64748b' } }, res.ratio === Infinity ? '∞' : (res.ratio || 0).toFixed(2)));
            tr.appendChild(el('td', { className: 'px-3 py-2 font-bold border-b border-slate-100', style: { color: res.verdictColor || '#64748b' } }, res.verdict || '—'));
            const actTd = el('td', { className: 'px-3 py-2 border-b border-slate-100 whitespace-nowrap' });
            actTd.appendChild(el('button', { className: 'rab-btn rab-c-blue text-xs mr-1', onClick: (e) => { e.stopPropagation(); loadMeasure(); } }, '👁 View'));
            actTd.appendChild(el('button', { className: 'rab-btn text-xs', style: { background: '#ef4444', color: '#fff' }, onClick: (e) => { e.stopPropagation(); if (confirm(`Delete saved measure #${i + 1}?`)) { s.measures.splice(i, 1); render(); } } }, '🗑'));
            tr.appendChild(actTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody); tableWrap.appendChild(table); wrap.appendChild(tableWrap);

        if (s.measures.length >= 2) {
            const aiBox = el('div', { className: 'bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2' });
            aiBox.appendChild(renderModelSelector());
            const aiCmpBtn = el('button', {
                className: 'rab-btn rab-c-blue text-xs',
                onClick: async () => {
                    aiCmpBtn.disabled = true; aiCmpBtn.textContent = 'Comparing…';
                    try {
                        const comp = await A.compareMeasures(s.measures, uiState.aiModel);
                        if (comp) {
                            aiBox.innerHTML = '';
                            aiBox.appendChild(el('h5', { className: 'font-semibold text-blue-800 text-sm mb-2' }, '🤖 AI Recommendation:'));
                            aiBox.appendChild(el('p', { className: 'text-sm text-blue-900' }, `Recommended: Measure #${comp.recommendation}. ${comp.reasoning}`));
                            if (comp.ranking) aiBox.appendChild(el('p', { className: 'text-xs text-blue-700 mt-1' }, `Ranking: ${comp.ranking.map(r2 => '#' + r2).join(' > ')}`));
                        }
                    } catch (e) { aiCmpBtn.disabled = false; aiCmpBtn.textContent = '🤖 AI Compare (failed — retry)'; }
                }
            }, '🤖 AI Compare Measures');
            aiBox.appendChild(aiCmpBtn); wrap.appendChild(aiBox);
        }

        wrap.appendChild(el('div', { className: 'flex gap-3' },
            el('button', { className: 'rab-btn rab-c-slate', onClick: () => { E.resetState(); uiState = { aiLoading: false, aiError: null, locationDetected: false, freshDescription: '', selectedRow: null, aiNotes: '', executiveSummary: null, recurringPeriod: uiState.recurringPeriod, aiModel: uiState.aiModel }; step = 'landing'; render(); } }, 'New Analysis'),
            el('button', { className: 'rab-btn rab-c-blue text-xs', onClick: () => { step = 'analyze'; render(); } }, '← Back to Analyze')
        ));
        return wrap;
    }

    /* ═══════ MEASURE HISTORY ═══════ */
    function renderMeasureHistory() {
        const s = E.getState();
        const container = el('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2' });
        container.appendChild(el('h5', { className: 'text-sm font-semibold text-slate-700' }, `📋 Saved Analyses (${s.measures.length}):`));
        s.measures.forEach((m, i) => {
            const res = m.result || {};
            const loadMeasure = () => {
                const ss = E.getState();
                ss.proposedMeasure = JSON.parse(JSON.stringify(m.proposedMeasure));
                ss.benefits = JSON.parse(JSON.stringify(m.benefits));
                ss.projectedRisk = JSON.parse(JSON.stringify(m.projectedRisk));
                ss.result = JSON.parse(JSON.stringify(m.result));
                ss.currentRisk = JSON.parse(JSON.stringify(m.currentRisk));
                uiState.aiNotes = m._aiNotes || '';
                uiState.aiSnapshot = m._aiSnapshot || null;
                uiState.executiveSummary = m._executiveSummary || null;
                if (m._recurringPeriod) uiState.recurringPeriod = m._recurringPeriod;
                uiState.viewingMeasureIndex = i;
                step = 'analyze';
                render();
            };
            const item = el('div', { className: 'flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors', onClick: loadMeasure, title: `Click to view full analysis for measure #${i+1}` });
            item.appendChild(el('span', { className: 'text-xs font-bold text-slate-500' }, `#${i + 1}`));
            item.appendChild(el('span', { className: 'text-sm text-slate-700 flex-1 truncate' }, m.proposedMeasure ? m.proposedMeasure.description : '—'));
            item.appendChild(el('span', { className: 'text-xs font-bold px-2 py-0.5 rounded text-white', style: { backgroundColor: res.verdictColor || '#64748b' } }, res.verdict || '—'));
            item.appendChild(el('button', { className: 'rab-btn rab-c-blue text-xs ml-1', onClick: (e) => { e.stopPropagation(); loadMeasure(); } }, '👁'));
            container.appendChild(item);
        });
        if (s.measures.length >= 2) container.appendChild(el('button', { className: 'rab-btn rab-c-blue text-xs', onClick: () => { step = 'compare'; render(); } }, 'View Comparison'));
        return container;
    }

    /* ═══════ COMMON ═══════ */
    function renderStepHeader(title, backStep) {
        const header = el('div', { className: 'flex items-center gap-3' });
        if (backStep) header.appendChild(el('button', { className: 'rab-btn rab-c-slate text-xs', onClick: () => { step = backStep; render(); } }, '← Back'));
        header.appendChild(el('h4', { className: 'text-lg font-bold text-slate-900' }, title));
        return header;
    }

    /* ═══════════════════════════════════════════════════════════════
       MANUAL BASELINE EDITOR
       Allows users to view and edit all Luxembourg OSH baseline
       figures (6 metrics × 5 severity levels) without AI.
       ═══════════════════════════════════════════════════════════════ */
    function renderBaselineEditor() {
        const B = window.CBA.baseline;
        if (!B) return el('div', {}, 'Baseline module not loaded.');

        const backTarget = uiState.baselineBackStep || 'landing';
        const wrap = el('div', { className: 'space-y-6 cba-fade' });
        wrap.appendChild(renderStepHeader('📋 Edit Luxembourg Baseline Figures', backTarget));

        // Info banner
        wrap.appendChild(el('div', { className: 'flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800' },
            el('span', { className: 'text-xl flex-shrink-0' }, '🇱🇺'),
            el('div', {},
                el('b', {}, 'Luxembourg OSH Baseline Registry '),
                document.createTextNode('— these values anchor all cost & benefit AI estimates. They reflect AAA (2024), MDE (2025), ITM (2024) and STATEC data from the Luxembourg workplace safety financial analysis. Edit any value below and click Save.')
            )
        ));

        // Working copy of current data
        const currentData = JSON.parse(JSON.stringify(B.getAll()));

        const METRICS = [
            {
                key: 'incidentRates',
                label: 'Incident Rate',
                unit: 'cases / 100 FTE / yr',
                description: 'Workplace accident cases per 100 FTE per year — from AAA Annual Report 2024 (13,724 accidents / 501,285 working units).',
                icon: '📊',
                color: '#3b82f6',
                isMonetary: false
            },
            {
                key: 'daysAwayFromWork',
                label: 'Days Away From Work',
                unit: 'days',
                description: 'Median absence days per case. Lohnfortzahlung (salary continuation) applies until end of month of 77th day. MDE reimburses 80%; employer absorbs 20% deadweight.',
                icon: '📅',
                color: '#8b5cf6',
                isMonetary: false
            },
            {
                key: 'medicalCostUSD',
                label: 'Direct Medical Cost',
                unit: '€ / case',
                description: 'Direct AAA-covered costs per case (emergency, hospitalization, treatment). National AAA average 2024 = €4,053 for a standard workplace accident.',
                icon: '🏥',
                color: '#ef4444',
                isMonetary: true
            },
            {
                key: 'injuryCostPerCase',
                label: 'Total Cost Per Case (Iceberg Model)',
                unit: '€ / case',
                description: 'Full direct + indirect cost: unrecovered salary (20% MDE deadweight) + lost productivity + overtime + admin + asset damage + AAA Malus lagging. Verified severity-3 core baseline (Section 8.2) = €27,341.',
                icon: '🧊',
                color: '#dc2626',
                isMonetary: true
            },
            {
                key: 'insurancePremiumChangePct',
                label: 'AAA Bonus-Malus Premium Change',
                unit: '% change',
                description: 'Expected % increase in AAA accident insurance premium after one incident. Base rate 2025 = 0.70%. Multipliers: ×0.85 (bonus) → ×1.00 → ×1.10 → ×1.30 → ×1.50 (max malus).',
                icon: '📈',
                color: '#f59e0b',
                isMonetary: false
            },
            {
                key: 'regulatoryFineUSD',
                label: 'ITM Regulatory Fine Risk',
                unit: '€ / violation',
                description: 'ITM Luxembourg fine exposure per violation. 2024: 1,152 fines totalling €6,370,500 (avg €5,530). Max = €4,000 × number of workers concerned. 116 criminal referrals for fatal accidents.',
                icon: '⚖️',
                color: '#7c3aed',
                isMonetary: true
            }
        ];

        const SEV_LABELS = [
            { sev: '1', label: 'Negligible', sub: 'First-aid, no declaration', color: '#16a34a' },
            { sev: '2', label: 'Minor',      sub: '<4 days absence, AAA declared', color: '#65a30d' },
            { sev: '3', label: 'Moderate',   sub: '5–30 days, standard AAA accident', color: '#ca8a04' },
            { sev: '4', label: 'Major',       sub: '31–77 days, Lohnfortzahlung period', color: '#ea580c' },
            { sev: '5', label: 'Catastrophic', sub: 'Permanent disability / fatality', color: '#dc2626' }
        ];

        // Build editable sections
        METRICS.forEach(metric => {
            const section = el('div', { className: 'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm' });

            // Section header
            const header = el('div', { className: 'flex items-start gap-3 px-5 py-4 border-b border-slate-100', style: { background: '#f8fafc' } });
            header.appendChild(el('span', { className: 'text-2xl flex-shrink-0 mt-0.5' }, metric.icon));
            const headerText = el('div', { className: 'flex-1' });
            headerText.appendChild(el('div', { className: 'font-bold text-slate-900 text-sm' }, metric.label));
            headerText.appendChild(el('div', { className: 'text-xs text-slate-500 mt-0.5' }, metric.description));
            header.appendChild(headerText);
            header.appendChild(el('span', { className: 'text-xs font-mono text-slate-400 flex-shrink-0 mt-1' }, metric.unit));
            section.appendChild(header);

            // Rows: one per severity
            SEV_LABELS.forEach(({ sev, label, sub, color }) => {
                const entry = currentData[metric.key] && currentData[metric.key][sev]
                    ? currentData[metric.key][sev]
                    : { value: 0, unit: metric.unit, source: '', year: 2024, notes: '' };

                const row = el('div', { className: 'grid grid-cols-1 gap-2 px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors' });

                // Severity badge + value input on one line
                const topRow = el('div', { className: 'flex items-center gap-3 flex-wrap' });
                const evidenceComplete = !!(entry.sourceUrl || sourceUrlForText(entry.source, entry.sourceUrl)) && !!(entry.figureUsed || entry.value != null) && !!(entry.rationaleFormula || entry.notes);
                const badge = el('span', {
                    className: 'text-xs font-bold text-white px-2 py-1 rounded-lg flex-shrink-0 min-w-max',
                    style: { background: color }
                }, `S${sev} — ${label}`);
                topRow.appendChild(badge);
                topRow.appendChild(el('span', { className: 'text-xs text-slate-500' }, sub));
                topRow.appendChild(el('span', {
                    className: `text-[10px] px-2 py-0.5 rounded-full border ${evidenceComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`
                }, evidenceComplete ? 'Verified evidence' : 'Needs source/evidence'));

                // Value input
                const valueWrap = el('div', { className: 'ml-auto flex items-center gap-2' });
                valueWrap.appendChild(el('span', { className: 'text-xs text-slate-400' }, metric.isMonetary ? '€' : ''));
                const valueInput = el('input', {
                    type: 'number',
                    value: entry.value,
                    step: metric.isMonetary ? '1' : '0.01',
                    min: '0',
                    className: 'border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono w-32 text-right focus:outline-none focus:ring-2 focus:ring-amber-400',
                    title: `${metric.label} — Severity ${sev}`,
                    onInput: (e) => {
                        if (!currentData[metric.key]) currentData[metric.key] = {};
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].value = parseFloat(e.target.value) || 0;
                    }
                });
                valueWrap.appendChild(valueInput);
                valueWrap.appendChild(el('span', { className: 'text-xs text-slate-400 min-w-max' }, metric.unit));
                topRow.appendChild(valueWrap);
                row.appendChild(topRow);

                // Source + year + notes on second line (collapsed by default)
                const detailToggle = el('button', {
                    className: 'text-xs text-slate-400 hover:text-amber-600 text-left transition-colors',
                    onClick: (e) => {
                        const detail = e.target.parentElement.querySelector('.bl-detail');
                        if (detail) detail.style.display = detail.style.display === 'none' ? 'grid' : 'none';
                        e.target.textContent = detail && detail.style.display === 'none' ? '▸ Show source, links & evidence' : '▾ Hide source, links & evidence';
                    }
                }, '▸ Show source, links & evidence');
                row.appendChild(detailToggle);

                const detail = el('div', { className: 'bl-detail grid grid-cols-1 gap-2 mt-1', style: { display: 'none' } });

                // Source
                const srcRow = el('div', { className: 'flex items-center gap-2' });
                srcRow.appendChild(el('label', { className: 'text-xs text-slate-500 w-14 flex-shrink-0' }, 'Source:'));
                const srcInput = el('input', {
                    type: 'text',
                    value: entry.source || '',
                    placeholder: 'e.g. AAA Annual Report 2024',
                    className: 'flex-1 border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300',
                    onInput: (e) => {
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].source = e.target.value;
                    }
                });
                srcRow.appendChild(srcInput);

                // Source URL + open button
                const srcUrlInput = el('input', {
                    type: 'url',
                    value: entry.sourceUrl || sourceUrlForText(entry.source, entry.sourceUrl),
                    placeholder: 'https://... (direct source URL)',
                    className: 'flex-1 border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300',
                    onInput: (e) => {
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].sourceUrl = e.target.value;
                    }
                });
                srcRow.appendChild(srcUrlInput);
                const openSourceBtn = el('a', {
                    href: srcUrlInput.value || '#',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'rab-btn rab-c-slate text-[10px]',
                    onClick: (ev) => {
                        if (!srcUrlInput.value) ev.preventDefault();
                    }
                }, 'Open');
                srcUrlInput.addEventListener('input', () => {
                    openSourceBtn.setAttribute('href', srcUrlInput.value || '#');
                });
                srcRow.appendChild(openSourceBtn);

                // Year
                const yearInput = el('input', {
                    type: 'number',
                    value: entry.year || 2024,
                    min: '2000',
                    max: '2099',
                    className: 'border border-slate-200 rounded-lg px-2 py-1 text-xs w-20 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300',
                    onInput: (e) => {
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].year = parseInt(e.target.value) || 2024;
                    }
                });
                srcRow.appendChild(yearInput);
                detail.appendChild(srcRow);

                // Notes
                const notesRow = el('div', { className: 'flex items-start gap-2' });
                notesRow.appendChild(el('label', { className: 'text-xs text-slate-500 w-14 flex-shrink-0 mt-1' }, 'Notes:'));
                const notesInput = el('input', {
                    type: 'text',
                    value: entry.notes || '',
                    placeholder: 'Contextual notes about this value…',
                    className: 'flex-1 border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300',
                    onInput: (e) => {
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].notes = e.target.value;
                    }
                });
                notesRow.appendChild(notesInput);
                detail.appendChild(notesRow);

                // Figure used
                const figRow = el('div', { className: 'flex items-start gap-2' });
                figRow.appendChild(el('label', { className: 'text-xs text-slate-500 w-14 flex-shrink-0 mt-1' }, 'Figure:'));
                const figInput = el('input', {
                    type: 'text',
                    value: entry.figureUsed || `${entry.value || 0} ${entry.unit || metric.unit}`,
                    placeholder: 'Exact figure used (e.g. €6,370,500 / 1,152)',
                    className: 'flex-1 border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300',
                    onInput: (e) => {
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].figureUsed = e.target.value;
                    }
                });
                figRow.appendChild(figInput);
                detail.appendChild(figRow);

                // Rationale formula
                const formulaRow = el('div', { className: 'flex items-start gap-2' });
                formulaRow.appendChild(el('label', { className: 'text-xs text-slate-500 w-14 flex-shrink-0 mt-1' }, 'Formula:'));
                const formulaInput = el('input', {
                    type: 'text',
                    value: entry.rationaleFormula || entry.notes || '',
                    placeholder: 'Rationale formula used for this figure',
                    className: 'flex-1 border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300',
                    onInput: (e) => {
                        if (!currentData[metric.key][sev]) currentData[metric.key][sev] = {};
                        currentData[metric.key][sev].rationaleFormula = e.target.value;
                    }
                });
                formulaRow.appendChild(formulaInput);
                detail.appendChild(formulaRow);

                row.appendChild(detail);
                section.appendChild(row);
            });

            wrap.appendChild(section);
        });

        // Luxembourg reference card
        const refCard = el('div', { className: 'bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1' });
        refCard.appendChild(el('div', { className: 'font-bold text-blue-900 mb-2' }, '🔑 Key Luxembourg Reference Values (2024–2025)'));
        const refs = [
            { text: 'AAA base contribution rate 2025: 0.70% of gross payroll (employer only)', url: SOURCE_URLS.AAA_BONUS },
            { text: 'AAA Bonus-Malus multipliers: ×0.85 (15% bonus) | ×1.00 (neutral) | ×1.10 | ×1.30 | ×1.50 (50% max malus)', url: SOURCE_URLS.AAA_BONUS },
            { text: 'MDE reimbursement: 80% of employer cost — employer permanently absorbs 20% deadweight', url: SOURCE_URLS.MDE_AFFILIATION },
            { text: 'MDE Class 1 premium 2025: 0.07% | Class 2: 0.99% (+0.92% gap = 14× multiplier)', url: SOURCE_URLS.MDE_FINANCING },
            { text: 'ITM 2024: avg fine €5,530 | max €4,000/worker/violation | 116 criminal referrals for fatal accidents', url: SOURCE_URLS.ITM_REPORT_PDF },
            { text: 'STATEC 2024: median hourly wage ~€28/hr | daily employer cost ~€257/day', url: SOURCE_URLS.STATEC_PORTAL },
            { text: 'AAA 2024 national avg direct accident cost: €4,053 | 128 accidents/day nationally', url: SOURCE_URLS.AAA_STATS },
            { text: 'ISSA Return on Prevention (ROP): 2.2 — every €1 invested in prevention → €2.20 return', url: SOURCE_URLS.ISSA_ROP }
        ];
        refs.forEach(r => {
            const rEl = el('div', { className: 'flex items-baseline gap-1' });
            rEl.appendChild(el('span', { className: 'flex-shrink-0' }, '•'));
            rEl.appendChild(document.createTextNode(r.text + ' '));
            rEl.appendChild(el('a', {
                href: r.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'underline text-blue-700'
            }, 'source'));
            refCard.appendChild(rEl);
        });
        wrap.appendChild(refCard);

        // Action buttons
        const actRow = el('div', { className: 'flex flex-wrap gap-3 justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200' });

        const resetBtn = el('button', {
            className: 'rab-btn rab-c-slate text-xs',
            onClick: () => {
                if (confirm('Reset all baseline figures to Luxembourg factory defaults (AAA/MDE/ITM/STATEC 2024–2025)?')) {
                    B.reset();
                    render();
                }
            }
        }, '↺ Reset to Luxembourg Defaults');
        actRow.appendChild(resetBtn);

        const rightBtns = el('div', { className: 'flex gap-3' });
        rightBtns.appendChild(el('button', {
            className: 'rab-btn rab-c-slate text-xs',
            onClick: () => { step = backTarget; render(); }
        }, '✕ Cancel'));

        const saveBtn = el('button', {
            className: 'rab-btn rab-c-emerald',
            onClick: () => {
                // Ensure all entries have the correct unit stored
                METRICS.forEach(metric => {
                    SEV_LABELS.forEach(({ sev }) => {
                        if (currentData[metric.key] && currentData[metric.key][sev]) {
                            currentData[metric.key][sev].unit = metric.unit;
                        }
                    });
                });
                B.update(currentData, 'Luxembourg', 'EUR', 'manual');
                step = backTarget;
                render();
            }
        }, '💾 Save Baseline Figures');
        rightBtns.appendChild(saveBtn);
        actRow.appendChild(rightBtns);
        wrap.appendChild(actRow);

        return wrap;
    }

    /* ═══════════════════════════════════════════════════════════════
       TERMS & DEFINITIONS APPENDIX (collapsible)
       ═══════════════════════════════════════════════════════════════ */
    function renderAppendix() {
        const TERMS = [
            { term: 'AAA', def: 'Association d\'Assurance Accident (Luxembourg). Mandatory workplace accident insurer for employers. Provides annual accident counts, direct average accident cost, and bonus-malus premium framework.' },
            { term: 'MDE', def: 'Mutualité des Employeurs (Luxembourg). Employer mutual fund for salary continuation (Lohnfortzahlung), reimbursing 80% of eligible employer salary continuation costs.' },
            { term: 'ITM', def: 'Inspection du Travail et des Mines (Luxembourg labor inspectorate). Enforces workplace safety and can issue administrative fines and transmit grave cases for criminal proceedings.' },
            { term: 'STATEC', def: 'Institut national de la statistique et des études économiques du Grand-Duché de Luxembourg. Official source for wage and labor market benchmarks used in this model.' },
            { term: 'ALARP', def: 'As Low As Reasonably Practicable. A legal duty principle (UK HSE, COMAH, OSHA PSM) requiring risk to be reduced until the cost of further reduction is grossly disproportionate to the benefit gained.' },
            { term: 'Benefit-Cost Ratio (BCR)', def: 'Adjusted Benefit divided by Total Cost. BCR > 1.0 means the measure is reasonably practicable. BCR 0.5–1.0 is borderline. BCR < 0.5 indicates costs are grossly disproportionate.' },
            { term: 'Disproportion Factor (DF)', def: 'A multiplier applied to raw benefits to reflect the moral obligation to act when risk is high. HSE R2P2 guidance: LOW risk ×1, MEDIUM ×2, HIGH ×4, CRITICAL ×10.' },
            { term: 'Lifecycle Cost', def: 'Total cost of a measure over the chosen time horizon (e.g. 5 years). One-off costs are counted once; recurring costs are multiplied by the number of years.' },
            { term: 'Adjusted Benefit', def: 'Raw Benefit × Disproportion Factor. Represents the effective benefit weight when compared against cost to justify action.' },
            { term: 'Risk Score', def: 'Risk Score = Frequency × Severity × Likelihood using the standard scales in this tool (F: 1/1.25/1.5/1.75/2, S: 1/3/5/7/9/10, L: 1/3/5/8/10). Response bands: LOW 1-19, MEDIUM 20-49, HIGH 50-71, CRITICAL 72-200.' },
            { term: 'Control Measure (CM) Ladder', def: 'Hierarchy from most to least effective: L6 Elimination → L5 Substitution → L4 Engineering Controls → L3 Visual/Warning Controls → L2 Administrative Controls → L1 PPE.' },
            { term: 'Frequency', def: 'Standard scale: 1 RARELY (Month <0.5 day, Year 1 day); 1.25 OCCASIONAL (Day <30 min, Week <2 hours, Month <1 day, Year <5 days); 1.5 INTERMEDIATE (Day 30-120 min, Week 2-8 hours, Month 1-4 days, Year 5 days to 2 months); 1.75 FREQUENTLY (Day 2-5 hours, Week 1-3 days, Month 4-15 days, Year 2-5 months); 2 PERMANENT (Day >5 hours, Week >3 days, Month >15 days, Year >5 months).' },
            { term: 'Severity', def: 'Standard scale: 1 No potential of injury (no treatment); 3 Potential of FIRST AID (non-prescription medication); 5 Potential of MEDICAL TREATMENT (prescription medications); 7 Potential of DART (temporary disability); 9 Potential of SIA (amputation); 10 Potential of Fatality (death).' },
            { term: 'Likelihood', def: 'Standard scale: 1 Almost impossible; 3 Very unlikely; 5 Possible to happen; 8 Likely to happen; 10 Very likely to happen. Classification is based on machinery reachability (ISO 13857/13849), industrial hygiene class/CML context, and event history over 3-5 years.' },
            { term: 'Risk Rating & Response', def: 'LOW (1-19): low priority, reduce if feasible. MEDIUM (20-49): reduce over time, prioritize higher risks first. HIGH (50-71): action plan required, lower priority than critical. CRITICAL (72-200): deploy interim protections immediately and prioritize permanent secure controls; clearly communicate exposure risk to associates.' },
            { term: 'Lost Workday Cases (LWC)', def: 'Injuries causing the worker to miss at least one working day. OSHA uses "Days Away from Work" (DAFW) as a standard metric. Avg for severity-3 injuries: ~48 hours.' },
            { term: 'Injury Cost Avoidance', def: 'The estimated non-medical savings from preventing injuries. Includes lost wage compensation, productivity loss, investigation time, retraining, and equipment repair. Direct medical/statutory compensation is tracked separately under Medical Cost Savings.' },
            { term: 'Regulatory Fine Avoidance', def: 'Expected penalty value = maximum statutory fine × probability of citation. UK HSE can issue unlimited fines per the Health and Safety (Offences) Act 2008. OSHA maximum per wilful violation: $156,259 (2024).' },
            { term: 'Insurance Premium Reduction', def: 'Demonstrating improved safety performance and ALARP compliance typically reduces Employers Liability / General Liability insurance premiums by 5–25% depending on loss history.' },
            { term: 'Man-Hours Saved', def: 'Labour time per year recovered because the process or task is made safer/faster. Calculated as: time saved per occurrence × occurrences per year × hourly labour rate.' },
            { term: 'Production Uptime Gain', def: 'Value of production recovered by avoiding incident-related stoppages. Calculated as: downtime hours avoided per year × hourly production throughput value.' },
            { term: 'Time Horizon', def: 'The period over which lifecycle costs and recurring benefits are accumulated for the ALARP comparison. Common values: 1, 3, 5, or 10 years.' },
            { term: 'Broadly Acceptable Risk', def: 'Risk so low that no specific ALARP justification is required. Typically equivalent to <10⁻⁶ annual individual risk of death.' },
            { term: 'Tolerable / ALARP Zone', def: 'Risk level that society accepts only if it is ALARP. Requires active demonstration that costs vs benefits have been evaluated.' },
            { term: 'Unacceptable Risk', def: 'Risk level that cannot be justified regardless of cost. Typically equivalent to >10⁻³ annual individual risk of death. Work must not proceed without risk reduction.' },
            { term: 'BLS', def: 'U.S. Bureau of Labor Statistics. Publishes annual Survey of Occupational Injuries and Illnesses (SOII) and Census of Fatal Occupational Injuries (CFOI) used as cost benchmarks.' },
            { term: 'OSHA', def: 'Occupational Safety and Health Administration (USA). Sets enforceable safety standards and provides injury-cost benchmarks for US workplaces.' },
            { term: 'HSE', def: 'Health and Safety Executive (UK). Publishes R2P2 (Reducing Risks, Protecting People) which defines the formal ALARP tolerability framework used in this tool.' },
            { term: 'Worker Retention Benefit', def: 'Cost saved by reducing turnover caused by poor safety culture. Industry estimates: replacing one worker costs 50–200% of annual salary in recruitment, onboarding, and lost productivity.' }
        ];

        const outer = el('div', { className: 'cba-appendix-outer border border-slate-200 rounded-2xl overflow-hidden' });

        // Toggle header
        const header = el('div', {
            className: 'flex items-center justify-between p-4 bg-slate-700 cursor-pointer select-none',
            onClick: () => {
                const body = outer.querySelector('.cba-appendix-body');
                const arrow = outer.querySelector('.cba-appendix-arrow');
                const isOpen = body.classList.toggle('open');
                arrow.textContent = isOpen ? '▾' : '▸';
            }
        });
        const titleRow = el('div', { className: 'flex items-center gap-3' });
        titleRow.appendChild(el('span', { className: 'text-lg' }, '📖'));
        titleRow.appendChild(el('div', {},
            el('h5', { className: 'text-sm font-bold text-white' }, 'Appendix — Terms & Definitions'),
            el('p', { className: 'text-xs text-slate-400 mt-0.5' }, `${TERMS.length} terms used in this ALARP Cost-Benefit Analysis`)
        ));
        header.appendChild(titleRow);
        const arrow = el('span', { className: 'cba-appendix-arrow text-slate-300 text-lg font-bold' }, '▸');
        header.appendChild(arrow);
        outer.appendChild(header);

        // Collapsible body
        const body = el('div', { className: 'cba-appendix-body' });

        // Search filter
        const filterRow = el('div', { className: 'p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2' });
        const filterInp = el('input', {
            type: 'text',
            className: 'flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400',
            placeholder: '🔍 Filter terms…'
        });
        filterRow.appendChild(filterInp);
        body.appendChild(filterRow);

        // Terms list
        const termsList = el('div', { className: 'divide-y divide-slate-100 max-h-96 overflow-y-auto bg-white' });
        TERMS.forEach(({ term, def }) => {
            const termId = 'cba-term-' + term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
            const row = el('div', { id: termId, className: 'cba-term-row p-3.5 hover:bg-indigo-50 transition-colors' });
            row.appendChild(el('div', { className: 'text-sm font-bold text-indigo-700 mb-0.5' }, term));
            row.appendChild(el('div', { className: 'text-sm text-slate-600 leading-relaxed' }, def));
            termsList.appendChild(row);
        });
        body.appendChild(termsList);

        filterInp.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            termsList.querySelectorAll('.cba-term-row').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });

        outer.appendChild(body);
        return outer;
    }

    /* ═══════════════════════════════════════════════════════════════
       HTML REPORT GENERATOR
       ═══════════════════════════════════════════════════════════════ */
    function generateHTMLReport(triangleImg, barImg) {
        const s = E.getState();
        const r = s.result;
        const sym = currencySymbol();
        const loc = s.location;
        const E2 = window.CBA.engine;

        const dateStr = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
        const locationStr = [loc.region, loc.country].filter(Boolean).join(', ') || 'Not specified';
        const verdictColor = r ? (r.verdictColor || '#64748b') : '#64748b';
        const verdict = r ? r.verdict : 'PENDING';
        const bcr = r ? (r.ratio === Infinity ? '∞' : r.ratio.toFixed(2)) : '—';

        const E_COST = E2.COST_CATEGORIES;
        const E_BEN = E2.BENEFIT_CATEGORIES;

        function fmtN(n) { return n == null ? '0' : Number(n).toLocaleString('en', { maximumFractionDigits: 0 }); }
        function htmlTermLink(text) {
            if (!text) return '';
            const u = text.toUpperCase();
            let tid = null;
            if (u.includes('BLS') || u.includes('DAFW')) tid = 'term-bls';
            else if (u.includes('OSHA'))                 tid = 'term-osha';
            else if (u.includes('HSE') || u.includes('R2P2')) tid = 'term-hse';
            else if (u.includes('ALARP'))                tid = 'term-alarp';
            else if (u.includes('LWC') || u.includes('WORKDAY')) tid = 'term-lost-workday-cases-lwc';
            if (!tid) return text;
            return `<a class="term-link" href="#${tid}" onclick="(function(){var e=document.getElementById('${tid}');if(!e)return;var d=document.querySelector('details');if(d)d.open=true;e.scrollIntoView({behavior:'smooth',block:'center'});e.classList.add('hl');setTimeout(function(){e.classList.remove('hl')},2500);})();return false;">${text}</a>`;
        }
        function escapeHtmlText(text) {
            return String(text || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        function renderRationaleHtml(rationaleText) {
            const lines = String(rationaleText || '').split(/\r?\n/);
            let sourceText = '';
            lines.forEach((line) => {
                const m = String(line || '').trim().match(/^Source:\s*(.+)$/i);
                if (m && !sourceText) sourceText = m[1].trim();
            });

            return lines.map((line) => {
                const trimmed = String(line || '').trim();
                if (!trimmed) return '';

                const mdMatch = trimmed.match(/^Source link:\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/i);
                const rawMatch = trimmed.match(/^Source link:\s*(https?:\/\/\S+)\s*$/i);
                const lblMatch = trimmed.match(/^Source link:\s*(.+)\s*$/i);

                let label = 'Source';
                let url = '';

                if (mdMatch) {
                    label = mdMatch[1] || 'Source';
                    url = mdMatch[2] || '';
                } else if (rawMatch) {
                    label = 'Source';
                    url = rawMatch[1] || '';
                } else if (lblMatch) {
                    label = lblMatch[1] || 'Source';
                    url = sourceUrlForText(sourceText, '');
                }

                if (url && /^https?:\/\//i.test(url)) {
                    return `Source link: <a href="${escapeHtmlText(url)}" target="_blank" rel="noopener noreferrer">${escapeHtmlText(label)}</a>`;
                }

                return escapeHtmlText(line);
            }).join('<br>');
        }
        function parseQtyReasonForHtml(reasonText) {
            const raw = String(reasonText || '').replace(/\s+/g, ' ').trim();
            const out = { definition: '', basis: '', parameters: '', formula: '' };
            if (!raw) return out;
            const pKey = 'Parameters used:';
            const fKey = 'Formula =';
            const pIdx = raw.indexOf(pKey);
            if (pIdx >= 0) {
                out.basis = raw.slice(0, pIdx).replace(/^Audit basis:\s*/i, '').trim().replace(/[;\s]+$/, '');
                const tail = raw.slice(pIdx + pKey.length).trim();
                const fIdx = tail.indexOf(fKey);
                if (fIdx >= 0) {
                    out.parameters = tail.slice(0, fIdx).trim().replace(/^[;\s]+|[;\s]+$/g, '');
                    out.formula = tail.slice(fIdx).trim();
                } else {
                    out.parameters = tail.trim().replace(/^[;\s]+|[;\s]+$/g, '');
                }
            } else {
                const fIdx = raw.indexOf(fKey);
                if (fIdx >= 0) {
                    out.basis = raw.slice(0, fIdx).replace(/^Audit basis:\s*/i, '').trim().replace(/[;\s]+$/, '');
                    out.formula = raw.slice(fIdx).trim();
                } else {
                    out.basis = raw.replace(/^Audit basis:\s*/i, '').trim();
                }
            }
            return out;
        }
        function htmlSourceContext(sourceText, reasonText) {
            const combined = `${sourceText || ''} ${reasonText || ''}`.toUpperCase();
            const lines = [];
            if (combined.includes('AAA')) lines.push('AAA = Association d\'Assurance Accident (Luxembourg workplace accident insurer).');
            if (combined.includes('ITM')) lines.push('ITM = Inspection du Travail et des Mines (Luxembourg labour inspectorate).');
            if (combined.includes('MDE')) lines.push('MDE = Mutualité des Employeurs (Luxembourg employer salary-continuation mutual).');
            if (combined.includes('STATEC')) lines.push('STATEC = Luxembourg national statistics institute (wage and labour benchmarks).');
            return lines;
        }
                function htmlQtyReasonBlock(row) {
                        if (!row || (!row.qtyReason && !row.noteDetails)) return '';
                        const parsed = parseQtyReasonForHtml(row.qtyReason || '');
                        const note = getRowQtyNoteParts(row, sym);
                        const definition = note.definition || parsed.definition || row.label || '';
                        const basis = note.basis || parsed.basis || '';
                        const parameters = note.parameters || parsed.parameters || '';
                        const formula = note.formula || String(parsed.formula || '').replace(/^Formula\s*=\s*/i, '') || '';
                        const ctx = htmlSourceContext(row.source, row.qtyReason);
                        const srcUrl = sourceUrlForText(row.source, row.sourceUrl);
            return `
              <div style="margin-top:5px;padding:6px 8px;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;">
                                ${definition ? `<div style="font-size:11px;line-height:1.45;color:#475569;"><b style="color:#1e293b;">Definition:</b> ${definition}</div>` : ''}
                                ${basis ? `<div style="font-size:11px;line-height:1.45;color:#475569;margin-top:2px;"><b style="color:#1e293b;">Basis:</b> ${basis}</div>` : ''}
                                ${parameters ? `<div style="font-size:11px;line-height:1.45;color:#475569;margin-top:2px;"><b style="color:#1e293b;">Parameters:</b> ${parameters}</div>` : ''}
                                ${formula ? `<div style="font-size:11px;line-height:1.45;color:#475569;margin-top:2px;"><b style="color:#1e293b;">Formula:</b> ${formula}</div>` : ''}
                                <div style="font-size:11px;line-height:1.45;color:#475569;margin-top:3px;"><b style="color:#1e293b;">Source:</b> ${row.source ? htmlTermLink(row.source) : 'Not specified'}${srcUrl ? ` <a href="${srcUrl}" target="_blank" rel="noopener noreferrer">[source]</a>` : ''}</div>
                ${ctx.length ? `<div style="margin-top:4px;font-size:10px;line-height:1.4;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:5px;padding:4px 6px;"><b>Context:</b> ${ctx.join(' ')}</div>` : ''}
              </div>`;
        }
        function costTotal() {
            if (!r) return 0;
            return r.totalCost;
        }
        function benTotal() {
            if (!r) return 0;
            return r.totalBenefit;
        }

        function renderBreakdownRows(breakdowns, catKey) {
            const rows = (breakdowns || {})[catKey] || [];
            if (!rows.length) return '';
            const rowsHtml = rows.map(bk => {
                                const srcUrl = sourceUrlForText(bk.source, bk.sourceUrl);
                                const srcHtml = bk.source
                                        ? `📎 ${htmlTermLink(bk.source)}${srcUrl ? ` <a href="${srcUrl}" target="_blank" rel="noopener noreferrer">[source]</a>` : ''}`
                                        : '';
                                const qtyNoteHtml = (bk.qtyReason || bk.noteDetails) ? `
              <tr class="qty-note"><td colspan="8" style="padding:2px 12px 8px 44px;font-size:11px;color:#64748b;font-style:italic;">
                                                                ${htmlQtyReasonBlock(bk)}
              </td></tr>` : '';
                return `
              <tr class="bkdn-row">
                <td style="padding:5px 12px 5px 28px;color:#64748b;font-size:12px;">${bk.label || '—'}</td>
                <td style="text-align:center;font-size:12px;padding:5px 6px;">${bk.qty}</td>
                <td style="text-align:center;font-size:11px;color:#94a3b8;padding:5px 2px;">×</td>
                <td style="text-align:center;font-size:12px;padding:5px 6px;">${bk.rate}</td>
                <td style="text-align:center;font-size:11px;color:#94a3b8;padding:5px 2px;">=</td>
                <td style="text-align:right;font-size:12px;font-weight:600;padding:5px 8px;">${sym}${fmtN((bk.qty||0)*(bk.rate||0))}</td>
                <td style="font-size:10px;color:#94a3b8;padding:5px 8px;font-style:italic;">${bk.unit || ''}</td>
                <td style="font-size:10px;color:#94a3b8;padding:5px 8px;">${srcHtml}</td>
              </tr>${qtyNoteHtml}`;
            }).join('');
            return `
              <tr><td colspan="2" style="padding:0;">
                <table style="width:100%;border-collapse:collapse;background:#f8fafc;">
                  <tr style="background:#f1f5f9;">
                    <th style="padding:4px 12px 4px 28px;font-size:10px;color:#94a3b8;text-align:left;font-weight:600;">COMPONENT</th>
                    <th style="padding:4px 6px;font-size:10px;color:#94a3b8;text-align:center;">QTY</th>
                    <th></th>
                    <th style="padding:4px 6px;font-size:10px;color:#94a3b8;text-align:center;">RATE</th>
                    <th></th>
                    <th style="padding:4px 8px;font-size:10px;color:#94a3b8;text-align:right;">SUBTOTAL</th>
                    <th style="padding:4px 8px;font-size:10px;color:#94a3b8;">UNIT</th>
                    <th style="padding:4px 8px;font-size:10px;color:#94a3b8;">SOURCE</th>
                  </tr>
                  ${rowsHtml}
                </table>
              </td></tr>`;
        }

        function buildItemCards(categories, items, rationales, breakdowns, isCost) {
            const accent = isCost ? { border:'#ef4444',bg:'#fef2f2',hdr:'#991b1b',chip:'#dc2626',chipBg:'#fef2f2',bkHdr:'#fef2f2',bkHdr2:'#fee2e2',notesBg:'#fff8f8', bkAccent:'#fca5a5', ratBg:'#fff5f5', ratBorder:'#fca5a5' } : { border:'#22c55e',bg:'#f0fdf4',hdr:'#065f46',chip:'#16a34a',chipBg:'#f0fdf4',bkHdr:'#f0fdf4',bkHdr2:'#d1fae5',notesBg:'#f0fbf4', bkAccent:'#86efac', ratBg:'#f0fdf4', ratBorder:'#86efac' };
            return categories.map(cat => {
                const rawVal = items[cat.key] || 0;
                const rationale = (rationales || {})[cat.key] || '';
                const bkRows = (breakdowns || {})[cat.key] || [];

                // ── Breakdown table HTML ──
                const bkRowsHtml = bkRows.map(bk => {
                    const srcUrl = sourceUrlForText(bk.source, bk.sourceUrl);
                    const srcHtml = bk.source ? `<span style="font-size:10px;color:#94a3b8;font-style:italic;">📎 ${htmlTermLink(bk.source)}${srcUrl ? ` <a href="${srcUrl}" target="_blank" rel="noopener noreferrer">[source]</a>` : ''}</span>` : '';
                                        const qtyNoteHtml = (bk.qtyReason || bk.noteDetails) ? `<tr><td colspan="8" style="padding:3px 10px 7px 36px;font-size:11px;color:#64748b;background:linear-gradient(to right,#f0f9ff88,#f8fafc44);">${htmlQtyReasonBlock(bk)}</td></tr>` : '';
                    return `<tr style="border-bottom:1px solid ${accent.bkAccent}22;">
                      <td style="padding:6px 8px 6px 14px;font-size:12px;color:#475569;">${bk.label || '—'}<br>${srcHtml}</td>
                      <td style="padding:6px 8px;text-align:center;font-weight:600;font-size:13px;">${bk.qty}</td>
                      <td style="padding:6px 4px;text-align:center;font-size:11px;color:#94a3b8;">×</td>
                      <td style="padding:6px 8px;text-align:center;font-weight:600;font-size:13px;">${bk.rate}</td>
                      <td style="padding:6px 4px;text-align:center;font-size:11px;color:#94a3b8;">=</td>
                      <td style="padding:6px 10px;text-align:right;font-weight:700;font-size:13px;color:${accent.chip};">${sym}${fmtN((bk.qty||0)*(bk.rate||0))}</td>
                      <td style="padding:6px 8px;font-size:10px;color:#94a3b8;white-space:nowrap;">${bk.unit||''}</td>
                    </tr>${qtyNoteHtml}`;
                }).join('');

                // ── Quantity notes footer ──
                                const qtNotes = bkRows.filter(r => r.qtyReason || r.noteDetails);
                const qtNotesHtml = qtNotes.length ? `
                  <div style="margin-top:10px;padding:10px 14px;background:${accent.notesBg};border-top:1px dashed ${accent.bkAccent};border-radius:0 0 8px 8px;font-size:11px;">
                    <div style="font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-size:10px;margin-bottom:5px;">Quantity Notes:</div>
                                        ${qtNotes.map(n => {
                                                                                                return `<div style="margin-bottom:5px;"><div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:3px;">• ${n.label}</div>${htmlQtyReasonBlock(n)}</div>`;
                                        }).join('')}
                  </div>` : '';

                // ── Unit & sigma row ──
                const units = [...new Set(bkRows.map(r => r.unit).filter(Boolean))].join(' / ');
                const sigma = bkRows.reduce((acc, r) => acc + (r.qty||0)*(r.rate||0), 0);
                const unitSigmaHtml = bkRows.length ? `
                  <tr style="background:${accent.bkHdr2};"><td colspan="6" style="padding:6px 14px;"><span style="font-size:11px;color:#94a3b8;">Units: ${units}</span></td>
                  <td style="padding:6px 10px;text-align:right;font-weight:800;font-size:13px;color:${accent.chip};">Σ ${sym}${fmtN(sigma)}</td></tr>` : '';

                const bkHtml = bkRows.length ? `
                  <details open style="margin-top:8px;">
                    <summary style="font-size:11px;font-weight:700;color:${accent.chip};cursor:pointer;padding:4px 0;list-style:none;display:flex;align-items:center;gap:5px;">
                      <span style="font-size:10px;">▶</span> Component Breakdown (${bkRows.length} row${bkRows.length>1?'s':''})
                    </summary>
                    <div style="margin-top:8px;border:1px solid ${accent.bkAccent};border-radius:8px;overflow:hidden;">
                      <table style="width:100%;border-collapse:collapse;font-size:12px;">
                        <thead style="background:${accent.bkHdr};">
                          <tr>
                            <th style="padding:7px 14px;text-align:left;font-size:10px;font-weight:700;color:${accent.chip};text-transform:uppercase;letter-spacing:.04em;">Component</th>
                            <th style="padding:7px 8px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Qty</th>
                            <th></th>
                            <th style="padding:7px 8px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Rate</th>
                            <th></th>
                            <th style="padding:7px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Subtotal</th>
                            <th style="padding:7px 8px;font-size:10px;color:#94a3b8;">Unit</th>
                          </tr>
                        </thead>
                        <tbody>${bkRowsHtml}</tbody>
                        ${unitSigmaHtml}
                      </table>
                      ${qtNotesHtml}
                    </div>
                  </details>` : '';

                return `
                <div style="border-left:4px solid ${accent.border};background:#fff;border-radius:0 10px 10px 0;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <span style="font-size:13px;font-weight:700;color:${accent.hdr};">${cat.label}${cat.recurring ? ' <span style="font-size:10px;font-weight:400;color:'+accent.chip+';">(annual)</span>' : ' <span style="font-size:10px;font-weight:400;color:#94a3b8;">(once)</span>'}</span>
                    <span style="font-size:15px;font-weight:900;color:${accent.chip};white-space:nowrap;padding:4px 14px;background:${accent.chipBg};border-radius:8px;">${sym}${fmtN(rawVal)}</span>
                  </div>
                                    ${rationale ? `<div style="margin-top:8px;padding:8px 12px;background:${accent.ratBg};border-left:3px solid ${accent.ratBorder};border-radius:0 6px 6px 0;font-size:12px;color:#475569;font-style:italic;line-height:1.6;">💡 ${renderRationaleHtml(rationale)}</div>` : ''}
                  ${bkHtml}
                </div>`;
            }).join('');
        }

        const hazardTags = (s.currentRisk.hazards || []).map(h =>
            `<span style="display:inline-block;background:#e2e8f0;color:#334155;font-size:11px;padding:2px 8px;border-radius:99px;margin:2px 2px;">${h.group}: ${h.name}</span>`
        ).join('');

        const reportFEntry = getScaleEntry('frequency', s.currentRisk.frequency);
        const reportSEntry = getScaleEntry('severity', s.currentRisk.severity);
        const reportLEntry = getScaleEntry('likelihood', s.currentRisk.likelihood);

        const measuresTableHtml = s.measures.length ? `
            <h3 style="color:#1e293b;margin:32px 0 12px;font-size:16px;">📋 All Saved Measures</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
              <thead><tr style="background:#f1f5f9;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">#</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">Measure</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;">Level</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">Total Cost</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">Adj. Benefit</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;">BCR</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;">Verdict</th>
              </tr></thead>
              <tbody>${s.measures.map((m, i) => {
                  const mr = m.result || {};
                  const vc = mr.verdictColor || '#64748b';
                  return `<tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px 12px;font-weight:bold;">${i+1}</td>
                    <td style="padding:8px 12px;max-width:200px;">${(m.proposedMeasure || {}).description || '—'}</td>
                    <td style="padding:8px 12px;text-align:center;">${m.proposedMeasure && m.proposedMeasure.controlLevel ? 'L'+m.proposedMeasure.controlLevel : '—'}</td>
                    <td style="padding:8px 12px;text-align:right;color:#dc2626;font-weight:600;">${sym}${fmtN(mr.totalCost||0)}</td>
                    <td style="padding:8px 12px;text-align:right;color:#16a34a;font-weight:600;">${sym}${fmtN(mr.adjustedBenefit||0)}</td>
                    <td style="padding:8px 12px;text-align:center;font-weight:bold;color:${vc};">${mr.ratio === Infinity ? '∞' : (mr.ratio||0).toFixed(2)}</td>
                    <td style="padding:8px 12px;text-align:center;"><span style="background:${vc};color:#fff;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;">${mr.verdict||'—'}</span></td>
                  </tr>`;
              }).join('')}</tbody>
            </table>` : '';

                const savedExecMeta = uiState.executiveSummary && uiState.executiveSummary.summary ? uiState.executiveSummary : null;
                const savedExecSummary = savedExecMeta ? normalizeExecutiveSummary(savedExecMeta.summary) : null;

                function renderExecDrivers(rows) {
                        if (!rows || rows.length === 0) {
                                return '<div style="font-size:12px;color:#64748b;">No driver details captured.</div>';
                        }
                        return rows.map((d) => {
                                const item = escapeHtmlText(d.item || 'Item');
                                const amount = d.amount ? ` (${escapeHtmlText(d.amount)})` : '';
                                const explanation = d.explanation ? `<div style="font-size:12px;color:#334155;margin-top:3px;">${escapeHtmlText(d.explanation)}</div>` : '';
                                const editable = d.userCanEdit ? `<div style="font-size:11px;color:#475569;margin-top:3px;">You can edit: ${escapeHtmlText(d.userCanEdit)}</div>` : '';
                                return `<div style="border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:8px;"><div style="font-size:12px;font-weight:700;color:#0f172a;">${item}${amount}</div>${explanation}${editable}</div>`;
                        }).join('');
                }

                function renderExecBullets(rows, emptyText) {
                        if (!rows || rows.length === 0) {
                                return `<div style="font-size:12px;color:#64748b;">${escapeHtmlText(emptyText)}</div>`;
                        }
                        return rows.map((x) => `<div style="font-size:12px;color:#334155;margin-top:4px;">• ${escapeHtmlText(String(x || ''))}</div>`).join('');
                }

                const executiveSummaryHtml = savedExecSummary ? (() => {
                        const generatedAt = savedExecMeta.generatedAt ? new Date(savedExecMeta.generatedAt).toLocaleString('en-GB') : 'Not recorded';
                        const method = savedExecMeta.isFallback ? 'Fallback helper' : 'AI helper';
                        const model = savedExecMeta.model ? escapeHtmlText(savedExecMeta.model) : 'Not recorded';
                        return `
    <div class="section">
        <div class="section-title">📘 Executive Summary Helper Output</div>
        <div style="font-size:11px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
            Generated: ${escapeHtmlText(generatedAt)} &nbsp;|&nbsp; Method: ${escapeHtmlText(method)} &nbsp;|&nbsp; Model: ${model}
        </div>
        <div style="margin-top:10px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
            <div style="font-size:18px;font-weight:900;color:#0f172a;">${escapeHtmlText(savedExecSummary.headline || 'Executive Summary')}</div>
            ${savedExecSummary.overview ? `<div style="margin-top:8px;font-size:13px;line-height:1.65;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;">${escapeHtmlText(savedExecSummary.overview)}</div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div style="border:1px solid #fecaca;background:#fff7f7;border-radius:10px;padding:10px;">
                    <div style="font-size:12px;font-weight:800;color:#991b1b;">Cost Drivers</div>
                    ${renderExecDrivers(savedExecSummary.costDrivers)}
                </div>
                <div style="border:1px solid #a7f3d0;background:#f0fdf4;border-radius:10px;padding:10px;">
                    <div style="font-size:12px;font-weight:800;color:#065f46;">Benefit Drivers</div>
                    ${renderExecDrivers(savedExecSummary.benefitDrivers)}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:10px;">
                    <div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:4px;">Assumptions</div>
                    ${renderExecBullets(savedExecSummary.assumptions, 'No assumptions captured.')}
                </div>
                <div style="border:1px solid #d1fae5;background:#ecfdf5;border-radius:10px;padding:10px;">
                    <div style="font-size:12px;font-weight:800;color:#065f46;margin-bottom:4px;">Next Steps</div>
                    ${renderExecBullets(savedExecSummary.nextSteps, 'No next steps captured.')}
                </div>
            </div>
        </div>
    </div>`;
                })() : '';

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALARP CBA Report — ${(s.proposedMeasure.description || 'Analysis').slice(0,50)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, sans-serif; margin: 0; background: #f8fafc; color: #1e293b; }
  .page { max-width: 960px; margin: 0 auto; background: #fff; min-height: 100vh; }
  .header-bar { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 32px 40px; }
  .header-bar h1 { margin: 0 0 4px; font-size: 22px; font-weight: 800; }
  .header-bar .subtitle { font-size: 13px; opacity: 0.7; }
  .section { padding: 28px 40px; border-bottom: 1px solid #f1f5f9; }
  .section-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .verdict-banner { border-radius: 16px; padding: 24px 32px; text-align: center; margin-bottom: 24px; border: 3px solid ${verdictColor}; background: linear-gradient(135deg, ${verdictColor}18, ${verdictColor}08); }
  .verdict-banner .big-verdict { font-size: 28px; font-weight: 900; color: ${verdictColor}; }
  .verdict-banner .bcr { font-size: 56px; font-weight: 900; color: ${verdictColor}; line-height: 1; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-card { border-radius: 12px; border: 1px solid #e2e8f0; padding: 14px; text-align: center; background: #fff; }
  .editable { border: 1px dashed #c7d2fe; border-radius: 6px; padding: 4px 8px; min-height: 24px; }
  .editable:focus { outline: none; border-color: #6366f1; background: #eef2ff; }
  .editable-note { font-size: 10px; color: #94a3b8; font-style: italic; }
  table.main-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.main-table thead tr { background: #f8fafc; }
  table.main-table th { padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600; background: #f1f5f9; }
  .risk-pill { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; color: white; }
  .footer { text-align: center; padding: 24px; font-size: 11px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  @media print {
    body { background: white; }
    .page { box-shadow: none; }
    .no-print { display: none; }
    .bkdn-row { background: #fafafa; }
  }
  details summary { cursor: pointer; font-weight: 600; color: #4f46e5; font-size: 13px; padding: 4px 0; }
  details[open] summary { color: #3730a3; }
  .terms-row { padding: 10px 0; border-bottom: 1px solid #f1f5f9; scroll-margin-top: 20px; }
  .terms-row:last-child { border-bottom: none; }
  .terms-row.hl { background: #e0e7ff; }
  .term-name { font-weight: 700; color: #4f46e5; font-size: 13px; }
  .term-def { font-size: 12px; color: #475569; margin-top: 2px; line-height: 1.5; }
  .term-link { color: #4f46e5; font-weight: 600; border-bottom: 1px dashed #4f46e5; text-decoration: none; cursor: pointer; }
  .term-link:hover { color: #3730a3; }
  .qty-note td { background: linear-gradient(to right, #f0f9ff, #f8fafc); }
  .rationale-row td { padding: 0 12px 10px; }
  .rationale-box { border-left: 3px solid; padding: 7px 12px; font-size: 12px; color: #475569; font-style: italic; border-radius: 0 6px 6px 0; }
  details > summary::marker, details > summary::-webkit-details-marker { display:none; }
  details[open] > summary span:first-child { transform: rotate(90deg); display:inline-block; }
  .report-total-bar { display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:8px;font-size:14px;font-weight:800;margin-top:4px; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header-bar">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
      <div>
        <h1>ALARP Cost-Benefit Analysis Report</h1>
        <div class="subtitle">Generated: ${dateStr} &nbsp;|&nbsp; Location: ${locationStr} &nbsp;|&nbsp; Currency: ${loc.currency || 'USD'}</div>
      </div>
      <div style="text-align:right;">
        <div style="background:${verdictColor};color:#fff;font-weight:800;font-size:14px;padding:6px 18px;border-radius:8px;">${verdict}</div>
        <div style="font-size:11px;opacity:0.65;margin-top:4px;">BCR: ${bcr}</div>
      </div>
    </div>
  </div>

  <!-- HAZARD SUMMARY -->
  <div class="section">
    <div class="section-title">🔴 Hazard &amp; Risk Assessment</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap;">
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;">HAZARD DESCRIPTION</div>
        <div class="editable" contenteditable="true" style="font-size:14px;color:#1e293b;line-height:1.6;">${s.currentRisk.description || 'Not specified'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;">RISK SCORING</div>
        <div style="display:flex;gap:16px;align-items:center;">
          <div style="text-align:center;">
            <div style="font-size:36px;font-weight:900;color:${E2.getRiskColor(s.currentRisk.category)};">${s.currentRisk.score || '—'}</div>
            <span class="risk-pill" style="background:${E2.getRiskColor(s.currentRisk.category)};">${s.currentRisk.category || '—'}</span>
          </div>
          <div style="font-size:12px;color:#475569;line-height:2;">
                        <div>Frequency: <b>${formatScaleValue(s.currentRisk.frequency)}</b>${reportFEntry ? ` (${reportFEntry.label})` : ''}</div>
                        <div>Severity: <b>${formatScaleValue(s.currentRisk.severity)}</b>${reportSEntry ? ` (${reportSEntry.label})` : ''}</div>
                        <div>Likelihood: <b>${formatScaleValue(s.currentRisk.likelihood)}</b>${reportLEntry ? ` (${reportLEntry.label})` : ''}</div>
          </div>
        </div>
      </div>
    </div>
    ${hazardTags ? `<div style="margin-top:12px;">${hazardTags}</div>` : ''}
  </div>

  <!-- PROPOSED MEASURE -->
  <div class="section">
    <div class="section-title">🛠️ Proposed Control Measure</div>
    <div style="display:grid;grid-template-columns:1fr 200px;gap:20px;align-items:start;">
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;">DESCRIPTION</div>
        <div class="editable" contenteditable="true" style="font-size:14px;color:#1e293b;line-height:1.6;">${s.proposedMeasure.description || 'Not specified'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;">CONTROL LEVEL</div>
        <div style="font-size:20px;font-weight:800;color:#6366f1;">${s.proposedMeasure.controlLevel ? 'Level ' + s.proposedMeasure.controlLevel : '—'}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">Time horizon: ${s.proposedMeasure.timeHorizon || 5} years</div>
        ${uiState.processFrequencyPerWeek ? `<div style="font-size:11px;color:#92400e;margin-top:4px;">Process frequency: ${uiState.processFrequencyPerWeek} times/week (${uiState.processTimeMinutesPerTask} min/task)</div>` : ''}
        ${uiState.taskBreakdownMinutes ? `<div style="font-size:11px;color:#92400e;margin-top:2px;">Breakdown threshold: ${uiState.taskBreakdownMinutes} min</div>` : ''}
        ${uiState.avgHourlyWage ? `<div style="font-size:11px;color:#92400e;margin-top:2px;">Avg wage: ${sym}${uiState.avgHourlyWage}/hr</div>` : ''}
      </div>
    </div>
  </div>

  <!-- COSTS & BENEFITS -->
  <div class="section">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start;">

      <!-- LEFT: COSTS -->
      <div>
        <div style="font-size:12px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #fee2e2;display:flex;align-items:center;gap:6px;">
          <span style="font-size:16px;">💰</span> Costs
        </div>
        ${buildItemCards(E_COST, s.proposedMeasure.costItems, s.proposedMeasure.costRationales, s.proposedMeasure.costBreakdowns, true)}
        <div class="report-total-bar" style="background:#fee2e2;color:#991b1b;">
          <span>TOTAL COST <span style="font-size:11px;font-weight:500;">(${s.proposedMeasure.timeHorizon||5}-yr lifecycle)</span></span>
          <span style="font-size:18px;">${sym}${fmtN(r ? r.totalCost : 0)}</span>
        </div>
      </div>

      <!-- RIGHT: BENEFITS -->
      <div>
        <div style="font-size:12px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #d1fae5;display:flex;align-items:center;gap:6px;">
          <span style="font-size:16px;">📈</span> Benefits
        </div>
        ${buildItemCards(E_BEN, s.benefits.items, s.benefits.rationales, s.benefits.breakdowns, false)}
        <div class="report-total-bar" style="background:#d1fae5;color:#065f46;">
          <span>TOTAL BENEFIT <span style="font-size:11px;font-weight:500;">(${s.proposedMeasure.timeHorizon||5}-yr lifecycle)</span></span>
          <span style="font-size:18px;">${sym}${fmtN(r ? r.totalBenefit : 0)}</span>
        </div>
      </div>

    </div>
  </div>

  <!-- ALARP RESULTS -->
  ${r ? `
  <div class="section">
    <div class="section-title">⚖️ ALARP Analysis Results</div>
    <div class="verdict-banner">
      <div class="big-verdict">${verdict}</div>
      <div style="font-size:13px;color:${verdictColor};margin:4px 0 12px;">${r.verdictLabel}</div>
      <div class="bcr">${bcr}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Adjusted Benefit ÷ Cost (Benefit Cost Ratio)</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.06em;">Total Cost</div><div style="font-size:20px;font-weight:900;color:#1e293b;margin-top:4px;">${sym}${fmtN(r.totalCost)}</div><div style="font-size:10px;color:#94a3b8;">${r.timeHorizon}-yr lifecycle</div></div>
      <div class="stat-card"><div style="font-size:10px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:.06em;">Raw Benefit</div><div style="font-size:20px;font-weight:900;color:#1e293b;margin-top:4px;">${sym}${fmtN(r.totalBenefit)}</div><div style="font-size:10px;color:#94a3b8;">${r.timeHorizon}-yr lifecycle</div></div>
      <div class="stat-card"><div style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.06em;">Disp. Factor</div><div style="font-size:20px;font-weight:900;color:#1e293b;margin-top:4px;">×${r.dfFactor}</div><div style="font-size:10px;color:#94a3b8;">${r.dfLabel} risk</div></div>
      <div class="stat-card"><div style="font-size:10px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.06em;">Adj. Benefit</div><div style="font-size:20px;font-weight:900;color:#1e293b;margin-top:4px;">${sym}${fmtN(r.adjustedBenefit)}</div><div style="font-size:10px;color:#94a3b8;">Benefit × DF</div></div>
    </div>

    <!-- CHARTS -->
    ${(triangleImg || barImg) ? `
    <div style="display:grid;grid-template-columns:${triangleImg && barImg ? '1fr 1fr' : '1fr'};gap:20px;margin-top:24px;align-items:start;">
      ${triangleImg ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">🔺 ALARP Tolerability Triangle</div>
        <img src="${triangleImg}" style="max-width:100%;height:auto;display:block;margin:auto;" alt="ALARP Triangle">
      </div>` : ''}
      ${barImg ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">⚖️ Cost vs Benefit Analysis</div>
        <img src="${barImg}" style="max-width:100%;height:auto;display:block;margin:auto;" alt="Cost vs Benefit Chart">
      </div>` : ''}
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;">
      <div style="border-radius:12px;border:2px solid ${E2.getRiskColor(r.currentCategory)};background:${E2.getRiskBg(r.currentCategory)};padding:16px;text-align:center;">
        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Risk BEFORE</div>
        <div style="font-size:40px;font-weight:900;color:${E2.getRiskColor(r.currentCategory)};">${r.currentScore}</div>
        <span class="risk-pill" style="background:${E2.getRiskColor(r.currentCategory)};">${r.currentCategory}</span>
      </div>
      <div style="border-radius:12px;border:2px solid ${E2.getRiskColor(r.projectedCategory)};background:${E2.getRiskBg(r.projectedCategory)};padding:16px;text-align:center;">
        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Risk AFTER</div>
        <div style="font-size:40px;font-weight:900;color:${E2.getRiskColor(r.projectedCategory)};">${r.projectedScore}</div>
        <span class="risk-pill" style="background:${E2.getRiskColor(r.projectedCategory)};">${r.projectedCategory}</span>
      </div>
    </div>
    ${r.riskReduction > 0 ? `<div style="text-align:center;margin-top:12px;font-size:13px;font-weight:600;color:#16a34a;background:#f0fdf4;border-radius:8px;padding:10px;">↓ ${r.riskReduction} point risk reduction (${Math.round((r.riskReduction/r.currentScore)*100)}%)</div>` : ''}
  </div>` : ''}

    ${executiveSummaryHtml}

  <!-- AI NOTES -->
  ${uiState.aiNotes ? `
  <div class="section">
    <div class="section-title">🤖 AI Assumptions &amp; Notes</div>
    <div class="editable" contenteditable="true" style="font-size:13px;color:#475569;line-height:1.7;background:#eff6ff;border-color:#bfdbfe;border-radius:10px;padding:14px;">${uiState.aiNotes}</div>
  </div>` : ''}

  <!-- SAVED MEASURES COMPARISON -->
  ${measuresTableHtml ? `<div class="section">${measuresTableHtml}</div>` : ''}

  <!-- EDITABLE SIGN-OFF -->
  <div class="section">
    <div class="section-title">✍️ Sign-Off &amp; Review Notes</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:6px;">PREPARED BY</div>
        <div class="editable" contenteditable="true" style="min-height:32px;font-size:13px;color:#334155;" placeholder="Name / Role"></div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:6px;">REVIEWED BY</div>
        <div class="editable" contenteditable="true" style="min-height:32px;font-size:13px;color:#334155;" placeholder="Name / Role"></div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:6px;">DATE OF REVIEW</div>
        <div class="editable" contenteditable="true" style="min-height:32px;font-size:13px;color:#334155;">${dateStr}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:6px;">ADDITIONAL NOTES</div>
        <div class="editable" contenteditable="true" style="min-height:56px;font-size:13px;color:#334155;"></div>
      </div>
    </div>
  </div>

  <!-- APPENDIX: TERMS & DEFINITIONS -->
  <div class="section">
    <details>
      <summary>📖 Appendix — Terms &amp; Definitions</summary>
      <div style="margin-top:16px;">
        ${[
          ['ALARP','As Low As Reasonably Practicable. Risk must be reduced until further reduction costs are grossly disproportionate to benefit.'],
          ['BCR','Benefit-Cost Ratio. Adjusted Benefit ÷ Total Cost. BCR>1.0 = implement; 0.5–1.0 = borderline; <0.5 = disproportionate.'],
          ['Disproportion Factor (DF)','Multiplier reflecting moral obligation to act at higher risk levels. LOW×1, MEDIUM×2, HIGH×4, CRITICAL×10 (HSE R2P2).'],
          ['Lifecycle Cost','Total cost over the chosen time horizon, one-off costs counted once, recurring costs multiplied by years.'],
          ['Adjusted Benefit','Raw Benefit × Disproportion Factor. Effective benefit weight for comparison against cost.'],
          ['Risk Score','Frequency × Severity × Likelihood using standard scales: F(1/1.25/1.5/1.75/2), S(1/3/5/7/9/10), L(1/3/5/8/10). LOW 1–19, MEDIUM 20–49, HIGH 50–71, CRITICAL 72–200.'],
          ['Risk Rating & Response','LOW 1–19: low priority, reduce if feasible. MEDIUM 20–49: reduce over time and prioritize higher risks first. HIGH 50–71: action plan required. CRITICAL 72–200: immediate interim controls + prioritize permanent secure controls and communicate exposure to associates.'],
          ['CM Ladder','L6 Elimination → L5 Substitution → L4 Engineering → L3 Visual → L2 Administrative → L1 PPE.'],
          ['Lost Workday Cases (LWC)','Injuries causing ≥1 missed workday. OSHA DAFW avg for severity-3: ~48 hrs.'],
          ['Broadly Acceptable','Risk so low no ALARP demo needed. Typically <10⁻⁶ annual individual risk of death.'],
          ['Unacceptable Risk','Risk that cannot be justified. Typically >10⁻³ annual individual risk of death.'],
          ['BLS','U.S. Bureau of Labor Statistics — publishes SOII and CFOI injury cost benchmarks.'],
          ['OSHA','Occupational Safety and Health Administration (USA). Max wilful violation fine: $156,259 (2024).'],
          ['HSE','Health and Safety Executive (UK). Published R2P2 defining the ALARP tolerability framework.']
        ].map(([t,d]) => {
          const tid = t.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-{2,}/g,'-').replace(/^-+|-+$/g,'');
          return `<div id="term-${tid}" class="terms-row"><div class="term-name">${t}</div><div class="term-def">${d}</div></div>`;
        }).join('')}
      </div>
    </details>
  </div>

  <div class="footer">
    Generated by Risk Assessment Buddy SMART 3.0 &nbsp;|&nbsp; ALARP Cost-Benefit Analyzer &nbsp;|&nbsp; ${dateStr}<br>
    <span style="font-style:italic;">This report contains editable fields — click any dashed-border section to edit before printing or saving.</span>
  </div>
</div>
</body>
</html>`;

        return html;
    }

    /* ═══════════════════════════════════════════════════════════════
       DOWNLOAD HELPER
       ═══════════════════════════════════════════════════════════════ */
    function triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    /* Renders both canvas charts off-screen and returns their data URLs via Promise */
    function captureChartsAsDataURLs() {
        return new Promise((resolve) => {
            const s = E.getState();
            const r = s.result;
            if (!r) { resolve({ triangleImg: null, barImg: null }); return; }

            const dpr = 2; // fixed high-res for report
            let triangleImg = null, barImg = null;
            let done = 0;
            function tryResolve() { if (++done === 2) resolve({ triangleImg, barImg }); }

            // ── ALARP Triangle ──
            (function() {
                const W = 560, H = 380;
                const cv = document.createElement('canvas');
                cv.width = W * dpr; cv.height = H * dpr;
                const ctx = cv.getContext('2d');
                ctx.scale(dpr, dpr);

                const apexX = 230, apexY = 28, baseY = 290, baseL = 34, baseR = 420;
                function lx(y) { return apexX - (apexX - baseL) * (y - apexY) / (baseY - apexY); }
                function rx(y) { return apexX + (baseR - apexX) * (y - apexY) / (baseY - apexY); }
                const d1 = 128, d2 = 210;
                function fillZone(pts, c1, c2) {
                    const g = ctx.createLinearGradient(0, pts[0][1], 0, pts[pts.length-1][1]);
                    g.addColorStop(0, c1); g.addColorStop(1, c2);
                    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
                    for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
                    ctx.closePath(); ctx.fillStyle = g; ctx.fill();
                    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
                }
                fillZone([[apexX,apexY],[lx(d1),d1],[rx(d1),d1]],'rgba(220,38,38,0.92)','rgba(239,68,68,0.75)');
                fillZone([[lx(d1),d1],[rx(d1),d1],[rx(d2),d2],[lx(d2),d2]],'rgba(245,158,11,0.88)','rgba(251,191,36,0.70)');
                fillZone([[lx(d2),d2],[rx(d2),d2],[baseR,baseY],[baseL,baseY]],'rgba(22,163,74,0.82)','rgba(74,222,128,0.65)');
                [[d1,'rgba(255,255,255,0.6)'],[d2,'rgba(255,255,255,0.6)']].forEach(([dy,sc])=>{
                    ctx.beginPath(); ctx.setLineDash([7,4]); ctx.moveTo(lx(dy),dy); ctx.lineTo(rx(dy),dy);
                    ctx.strokeStyle=sc; ctx.lineWidth=2; ctx.stroke(); ctx.setLineDash([]);
                });
                ctx.beginPath(); ctx.moveTo(apexX,apexY); ctx.lineTo(baseL,baseY); ctx.lineTo(baseR,baseY); ctx.closePath();
                ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=2.5; ctx.stroke();
                function zoneLabel(title, sub, topY, botY) {
                    const midY = topY+(botY-topY)*0.38, zw=rx(midY)-lx(midY);
                    if(zw>60){const pw=Math.min(zw-16,220),px=apexX-pw/2;ctx.fillStyle='rgba(0,0,0,0.18)';ctx.beginPath();ctx.roundRect(px,midY-20,pw,40,6);ctx.fill();}
                    ctx.textAlign='center'; ctx.fillStyle='#fff';
                    ctx.font='bold 13px "Segoe UI",sans-serif'; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=4;
                    ctx.fillText(title,apexX,midY-4);
                    ctx.font='10px "Segoe UI",sans-serif'; ctx.globalAlpha=0.9; ctx.fillText(sub,apexX,midY+11);
                    ctx.globalAlpha=1; ctx.shadowBlur=0;
                }
                zoneLabel('Unacceptable','Risk cannot be justified',apexY,d1);
                zoneLabel('ALARP – Tolerable','Reduce risk so far as reasonably practicable',d1,d2);
                zoneLabel('Broadly Acceptable','No additional ALARP demonstration needed',d2,baseY);
                const dotYMap={DISPROPORTIONATE:d1-(d1-apexY)*0.22,BORDERLINE:d1+(d2-d1)*0.72,IMPLEMENT:d2+(baseY-d2)*0.72};
                const dotY2=dotYMap[r.verdict]||dotYMap['BORDERLINE'],dotX=apexX,vc=r.verdictColor||'#6366f1';
                const grd=ctx.createRadialGradient(dotX,dotY2,0,dotX,dotY2,20);
                grd.addColorStop(0,vc+'aa'); grd.addColorStop(1,vc+'00');
                ctx.beginPath();ctx.arc(dotX,dotY2,20,0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
                ctx.beginPath();ctx.arc(dotX,dotY2,10,0,Math.PI*2);ctx.fillStyle=vc;ctx.fill();
                ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
                const cbX=baseR+8,cbY=dotY2-22,cbW=90,cbH=44;
                ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,0.15)';ctx.shadowBlur=8;
                ctx.beginPath();ctx.roundRect(cbX,cbY,cbW,cbH,8);ctx.fill();ctx.shadowBlur=0;
                ctx.strokeStyle=vc;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cbX,cbY,cbW,cbH,8);ctx.stroke();
                ctx.beginPath();ctx.setLineDash([5,3]);ctx.moveTo(dotX+11,dotY2);ctx.lineTo(cbX,dotY2);
                ctx.strokeStyle=vc;ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
                ctx.textAlign='center';ctx.font='bold 10px "Segoe UI",sans-serif';ctx.fillStyle=vc;
                ctx.fillText(r.verdict,cbX+cbW/2,cbY+16);ctx.font='9px "Segoe UI",sans-serif';ctx.fillStyle='#475569';
                ctx.fillText(`BCR: ${r.ratio===Infinity?'∞':r.ratio.toFixed(2)}`,cbX+cbW/2,cbY+32);
                const legY=baseY+20;
                [['#dc2626','Unacceptable'],['#f59e0b','ALARP'],['#22c55e','Acceptable']].forEach(([c,t],i)=>{
                    const lxi=34+i*160;ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(lxi,legY,12,12,3);ctx.fill();
                    ctx.font='10px "Segoe UI",sans-serif';ctx.fillStyle='#475569';ctx.textAlign='left';ctx.fillText(t,lxi+16,legY+10);
                });
                triangleImg = cv.toDataURL('image/png');
                tryResolve();
            })();

            // ── Bar Chart ──
            (function() {
                const sym2 = currencySymbol();
                function fmt(n){if(n>=1000000)return (n/1000000).toFixed(1)+'M';if(n>=1000)return (n/1000).toFixed(0)+'k';return String(Math.round(n));}
                const W=460, H=340;
                const cv=document.createElement('canvas'); cv.width=W*dpr; cv.height=H*dpr;
                const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
                const pad={l:88,r:20,t:50,b:90};
                const chartL=pad.l,chartR=W-pad.r,chartT=pad.t,chartB=H-pad.b;
                const chartW=chartR-chartL,chartH=chartB-chartT;
                const maxVal=Math.max(r.totalCost,r.totalBenefit,r.adjustedBenefit,1)*1.1;
                ctx.fillStyle='#f8fafc'; ctx.beginPath();ctx.roundRect(chartL-10,chartT-10,chartW+20,chartH+20,8);ctx.fill();
                for(let i=0;i<=5;i++){
                    const gy=chartB-(i/5)*chartH,gv=Math.round((i/5)*maxVal);
                    ctx.beginPath(); ctx.setLineDash(i===0?[]:[4,3]);
                    ctx.moveTo(chartL,gy);ctx.lineTo(chartR,gy);
                    ctx.strokeStyle=i===0?'#94a3b8':'#e2e8f0';ctx.lineWidth=i===0?2:1;ctx.stroke();ctx.setLineDash([]);
                    if(i>0){ctx.textAlign='right';ctx.font='10px "Segoe UI",sans-serif';ctx.fillStyle='#94a3b8';ctx.fillText(`${sym2}${fmt(gv)}`,chartL-6,gy+4);}
                }
                ctx.beginPath();ctx.moveTo(chartL,chartT-15);ctx.lineTo(chartL,chartB);ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;ctx.stroke();
                const bars=[{label:'Total Cost',value:r.totalCost,c1:'#ef4444',c2:'#fca5a5'},{label:'Raw Benefit',value:r.totalBenefit,c1:'#22c55e',c2:'#86efac'},{label:'Adj. Benefit',value:r.adjustedBenefit,c1:'#3b82f6',c2:'#93c5fd'}];
                const barW=Math.floor(chartW/5),totalBar=barW*3+barW/2*2,bStart=chartL+(chartW-totalBar)/2;
                bars.forEach((b,i)=>{
                    const bx=bStart+i*(barW+barW/2),bH=maxVal>0?(b.value/maxVal)*chartH:4,by=chartB-bH;
                    ctx.shadowColor='rgba(0,0,0,0.12)';ctx.shadowOffsetY=4;ctx.shadowBlur=8;
                    const g=ctx.createLinearGradient(bx,by,bx,chartB);g.addColorStop(0,b.c1);g.addColorStop(1,b.c2);
                    ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(bx,by,barW,bH,[8,8,0,0]);ctx.fill();
                    ctx.shadowColor='transparent';ctx.shadowOffsetY=0;ctx.shadowBlur=0;
                    ctx.textAlign='center';ctx.font='bold 11px "Segoe UI",sans-serif';ctx.fillStyle=b.c1;
                    ctx.fillText(`${sym2}${fmt(b.value)}`,bx+barW/2,by-8);
                    ctx.font='10px "Segoe UI",sans-serif';ctx.fillStyle='#475569';ctx.fillText(b.label,bx+barW/2,chartB+18);
                });
                const rawCx=bStart+(barW+barW/2)+barW/2,adjCx=bStart+2*(barW+barW/2)+barW/2,bracketY=chartT-30;
                ctx.beginPath();ctx.moveTo(rawCx,bracketY+10);ctx.lineTo(rawCx,bracketY);ctx.lineTo(adjCx,bracketY);ctx.lineTo(adjCx,bracketY+10);
                ctx.strokeStyle='#6366f1';ctx.lineWidth=2;ctx.stroke();
                ctx.beginPath();ctx.moveTo(adjCx-5,bracketY+5);ctx.lineTo(adjCx,bracketY+12);ctx.lineTo(adjCx+5,bracketY+5);ctx.fillStyle='#6366f1';ctx.fill();
                ctx.textAlign='center';ctx.font='bold 10px "Segoe UI",sans-serif';ctx.fillStyle='#4f46e5';ctx.fillText(`× ${r.dfFactor} DF`,(rawCx+adjCx)/2,bracketY-4);
                const pillY2=chartB+50,pillW2=200,pillH2=30,pillX2=W/2-pillW2/2,vc2=r.verdictColor||'#6366f1';
                const pillG=ctx.createLinearGradient(pillX2,pillY2,pillX2+pillW2,pillY2);pillG.addColorStop(0,vc2);pillG.addColorStop(1,vc2+'cc');
                ctx.shadowColor=vc2+'55';ctx.shadowBlur=12;ctx.fillStyle=pillG;ctx.beginPath();ctx.roundRect(pillX2,pillY2,pillW2,pillH2,pillH2/2);ctx.fill();ctx.shadowBlur=0;
                ctx.textAlign='center';ctx.font='bold 12px "Segoe UI",sans-serif';ctx.fillStyle='#fff';
                ctx.fillText(`${r.verdict}  •  BCR ${r.ratio===Infinity?'∞':r.ratio.toFixed(2)}`,W/2,pillY2+20);
                const legY2=pillY2+pillH2+12;
                bars.forEach((b,i)=>{const lxi=50+i*140;ctx.fillStyle=b.c1;ctx.beginPath();ctx.roundRect(lxi,legY2,12,12,3);ctx.fill();ctx.font='10px "Segoe UI",sans-serif';ctx.fillStyle='#475569';ctx.textAlign='left';ctx.fillText(b.label+(i===2?` (×${r.dfFactor} DF)`:''),lxi+16,legY2+10);});
                barImg = cv.toDataURL('image/png');
                tryResolve();
            })();
        });
    }

    function downloadReport() {
        const s = E.getState();
        const dateTag = new Date().toISOString().slice(0, 10);
        const slug = (s.proposedMeasure.description || 'CBA_Analysis').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');

        captureChartsAsDataURLs().then(({ triangleImg, barImg }) => {
            // 1. HTML report with embedded charts
            triggerDownload(generateHTMLReport(triangleImg, barImg), `CBA_Report_${slug}_${dateTag}.html`, 'text/html;charset=utf-8');

            // 2. JSON project file
            setTimeout(() => {
                const data = E.exportData();
                data._processFrequencyPerWeek = uiState.processFrequencyPerWeek || null;
                data._processTimeMinutesPerTask = uiState.processTimeMinutesPerTask || null;
                data._taskBreakdownMinutes = uiState.taskBreakdownMinutes || 10;
                data._avgHourlyWage = uiState.avgHourlyWage || null;
                data._aiNotes = uiState.aiNotes || '';
                data._recurringPeriod = uiState.recurringPeriod || 'year';
                data._aiModel = uiState.aiModel || 'anthropic/claude-sonnet-4-6';
                data._aiSnapshot = uiState.aiSnapshot ? JSON.parse(JSON.stringify(uiState.aiSnapshot)) : null;
                data._executiveSummary = uiState.executiveSummary ? JSON.parse(JSON.stringify(uiState.executiveSummary)) : null;
                data._exportedAt = new Date().toISOString();
                data._version = '3.0';
                triggerDownload(JSON.stringify(data, null, 2), `CBA_Project_${slug}_${dateTag}.json`, 'application/json');
            }, 300);
        });
    }

    /* ═══════ PUBLIC API ═══════ */
    window.CostBenefitAnalyzer = {
        init(targetId) {
            root = document.getElementById(targetId || 'cba-app-mount');
            if (!root) { console.error('CBA: mount element not found'); return; }
            step = 'landing';
            // Luxembourg: pre-set location and wage; no geolocation needed
            const s = E.getState();
            s.location = { country: 'Luxembourg', region: '', lat: 49.6117, lng: 6.1319, currency: 'EUR' };
            uiState.locationDetected = true;
            uiState.avgHourlyWage = 28; // STATEC 2024 median: €58,126/yr ÷ 2080hrs ≈ €28/hr
            render();
        },
        exportData() { return E.exportData(); },
        importData(data) {
            E.importData(data);
            const sImported = E.getState();
            normalizeRiskState(sImported.currentRisk);
            normalizeRiskState(sImported.projectedRisk);
            step = 'landing';
            render();
        },
        analyzeRow(rowIndex) { if (!root) this.init(); E.importFromTable(rowIndex); uiState.selectedRow = String(rowIndex); step = 'analyze'; render(); if (window.switchTab) window.switchTab('cost-benefit'); }
    };

})();
