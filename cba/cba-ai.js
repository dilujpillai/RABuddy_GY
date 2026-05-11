/**
 * cba-ai.js — Cost-Benefit Analyzer: AI Integration & Geolocation
 *
 * Handles Claude-powered hazard analysis and cost estimation,
 * browser geolocation with Nominatim reverse geocoding,
 * and AI-driven fresh-start risk description analysis.
 */
(function () {
    'use strict';

    window.CBA = window.CBA || {};

    const CBA_API = 'https://risk-assessment-api-nine.vercel.app/api/ai';
    const CBA_MODEL = 'openai/gpt-4o-mini';

    // ═══════════════════════════════════════════════════════════════
    // AI CALL (shared helper)
    // ═══════════════════════════════════════════════════════════════

    async function callAI(prompt, model) {
        // No hard client timeout — server maxDuration (300s) is the ceiling.
        // A very long safety net (10 min) prevents truly zombie requests.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10-minute safety net only
        try {
            const res = await fetch(CBA_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: model || CBA_MODEL, prompt }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('AI API error ' + res.status + ': ' + (await res.text()));
            const data = await res.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content)
                throw new Error('Empty AI response');
            return data.choices[0].message.content;
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') throw new Error('Request cancelled or took longer than 10 minutes.');
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GEOLOCATION
    // ═══════════════════════════════════════════════════════════════

    async function detectLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation not supported'));
            }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    try {
                        const geo = await reverseGeocode(lat, lng);
                        resolve({ lat, lng, ...geo });
                    } catch (e) {
                        // Return coords even if reverse geocode fails
                        resolve({ lat, lng, country: '', region: '', currency: 'USD' });
                    }
                },
                (err) => reject(err),
                { timeout: 10000, maximumAge: 300000 }
            );
        });
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'RiskAssessmentBuddy/3.0' }
        });
        if (!res.ok) throw new Error('Reverse geocode failed');
        const data = await res.json();
        const addr = data.address || {};
        const country = addr.country || '';
        const region = addr.state || addr.county || '';

        // Guess currency from country code
        const cc = addr.country_code ? addr.country_code.toUpperCase() : '';
        const currencyMap = {
            US: 'USD', GB: 'GBP', BR: 'BRL', CN: 'CNY', IN: 'INR',
            MY: 'MYR', TH: 'THB', DE: 'EUR', FR: 'EUR', IT: 'EUR',
            ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR',
            IE: 'EUR', FI: 'EUR', LU: 'EUR', SI: 'EUR', SK: 'EUR',
            LT: 'EUR', LV: 'EUR', EE: 'EUR', MT: 'EUR', CY: 'EUR',
            GR: 'EUR', HR: 'EUR'
        };
        const currency = currencyMap[cc] || 'USD';

        return { country, region, currency };
    }

    // ═══════════════════════════════════════════════════════════════
    // FRESH-START: ANALYZE RISK FROM DESCRIPTION
    // ═══════════════════════════════════════════════════════════════

    async function analyzeRiskDescription(description, locationStr, model) {
        const prompt = `You are a senior EHS (Environment, Health & Safety) specialist performing an ALARP cost-benefit analysis in Luxembourg.

Given this workplace hazard description:
"""
${description}
"""

Location: Luxembourg (Grand Duchy of Luxembourg) — apply Luxembourg Labour Code, AAA accident insurance framework, and ITM enforcement context.

Analyze the hazard and return a JSON object (no markdown, only valid JSON) with:
{
  "hazards": [
    { "group": "<hazard group name>", "name": "<specific hazard>", "consequence": "<potential consequence>" }
  ],
  "frequency": <one of 1, 1.25, 1.5, 1.75, 2 using: 1=RARELY, 1.25=OCCASIONAL, 1.5=INTERMEDIATE, 1.75=FREQUENTLY, 2=PERMANENT>,
  "severity": <one of 1, 3, 5, 7, 9, 10 using: 1=No potential of injury, 3=FIRST AID, 5=MEDICAL TREATMENT, 7=DART, 9=SIA, 10=Fatality>,
  "likelihood": <one of 1, 3, 5, 8, 10 using: 1=Almost impossible, 3=Very unlikely, 5=Possible, 8=Likely, 10=Very likely>,
  "suggestedMeasures": [
    {
      "description": "<control measure description>",
      "controlLevel": <1-6 CM ladder level>,
      "rationale": "<brief reasoning>"
    }
  ]
}

Be specific and realistic. Use the industrial workplace context.`;

        const raw = await callAI(prompt, model);
        try {
            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('Failed to parse AI risk analysis: ' + e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // COST/BENEFIT ESTIMATION
    // ═══════════════════════════════════════════════════════════════

    async function estimateCosts(hazardData, measureDescription, locationStr, currency, model, extraContext) {
        const sym = (window.CBA.engine.CURRENCIES.find(c => c.code === currency) || {}).symbol || '$';
      const sevValue = Number(hazardData.severity || 1);
      const sevDesc = sevValue >= 10
        ? 'Potential of Fatality'
        : sevValue >= 9
          ? 'Potential of SIA'
          : sevValue >= 7
            ? 'Potential of DART'
            : sevValue >= 5
              ? 'Potential of MEDICAL TREATMENT'
              : sevValue >= 3
                ? 'Potential of FIRST AID'
                : 'No potential of injury';
        // Build process context from either per-task time OR calculated from weekly frequency
        let processCtx = '';
        if (extraContext && extraContext.processTimeMinutesPerTask) {
            processCtx = `\nProcess Time: The task takes approximately ${extraContext.processTimeMinutesPerTask} minutes per occurrence (calculated from frequency: ${extraContext.processFrequencyPerWeek} times/week in a standard 40-hour work week). Use this for manhours and downtime calculations.`;
        }
        const wageCtx = (extraContext && extraContext.avgHourlyWage) ?
            `\nAverage Hourly Wage: ${sym}${extraContext.avgHourlyWage}/hr (local benchmark for this location). Use this rate for all labour-cost calculations.` : '';
        const baselineCtx = (extraContext && extraContext.baselineContext) ? extraContext.baselineContext : '';
        const prompt = `You are a senior EHS cost estimator specializing in industrial safety investments in Luxembourg.

Hazard: ${hazardData.description || JSON.stringify(hazardData.hazards)}
Identified Risks: ${JSON.stringify(hazardData.hazards || [])}
Risk Score: ${hazardData.score} (${hazardData.category}), Severity: ${hazardData.severity} (${sevDesc})
Proposed Control Measure: ${measureDescription}
Location: Luxembourg (Grand Duchy of Luxembourg)
Currency: EUR (€)${processCtx}${wageCtx}${baselineCtx}

LUXEMBOURG REGULATORY & COST FRAMEWORK (mandatory reference):
- AAA (Association d'Assurance Accident) 2024: avg direct accident cost €4,053; 128 accidents/day nationally
- AAA Bonus-Malus: base rate 0.70% × multiplier (0.85 bonus → 1.50 max malus); one serious incident can trigger +€7,000–€35,000/yr in premium on a €10M payroll
- MDE (Mutualité des Employeurs): reimburses 80% of employer cost; employer absorbs 20% deadweight loss; salary continuation (Lohnfortzahlung) until end of month of 77th absence day
- MDE class rates exist (Class 1: 0.07%, Class 2: 0.99%) but DO NOT assume occupational accidents automatically trigger class migration unless the user provides explicit company absenteeism evidence
- ITM fines: avg €5,530/fine in 2024 (1,152 fines totalling €6,370,500); max €4,000/worker/violation; 116 criminal referrals for grave/fatal accidents
- STATEC wage baseline: median €4,844/month gross; total employer cost ~€5,522/month; daily employer cost ~€257; median hourly ~€28
- ISSA Return on Prevention (ROP) = 2.2 — for every €1 invested in prevention, expected return is €2.20
- Vision Zero Luxembourg: national strategy promoted by AAA and UEL

IMPORTANT: For EVERY cost and benefit line item, provide a "breakdown" array showing the calculation components that multiply together to produce the total. Each breakdown row has: label (what it is), qty (numeric quantity), qtyReason (1-sentence explanation of WHY this specific qty was chosen), rate (unit price/rate), unit (e.g. "hours","people","incidents/yr"), source (Luxembourg regulation/benchmark title), and sourceUrl (direct URL to the cited source page/document).

The breakdown quantities should be tied to the risk severity level ${hazardData.severity}. Higher severity = more lost days, higher medical costs, bigger AAA/MDE premium hikes, larger ITM fines. Use Luxembourg AAA/ITM/MDE benchmark values for all estimates.

Return a JSON object (no markdown, only valid JSON):
{
  "costs": {
    "capital": <number>,
    "installation": <number>,
    "maintenance": <annual number>,
    "training": <annual number>,
    "downtime": <number>,
    "consultant": <number>,
    "admin": <number>,
    "otherRecurring": <annual number>,
    "other": <number>
  },
  "costRationales": {
    "capital": "<1-sentence justification>",
    "installation": "<1-sentence justification>",
    "maintenance": "<1-sentence justification>",
    "training": "<1-sentence justification>",
    "downtime": "<1-sentence justification referencing Luxembourg lost-workday context for the given severity>",
    "consultant": "<1-sentence justification>",
    "admin": "<1-sentence justification>",
    "otherRecurring": "<1-sentence justification>",
    "other": "<1-sentence justification>"
  },
  "costBreakdowns": {
    "capital": [{"label": "<component name>", "qty": 1, "qtyReason": "<why>", "rate": 100, "unit": "unit", "source": "...", "sourceUrl": "..."}],
    "downtime": [{"label": "<component name>", "qty": 1, "qtyReason": "<why>", "rate": 100, "unit": "hours", "source": "...", "sourceUrl": "..."}]
  },
  "benefits": {
    "injuryCost": <annual number>,
    "insurance": <annual number>,
    "medical": <annual number>,
    "regulatory": <one-time number>,
    "production": <annual number>,
    "material": <annual number>,
    "ppe": <annual number>,
    "manhours": <annual number>,
    "retention": <annual number>,
    "otherBenefit": <number>
  },
  "benefitRationales": {
    "injuryCost": "<non-medical injury impact only; must exclude direct medical/statutory compensation>",
    "insurance": "<1-sentence justification>",
    "medical": "<refer to injury type & avg treatment cost benchmark>",
    "regulatory": "<cite ITM Luxembourg — avg fine €5,530 in 2024; max €4,000/worker/violation; 116 criminal referrals for fatal accidents>",
    "production": "<1-sentence justification>",
    "material": "<1-sentence justification>",
    "ppe": "<1-sentence justification>",
    "manhours": "<hours × rate justification>",
    "retention": "<1-sentence justification>",
    "otherBenefit": "<1-sentence justification>"
  },
  "benefitBreakdowns": {
    "injuryCost": [{"label": "<e.g. ITM fines>", "qty": 1, "qtyReason": "<why>", "rate": 60000, "unit": "incidents/yr", "source": "...", "sourceUrl": "..."}, {"label": "<e.g. legal defence>", "qty": 1, "rate": 80000}],
    "medical": [{"label": "<component name>", "qty": 1, "qtyReason": "<why>", "rate": 100, "unit": "incidents/yr", "source": "...", "sourceUrl": "..."}]
  },
  "projectedRisk": {
    "frequency": <one of 1, 1.25, 1.5, 1.75, 2>,
    "severity": <one of 1, 3, 5, 7, 9, 10>,
    "likelihood": <one of 1, 3, 5, 8, 10>
  },
  "notes": "<brief explanation of assumptions, 2-3 sentences>"
}

RULES:
- Each breakdown row qty × rate should equal the portion it contributes. Sum of all breakdown (qty×rate) for a category = that category's total.
- Use Luxembourg-specific AAA/MDE/ITM/STATEC benchmark values scaled to severity level.
- For injuryCost: use the Luxembourg iceberg model as NON-MEDICAL ONLY (all-in minus direct medical). Severity 3 anchor: €27,341 total and €4,053 direct medical, therefore non-medical injuryCost anchor = €23,288.
- For medical: keep direct treatment/statutory compensation only. Never duplicate direct medical in injuryCost.
- For insurance: reference AAA Bonus-Malus impact only unless user provides explicit company absenteeism data proving MDE class impact.
- For regulatory: use ITM 2024 data (avg fine €5,530, max €4,000/worker, 116 criminal referrals for fatal accidents).
- For manhours: if Process Time is provided, calculate annual hours saved = (process time saved per occurrence × estimated occurrences/yr). Multiply by the Luxembourg median wage (€28/hr or provided wage). Break into clear qty/rate rows.
- If Average Hourly Wage is provided, use it for ALL labour-cost breakdown rates (manhours, downtime, injury cost, training, etc). Default Luxembourg median: €28/hr.
- Tag rationales to specific identified hazards where applicable.
- All amounts in whole numbers in EUR.
- No guesswork: every non-zero amount must be traceable to either user input, the supplied baseline context, or a cited Luxembourg source with a direct sourceUrl. If a value cannot be justified, set it to 0 and explain in notes.
- Mention the ISSA ROP of 2.2 in the notes field when applicable to emphasize Luxembourg prevention economics.`;

        const raw = await callAI(prompt, model);
        try {
            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('Failed to parse AI cost estimates: ' + e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MEASURE COMPARISON (AI summary)
    // ═══════════════════════════════════════════════════════════════

    async function compareMeasures(measures, model) {
        if (!measures || measures.length < 2) return null;

        const summary = measures.map((m, i) => ({
            index: i + 1,
            description: m.proposedMeasure ? m.proposedMeasure.description : 'N/A',
            cost: m.result ? m.result.totalCost : 0,
            adjustedBenefit: m.result ? m.result.adjustedBenefit : 0,
            ratio: m.result ? m.result.ratio : 0,
            verdict: m.result ? m.result.verdict : 'N/A'
        }));

        const prompt = `You are an EHS specialist comparing ALARP cost-benefit analyses.

Compare these ${measures.length} proposed control measures:
${JSON.stringify(summary, null, 2)}

Return a JSON object (no markdown, only valid JSON):
{
  "recommendation": <1-based index of the recommended measure>,
  "reasoning": "<2-3 sentence explanation>",
  "ranking": [<ordered array of 1-based indices from best to worst>]
}`;

        const raw = await callAI(prompt, model);
        try {
            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EXECUTIVE SUMMARY HELPER (plain-language guidance)
    // ═══════════════════════════════════════════════════════════════

    async function generateExecutiveSummary(context, model) {
        const safeContext = context || {};
        const prompt = `You are a safety and business advisor explaining a Luxembourg cost-benefit analysis to a first-time user.

Context JSON:
${JSON.stringify(safeContext, null, 2)}

Write in plain language for non-experts.
Do not invent any numbers. Use only values present in the JSON context.
If a value is missing, say it is user-defined or not yet entered.

Return ONLY valid JSON (no markdown):
{
  "headline": "<one short line>",
  "overview": "<4-6 plain sentences in common language>",
  "costDrivers": [
    {
      "item": "<cost item label>",
      "amount": "<formatted amount text from provided data>",
      "explanation": "<what this cost means in simple terms>",
      "userCanEdit": "<what the user can manually tune>"
    }
  ],
  "benefitDrivers": [
    {
      "item": "<benefit item label>",
      "amount": "<formatted amount text from provided data>",
      "explanation": "<what this benefit means in simple terms>",
      "userCanEdit": "<what the user can manually tune>"
    }
  ],
  "assumptions": ["<short bullet>", "<short bullet>"],
  "nextSteps": ["<short action>", "<short action>"]
}

Rules:
- Keep language simple and practical.
- Tie explanation to hazard, risk score, and control measure from context.
- Mention Luxembourg framing (AAA, MDE, ITM) only when present in context.
- Prefer concise outputs over long prose.`;

        const raw = await callAI(prompt, model);
        try {
            const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('Failed to parse executive summary: ' + e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BASELINE DATA REFRESH (batched AI research call)
    // ═══════════════════════════════════════════════════════════════

    /**
    * Asks the AI to provide current Luxembourg benchmark data
     * for all 5 severity levels, calibrated for the given location.
     * Returns an object shaped exactly like CBA.baseline DEFAULTS so
     * CBA.baseline.update() can merge it directly.
     *
     * @param {string} locationStr  - e.g. "Cork, Ireland" or "Ohio, United States"
     * @param {string} currency     - ISO currency code, e.g. "EUR"
     * @param {string} [model]      - AI model override
     * @returns {Promise<object>}   - Structured baseline data
     */
    async function refreshBaselineData(locationStr, currency, model) {
        // Luxembourg-only: ignore locationStr/currency parameters, always use Luxembourg/EUR
        const loc = 'Luxembourg';
        const cur = 'EUR';

        const prompt = `You are an occupational health & safety data specialist with deep expertise in Luxembourg's statutory OSH framework.

TASK: Provide the most current and accurate benchmark data for workplace injury cost calculations in Luxembourg.

Location: Luxembourg (Grand Duchy of Luxembourg)
Currency: EUR — ALL monetary values must be in EUR.
Primary Reference Year: 2024–2025

KEY LUXEMBOURG STATUTORY FRAMEWORK YOU MUST USE:
1. AAA (Association d'Assurance Accident) — compulsory employer-funded accident insurance
   - 2024 Annual Report: 16,751 total accidents recognized; 13,724 workplace accidents; 2,889 commuting accidents
   - National average direct cost per accident 2024: €4,053
   - 501,285 working units; 31,085 enterprises; 128 accident declarations/day nationally
   - AAA base contribution rate 2025: 0.70% of gross payroll (employers only)
   - Bonus-Malus multipliers: 0.85 (15% bonus) | 1.00 (neutral) | 1.10 | 1.30 | 1.50 (50% malus – maximum)
   - Effective rate range: 0.595% (best) → 1.050% (worst) on the 0.70% base rate
   - Severe case documented: Luxembourg judgment TAL-2021-02459 awarded €29,635 total indemnification

2. MDE (Mutualité des Employeurs) — mandatory employer mutual fund for salary continuation
   - Lohnfortzahlung: employer must continue full salary until end of month of 77th absence day (rolling 18-month period)
   - MDE reimburses ONLY 80% of employer cost — employer permanently absorbs 20% deadweight loss
   - MDE premium 2025: Class 1 (low absenteeism) = 0.07% | Class 2 (high absenteeism) = 0.99% of gross payroll
  - Do not assume accidents automatically upgrade MDE class; classing depends on employer absenteeism profile and MDE rules
   - CNS assumes indemnification after 77-day threshold; employment contract ceases at 78 weeks

3. ITM (Inspection du Travail et des Mines) — enforcement authority
   - 2024: 1,152 administrative fines totalling €6,370,500 (avg €5,530/fine; +€939,000 vs 2023)
   - Max fine: €4,000 per worker per violation (multiplies per number of workers concerned)
   - 116 procès-verbaux transmitted to Parquet for grave/fatal accidents in 2024
   - 12.31% increase in H&S targeted controls in 2024 vs 2023

4. STATEC (Luxembourg National Statistics) — wage baseline 2024
   - Median gross annual salary: €58,126 (€4,844/month)
   - Average gross annual salary: €75,919 (€6,327/month)
   - Total employer cost = gross salary × ~1.14 (employer social charges)
   - Median daily employer cost: (€4,844 × 1.14) / 21.5 = approx €257/day
   - Luxembourg median hourly rate: approx €27.94/hr (€58,126 / 2,080 hrs/yr)

5. ISSA Return on Prevention (ROP): verified ROP = 2.2 (€1 prevention → €2.20 return)
   Source: ISSA/DGUV/BG ETEM multinational study, 337 companies, 19 countries including Luxembourg

SEVERITY DEFINITIONS FOR LUXEMBOURG:
  1 = Negligible  (first-aid only; no AAA declaration; zero Lohnfortzahlung/MDE impact)
  2 = Minor       (<4 days absence; declared to AAA; MDE 80% reimbursement; no Malus typically)
  3 = Moderate    (5–30 days DAFW; standard AAA recognized accident; avg cost = €4,053 direct / €27,341 verified core total)
  4 = Major       (31–77 days DAFW; within Lohnfortzahlung; AAA Malus 1.30× or 1.50× may be triggered)
  5 = Catastrophic (permanent disability/fatality; ITM criminal referral to Parquet; contract cessation)

Return ONLY valid JSON — no markdown, no comments, no trailing commas.

{
  "incidentRates": {
    "1": { "value": <cases per 100 FTE per year>, "unit": "cases/100 FTE/yr", "source": "<cite AAA Annual Report 2024>", "sourceUrl": "<direct source link>", "evidenceKey": "incidentRates.1", "figureUsed": "<exact figure>", "rationaleFormula": "<brief formula/rule>", "year": 2024, "notes": "<1 sentence specific to Luxembourg>"},
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "daysAwayFromWork": {
    "1": { "value": <median days>, "unit": "days", "source": "<AAA/MDE/Luxembourg Social Security Code Art.92>", "year": 2024, "notes": "<mention Lohnfortzahlung context>"},
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "medicalCostUSD": {
    "1": { "value": <integer in EUR>, "unit": "EUR/case", "source": "<AAA Annual Report 2024>", "year": 2024, "notes": "<what AAA covers for this severity; severity 3 anchor = €4,053>"},
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "injuryCostPerCase": {
    "1": { "value": <integer in EUR, total direct+indirect iceberg>, "unit": "EUR/case", "source": "<Luxembourg iceberg model Sec.8.2 / AAA 2024>", "year": 2024, "notes": "<include 20% MDE deadweight + AAA Malus lagging + productivity loss; severity 3 verified core anchor = €27,341>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "insurancePremiumChangePct": {
    "1": { "value": <integer % change in AAA premium>, "unit": "%", "source": "<AAA Bonus-Malus system 2025>", "year": 2025, "notes": "<specify resulting Malus multiplier (1.10/1.30/1.50) and EUR impact example on €10M payroll>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "regulatoryFineUSD": {
    "1": { "value": <integer in EUR>, "unit": "EUR/violation", "source": "<ITM Annual Report 2024>", "year": 2024, "notes": "<€4,000/worker max, avg €5,530, 116 criminal referrals for fatal cases>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  }
}

CRITICAL RULES:
- ALL monetary values in EUR only.
- Severity 3 medicalCostUSD anchor: €4,053 (AAA 2024 national average).
- Severity 3 injuryCostPerCase anchor: €27,341 verified core (Luxembourg Sec.8.2 model: unrecovered salary €1,536 + lost productivity €5,760 + overtime €1,920 + admin €1,625 + asset damage €2,500 + AAA Malus €14,000).
- insurancePremiumChangePct must reference 0.70% × Bonus-Malus factor (0.85/1.00/1.10/1.30/1.50).
- regulatoryFineUSD must use ITM Luxembourg data (avg €5,530/fine; max €4,000/worker; 116 criminal referrals for fatal accidents).
- Every severity entry must include sourceUrl, evidenceKey, figureUsed, and rationaleFormula.
- No speculative assumptions: if a value is not supported by a cited Luxembourg source, keep it conservative and explain in notes.
- All sources must cite real Luxembourg bodies: AAA, MDE, ITM, STATEC, CCSS, Luxembourg Social Security Code.`;

        const raw = await callAI(prompt, model);
        try {
            const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('Failed to parse baseline data from AI: ' + e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    window.CBA.ai = {
        callAI,
        detectLocation,
        reverseGeocode,
        analyzeRiskDescription,
        estimateCosts,
        compareMeasures,
      generateExecutiveSummary,
        refreshBaselineData,
        CBA_MODEL
    };

})();
