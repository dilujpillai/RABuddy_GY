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
        const prompt = `You are a senior EHS (Environment, Health & Safety) specialist performing an ALARP cost-benefit analysis.

Given this workplace hazard description:
"""
${description}
"""

Location: ${locationStr || 'Not specified'}

Analyze the hazard and return a JSON object (no markdown, only valid JSON) with:
{
  "hazards": [
    { "group": "<hazard group name>", "name": "<specific hazard>", "consequence": "<potential consequence>" }
  ],
  "frequency": <1-5 rating: 1=rare, 2=unlikely, 3=possible, 4=likely, 5=almost certain>,
  "severity": <1-5 rating: 1=negligible, 2=minor, 3=moderate, 4=major, 5=catastrophic>,
  "likelihood": <1-5 rating: 1=very unlikely, 2=unlikely, 3=possible, 4=likely, 5=very likely>,
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
        const sevDesc = ['Minor','Moderate','Serious','Major','Catastrophic'][((hazardData.severity || 1) - 1)] || 'Moderate';
        // Build process context from either per-task time OR calculated from weekly frequency
        let processCtx = '';
        if (extraContext && extraContext.processTimeMinutesPerTask) {
            processCtx = `\nProcess Time: The task takes approximately ${extraContext.processTimeMinutesPerTask} minutes per occurrence (calculated from frequency: ${extraContext.processFrequencyPerWeek} times/week in a standard 40-hour work week). Use this for manhours and downtime calculations.`;
        }
        const wageCtx = (extraContext && extraContext.avgHourlyWage) ?
            `\nAverage Hourly Wage: ${sym}${extraContext.avgHourlyWage}/hr (local benchmark for this location). Use this rate for all labour-cost calculations.` : '';
        const baselineCtx = (extraContext && extraContext.baselineContext) ? extraContext.baselineContext : '';
        const prompt = `You are a senior EHS cost estimator specializing in industrial safety investments.

Hazard: ${hazardData.description || JSON.stringify(hazardData.hazards)}
Identified Risks: ${JSON.stringify(hazardData.hazards || [])}
Risk Score: ${hazardData.score} (${hazardData.category}), Severity: ${hazardData.severity}/5 (${sevDesc})
Proposed Control Measure: ${measureDescription}
Location: ${locationStr || 'Not specified'}
Currency: ${currency} (${sym})${processCtx}${wageCtx}${baselineCtx}

IMPORTANT: For EVERY cost and benefit line item, provide a "breakdown" array showing the calculation components that multiply together to produce the total. Each breakdown row has: label (what it is), qty (numeric quantity), qtyReason (1-sentence explanation of WHY this specific qty was chosen — e.g. "Based on OSHA incidence rates for severity 4 in manufacturing, ~3 recordable incidents/yr is typical"), rate (unit price/rate), unit (e.g. "hours","people","incidents/yr"), and source (regulation, benchmark, or assumption — e.g. "OSHA avg","Industry benchmark","BLS data").

The breakdown quantities should be tied to the risk severity level ${hazardData.severity}/5. Higher severity = more lost days, higher medical costs, bigger fines, etc. Use OSHA/HSE/local regulation benchmarks for lost workday estimates, average injury costs, etc.

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
  "costBreakdowns": {
    "capital": [{"label":"<component>","qty":<n>,"qtyReason":"<why this qty>","rate":<n>,"unit":"<unit>","source":"<ref>"}],
    "installation": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "maintenance": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "training": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "downtime": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "consultant": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "admin": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "otherRecurring": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "other": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}]
  },
  "costRationales": {
    "capital": "<1-sentence justification>",
    "installation": "<1-sentence justification>",
    "maintenance": "<1-sentence justification>",
    "training": "<1-sentence justification>",
    "downtime": "<1-sentence justification referencing OSHA lost workday avg for severity>",
    "consultant": "<1-sentence justification>",
    "admin": "<1-sentence justification>",
    "otherRecurring": "<1-sentence justification>",
    "other": "<1-sentence justification>"
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
  "benefitBreakdowns": {
    "injuryCost": [{"label":"Lost workday cases avoided","qty":<incidents/yr>,"qtyReason":"<why this incident rate — cite OSHA incidence rate for this industry/severity>","rate":<cost per case>,"unit":"incidents/yr","source":"OSHA/BLS avg for severity ${hazardData.severity}"},{{"label":"Avg days away per case","qty":<days>,"qtyReason":"<why this many days — cite BLS DAFW avg for this injury type/severity>","rate":<daily wage>,"unit":"days","source":"BLS DAFW data"}],
    "insurance": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "medical": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "regulatory": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "production": [{"label":"Downtime avoided","qty":<hours/yr>,"qtyReason":"<why this hours estimate>","rate":<hourly production value>,"unit":"hours/yr","source":"..."}],
    "material": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "ppe": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "manhours": [{"label":"Labour hours saved","qty":<hours/yr>,"qtyReason":"<calculation: process time × frequency × weeks/yr>","rate":<hourly wage>,"unit":"hours/yr","source":"Local avg wage"}],
    "retention": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}],
    "otherBenefit": [{"label":"...","qty":0,"qtyReason":"...","rate":0,"unit":"...","source":"..."}]
  },
  "benefitRationales": {
    "injuryCost": "<refer to specific identified hazard/risk & OSHA lost workday data>",
    "insurance": "<1-sentence justification>",
    "medical": "<refer to injury type & avg treatment cost benchmark>",
    "regulatory": "<cite applicable regulation & typical fine range>",
    "production": "<1-sentence justification>",
    "material": "<1-sentence justification>",
    "ppe": "<1-sentence justification>",
    "manhours": "<hours × rate justification>",
    "retention": "<1-sentence justification>",
    "otherBenefit": "<1-sentence justification>"
  },
  "projectedRisk": {
    "frequency": <1-5>,
    "severity": <1-5>,
    "likelihood": <1-5>
  },
  "notes": "<brief explanation of assumptions, 2-3 sentences>"
}

RULES:
- Each breakdown row qty × rate should equal the portion it contributes. Sum of all breakdown (qty×rate) for a category = that category's total.
- Use realistic OSHA/HSE/BLS benchmark values scaled to severity level and location/currency.
- For injuryCost: use OSHA average days away from work for the severity level (e.g. severity 3 → ~48 hrs OSHA avg), multiply by hourly cost.
- For manhours: if Process Time is provided, calculate annual hours saved = (process time saved per occurrence × estimated occurrences/yr). Multiply by the hourly wage. Break this into clear qty/rate rows.
- If Average Hourly Wage is provided, use it for ALL labour-cost breakdown rates (manhours, downtime, injury cost, training, etc).
- Tag rationales to specific identified hazards where applicable.
- All amounts in whole numbers in ${currency}.`;

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
    // BASELINE DATA REFRESH (batched AI research call)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Asks the AI to provide current OSHA/BLS/HSE/local benchmark data
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
        const loc = locationStr || 'United States (general)';
        const cur = currency || 'USD';

        const prompt = `You are an occupational health & safety data specialist with expert knowledge of OSHA (US), HSE (UK), EU-OSHA, and equivalent national regulations worldwide.

Task: Provide the most current available benchmark data for workplace injury cost calculations.

Location / Region: ${loc}
Currency: ${cur} — convert ALL monetary values to ${cur} using current exchange rates.
Reference year: 2023–2024

For EACH of the five risk severity levels (1–5), populate ALL six metrics below.
Definitions:
  1 = Negligible (first-aid only, no lost time)
  2 = Minor      (<4 days DAFW, restricted work)
  3 = Moderate   (5–14 days DAFW, recordable)
  4 = Major      (15–60 days DAFW, fracture/amputation)
  5 = Catastrophic (permanent disability or fatality)

Return ONLY valid JSON — no markdown, no comments, no trailing commas.

{
  "incidentRates": {
    "1": { "value": <cases per 100 FTE per year>, "unit": "cases/100 FTE/yr", "source": "<citation e.g. OSHA TRIR 2022 mfg>", "year": <int>, "notes": "<1 sentence>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "daysAwayFromWork": {
    "1": { "value": <median days>, "unit": "days", "source": "<BLS/HSE SOII citation>", "year": <int>, "notes": "<1 sentence>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "medicalCostUSD": {
    "1": { "value": <integer in ${cur}>, "unit": "${cur}/case", "source": "<NSC/insurer benchmark>", "year": <int>, "notes": "<1 sentence about injury type/treatment>"},
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "injuryCostPerCase": {
    "1": { "value": <integer in ${cur}, total direct+indirect>, "unit": "${cur}/case", "source": "<NSC/Liberty Mutual/HSE total cost study>", "year": <int>, "notes": "direct + indirect incl. lost productivity, admin" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "insurancePremiumChangePct": {
    "1": { "value": <integer % change per incident>, "unit": "%", "source": "<NCCI EMR / WC actuarial study>", "year": <int>, "notes": "<1 sentence>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  },
  "regulatoryFineUSD": {
    "1": { "value": <integer in ${cur}>, "unit": "${cur}/violation", "source": "<OSHA 2024 / HSE / local equivalent citation>", "year": <int>, "notes": "<applicable regulation & typical enforcement level>" },
    "2": { ... }, "3": { ... }, "4": { ... }, "5": { ... }
  }
}

IMPORTANT:
- All monetary values must be in ${cur}. Apply purchasing-power / location multiplier for ${loc}.
- Use the most recently published data available (2022–2024 preferred).
- Each "source" must be a real, citable reference (OSHA table number, BLS publication, NSC chapter, specific regulation number).
- "notes" must explain WHY that specific value applies at that severity level.`;

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
        refreshBaselineData,
        CBA_MODEL
    };

})();
