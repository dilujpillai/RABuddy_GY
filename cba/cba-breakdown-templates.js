/**
 * cba-breakdown-templates.js — Default breakdown row templates & rationale paragraphs
 *
 * Each cost and benefit category has:
 *   paragraph — a plain-English sentence or two explaining what this category covers
 *               and why it matters. Pre-fills the rationale textarea on first "calc" click.
 *               User can edit it freely afterwards.
 *
 *   rows      — default array of breakdown row objects (qty & rate start at 0 — user fills
 *               in the actual figures). Each row has a label, noteDetails.definition, and
 *               noteDetails.basis to guide the user.
 *
 * To add or modify a category: find its key below and edit the paragraph / rows array.
 * Add new cost categories under CBA.BREAKDOWN_TEMPLATES.cost, benefit categories under
 * CBA.BREAKDOWN_TEMPLATES.benefit. The unit field is set at runtime; leave it as '' here.
 *
 * Luxembourg context — sources:
 *   AAA Annual Report 2024 | MDE Premium Tables 2025 | ITM Annual Report 2024
 *   STATEC Wages 2024 | ISSA Return on Prevention Study | Luxembourg Social Security Code
 */
(function () {
    'use strict';

    window.CBA = window.CBA || {};

    // ─────────────────────────────────────────────────────────────────────────
    // Helper — build a clean row object from a template definition
    // ─────────────────────────────────────────────────────────────────────────
    function row(label, definition, basis, source, sourceUrl, qty, rate) {
        return {
            label: label,
            qty: qty != null ? qty : 0,
            rate: rate != null ? rate : 0,
            qtyReason: '',          // populated by syncRowQtyReasonFromNote at render time
            unit: '',               // set to cat.unit at runtime in buildItemCard
            source: source || '',
            sourceUrl: sourceUrl || '',
            noteDetails: {
                definition: definition || label,
                basis: basis || '',
                parameters: '',
                formula: 'Qty × Rate',
                autoParams: true
            }
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COST CATEGORY TEMPLATES
    // ─────────────────────────────────────────────────────────────────────────
    const COST_TEMPLATES = {

        capital: {
            paragraph:
                'Capital expenditure covers the upfront cost of purchasing the safety equipment, ' +
                'devices, or structural components needed to put this measure in place. ' +
                'It also includes any engineering design and professional fees. ' +
                'This is a one-off investment — document each item with a supplier quote so ' +
                'the total can be justified to finance and senior leadership.',
            rows: [
                row('Equipment / device purchase',
                    'Purchase price of the primary safety equipment or device (ex VAT).',
                    'Obtain a supplier quotation. Enter the net price excluding VAT. ' +
                    'If leased rather than purchased, move to Annual Maintenance instead.',
                    'Supplier quotation', '', 1, 0),
                row('Engineering & design fees',
                    'Professional fees for hazard engineering, technical drawings, or specifications.',
                    'Include only if external engineering is required. ' +
                    'Internal engineering hours can be entered here as hours × hourly rate.',
                    'Internal estimate / supplier quotation', '', 1, 0),
                row('Procurement, delivery & site logistics',
                    'Shipping, handling, customs clearance, and site delivery costs.',
                    'Often 5–15% of equipment cost for imported equipment. ' +
                    'Check with procurement for actual freight quotes.',
                    'Procurement estimate', '', 1, 0),
            ]
        },

        installation: {
            paragraph:
                'Installation cost covers the labour and materials needed to physically put the ' +
                'measure in place, including all commissioning and acceptance testing before ' +
                'handover. It is typically a one-off cost incurred during the project implementation ' +
                'phase. Contractor quotations should be obtained where external labour is used.',
            rows: [
                row('Installation labour',
                    'Hours of installation work multiplied by the applicable labour rate.',
                    'Qty = total installation hours; Rate = hourly cost of the installer ' +
                    '(contractor day rate ÷ 8, or internal employee fully-loaded hourly rate). ' +
                    'Luxembourg median fully-loaded rate: approx. €35–€65/hr.',
                    'Contractor quotation / internal HR rate', '', 0, 0),
                row('Materials, fixings & consumables',
                    'All physical materials consumed during installation (fixings, cabling, brackets, sealant, etc.).',
                    'Use the bill of materials from the engineering design or contractor quote. ' +
                    'Qty = 1 lump sum if not itemised.',
                    'Contractor quotation / procurement estimate', '', 1, 0),
                row('Commissioning & acceptance testing',
                    'Cost of testing the installed measure to confirm it functions correctly and meets safety standards.',
                    'May include ITM or third-party inspector fee. ' +
                    'In Luxembourg, certain safety devices require formal commissioning sign-off.',
                    'ITM / third-party inspector fee', '', 1, 0),
            ]
        },

        maintenance: {
            paragraph:
                'Annual maintenance keeps the safety measure working reliably over its entire ' +
                'service life. This includes scheduled servicing, replacement of wear parts, and ' +
                'any statutory inspection or ITM certification required by Luxembourg law. ' +
                'Skipping maintenance can void certification and create regulatory liability.',
            rows: [
                row('Scheduled service visits per year',
                    'Number of planned maintenance visits by a qualified technician each year.',
                    'Qty = visits per year; Rate = cost per visit (travel + labour + parts). ' +
                    'Check the manufacturer's recommended service interval.',
                    'Maintenance contract / service schedule', '', 0, 0),
                row('Spare parts & consumables (annual)',
                    'Annual budget for replacement parts, filters, lubricants, or other consumables.',
                    'Use the manufacturer's parts list or historical spend on similar equipment. ' +
                    'Qty = 1 lump sum if not itemised; Rate = annual spend.',
                    'Manufacturer parts list / maintenance contract', '', 1, 0),
                row('Statutory inspection / certification (annual)',
                    'ITM or accredited body annual inspection fee and any re-certification cost.',
                    'Luxembourg Labour Code and ITM regulations require periodic inspection of ' +
                    'certain safety devices. Check the applicable regulation for the inspection interval.',
                    'ITM / accredited inspection body', '', 1, 0),
            ]
        },

        training: {
            paragraph:
                'Training ensures every worker who operates or works near this safety measure ' +
                'understands how to use it correctly and what to do if it fails. ' +
                'Initial induction is a one-off cost; annual refreshers are an ongoing investment. ' +
                'Document all training as evidence of due diligence under the Luxembourg Labour Code.',
            rows: [
                row('Initial induction training',
                    'One-off training for all affected workers on how the new measure works.',
                    'Qty = number of workers trained × hours per person; ' +
                    'Rate = fully-loaded hourly labour rate (worker time) + external trainer fee if applicable. ' +
                    'Luxembourg STATEC median wage: ~€28/hr fully loaded.',
                    'Internal HR / external training provider', '', 0, 0),
                row('Annual refresher training',
                    'Yearly refresher to keep skills current and meet regulatory requirements.',
                    'Qty = number of workers × hours per refresher session; ' +
                    'Rate = hourly labour rate (workers\' time away from production). ' +
                    'Some Luxembourg regulations mandate annual refresher frequency.',
                    'Internal HR / training provider schedule', '', 0, 0),
                row('External course / certification fees',
                    'Cost of external courses, qualifications, or certification exams required for the measure.',
                    'Qty = number of people requiring certification; ' +
                    'Rate = per-person course or exam fee.',
                    'External training provider quotation', '', 0, 0),
            ]
        },

        downtime: {
            paragraph:
                'Production downtime captures the value of output lost while the safety measure ' +
                'is installed, commissioned, or maintained. Estimate the total shutdown hours ' +
                'and multiply by the hourly value of production — either the throughput rate or ' +
                'the cost of bringing in temporary cover to maintain output.',
            rows: [
                row('Planned shutdown hours × production value',
                    'Total hours production stops during installation or major maintenance, multiplied by the hourly production value.',
                    'Qty = total hours of planned production stoppage; ' +
                    'Rate = hourly value of lost output (throughput rate, contribution margin per hour, ' +
                    'or overtime cost to make up lost production). ' +
                    'Confirm with operations manager.',
                    'Operations / production planning', '', 0, 0),
                row('Temporary cover or overtime to minimise downtime',
                    'Cost of covering production with temporary workers or overtime during the shutdown.',
                    'Qty = hours of cover needed; Rate = additional cost per hour (overtime premium or agency rate). ' +
                    'Only include if separate from and in addition to the downtime loss above.',
                    'HR / operations estimate', '', 0, 0),
            ]
        },

        consultant: {
            paragraph:
                'External consultant or specialist fees cover professional advice, risk assessments, ' +
                'technical reports, or specialist design work that cannot be done in-house. ' +
                'In Luxembourg, certain hazard assessments require a certificated safety engineer ' +
                '(ingénieur de sécurité) or an ITM-approved specialist.',
            rows: [
                row('Consultancy days × day rate',
                    'Number of consultancy days required multiplied by the specialist\'s daily rate.',
                    'Qty = days; Rate = consultant day rate. ' +
                    'Luxembourg senior H&S consultant market rate: approx. €1,200–€2,000/day.',
                    'Consultant proposal / framework contract', '', 0, 0),
                row('Technical report / documentation fee',
                    'Fixed fee for a formal written report, risk assessment document, or regulatory submission.',
                    'Qty = 1 report; Rate = agreed fixed fee.',
                    'Consultant proposal', '', 1, 0),
                row('Site survey / audit fee',
                    'Cost of an on-site survey, hazard audit, or pre-installation inspection.',
                    'Qty = 1 survey; Rate = survey fee including travel.',
                    'Consultant proposal / ITM accredited auditor', '', 1, 0),
            ]
        },

        admin: {
            paragraph:
                'Administrative overhead covers internal management time, permit applications, ' +
                'regulatory notifications, and documentation work associated with implementing ' +
                'this measure. In Luxembourg, ITM must be notified of certain construction or ' +
                'installation activities and safety modifications before work begins.',
            rows: [
                row('Management & coordination time',
                    'Internal management hours spent coordinating the project, chairing meetings, and overseeing contractors.',
                    'Qty = total hours of management time; ' +
                    'Rate = fully-loaded hourly cost of the manager (salary + employer social charges). ' +
                    'Luxembourg employer social charge rate: approx. 12–15% on top of gross salary.',
                    'Internal HR / management estimate', '', 0, 0),
                row('ITM permit / notification filing',
                    'Fee and internal time required to file an ITM permit application or statutory notification.',
                    'Qty = 1; Rate = permit fee + internal preparation time cost. ' +
                    'Check the ITM website for the applicable declaration form and fee schedule.',
                    'ITM — www.itm.public.lu', 'https://itm.public.lu/fr/publications/rapports-annuels.html', 1, 0),
                row('Document control & record-keeping',
                    'Cost of updating safety management documentation, procedures, and records following the change.',
                    'Qty = hours of document update work; ' +
                    'Rate = hourly cost of the person responsible for the quality/safety management system.',
                    'Internal safety or quality team estimate', '', 0, 0),
            ]
        },

        otherRecurring: {
            paragraph:
                'This category captures any ongoing costs not covered above — for example, ' +
                'software subscriptions, monitoring service fees, SIM/connectivity costs for ' +
                'IoT devices, or additional energy costs linked to keeping the measure active. ' +
                'Enter each distinct recurring cost as a separate row.',
            rows: [
                row('Annual subscription / licence fee',
                    'Recurring software, cloud service, or licence fee tied to this safety measure.',
                    'Qty = 1 year; Rate = annual subscription cost. ' +
                    'If billed monthly, multiply monthly cost × 12 for the annual rate.',
                    'Supplier invoice / subscription agreement', '', 1, 0),
                row('Additional operating cost (energy, connectivity, etc.)',
                    'Any extra utility or running cost incurred because of this measure.',
                    'Qty = 1 year; Rate = annual incremental cost (e.g., additional electricity kWh × tariff). ' +
                    'Only include costs directly caused by this measure.',
                    'Facilities / utilities estimate', '', 1, 0),
            ]
        },

        other: {
            paragraph:
                'Use this category for any one-off costs that do not fit neatly into the ' +
                'categories above — for example, demolition or removal of the hazard source, ' +
                'decommissioning of old equipment, a contingency allowance, or unforeseen ' +
                'project expenses identified during implementation.',
            rows: [
                row('Miscellaneous one-off expense',
                    'Any other one-time cost directly linked to implementing this safety measure.',
                    'Describe the nature of this cost in the Definition and Basis fields above. ' +
                    'Qty = 1; Rate = estimated cost.',
                    'Internal estimate', '', 1, 0),
                row('Contingency allowance',
                    'A prudent reserve for cost overruns or unforeseen expenses (typically 5–15% of total project cost).',
                    'Qty = 1; Rate = contingency amount (e.g., 10% of total capital + installation cost). ' +
                    'Remove this row if the project has a fixed-price contract.',
                    'Internal project management practice', '', 1, 0),
            ]
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BENEFIT CATEGORY TEMPLATES
    // ─────────────────────────────────────────────────────────────────────────
    const BENEFIT_TEMPLATES = {

        injuryCost: {
            paragraph:
                'Preventing a workplace accident eliminates a cascade of hidden costs that go ' +
                'far beyond direct medical treatment — the "iceberg" below the surface. ' +
                'In Luxembourg, the employer bears 20% of wage costs during incapacity ' +
                '(MDE reimburses only 80%), plus the productivity loss of the absent worker, ' +
                'overtime paid to colleagues who cover the gap, administrative and investigation ' +
                'time, asset damage, and a lasting AAA Malus insurance premium hike that can ' +
                'persist for two years. Each row below represents one component of the ' +
                'Luxembourg Sec. 8.2 iceberg cost model — edit the values to match your site.',
            rows: [
                row('Unrecovered salary — 20% MDE deadweight',
                    'The 20% of the absent worker\'s gross salary that MDE does NOT reimburse to the employer during incapacity (Lohnfortzahlung period: up to end of month of the 77th day).',
                    'Qty = absence days × 8 hrs (or equivalent pay-days); ' +
                    'Rate = 20% of the worker\'s daily gross salary cost. ' +
                    'MDE reimburses 80%; employer absorbs 20% as direct deadweight loss. ' +
                    'Luxembourg median daily gross wage: ~€224/day (€58,126/yr ÷ 260 days).',
                    'MDE — mde.public.lu', 'https://mde.public.lu/fr/affiliation-financement/financement.html',
                    0, 0),
                row('Lost productivity (absent worker)',
                    'Value of output not produced while the worker is absent from the workplace.',
                    'Qty = absence days; Rate = daily value added by this worker (output or revenue contribution per day). ' +
                    'If unknown, use: daily gross salary × 1.5 as a proxy (common Luxembourg productivity multiplier).',
                    'Internal operations / HR estimate', '', 0, 0),
                row('Overtime premium — covering absence',
                    'Extra cost of paying remaining workers overtime to maintain output during the absence.',
                    'Qty = overtime hours required to cover the absence; ' +
                    'Rate = overtime premium rate (normal hourly rate × 1.25 or 1.50 depending on the Luxembourg CBA applicable). ' +
                    'Only include hours actually paid at premium rate.',
                    'HR payroll records / CBA collective agreement', '', 0, 0),
                row('Administrative & investigation overhead',
                    'Internal HR, safety officer, and management time spent on accident investigation, ' +
                    'ITM declaration, CCSS/AAA reporting, and corrective action follow-up.',
                    'Qty = hours of internal admin/investigation time; ' +
                    'Rate = fully-loaded hourly rate of the staff involved (safety officer, HR, manager). ' +
                    'Luxembourg senior staff rate: approx. €50–€80/hr fully loaded.',
                    'Internal safety team / HR estimate', '', 0, 0),
                row('AAA Malus insurance premium hike (annual)',
                    'Increase to the AAA accident insurance premium triggered by the incident. ' +
                    'The AAA Bonus-Malus system raises the effective rate for 2 years following a declared accident. ' +
                    'Formula: Gross payroll × (new effective rate % − previous effective rate %).',
                    'Qty = 1; Rate = annual premium increase in €. ' +
                    'Example: €10M payroll, Malus goes from 1.00× to 1.30× on 0.70% base: ' +
                    '€10M × 0.21% = €21,000/yr extra. ' +
                    'AAA base rate 2025: 0.70%; max Malus: 1.50×.',
                    'AAA — aaa.public.lu', 'https://aaa.public.lu/fr/prestations-cotisations/cotisations/bonusmalus.html',
                    1, 0),
            ]
        },

        insurance: {
            paragraph:
                'Reducing workplace accident frequency improves the company\'s AAA Bonus-Malus ' +
                'score over the two-year observation period, lowering the effective premium rate ' +
                'applied to gross annual payroll. Even a one-tier improvement — for example, ' +
                'from Malus 1.30× down to the neutral 1.00× — saves €21,000 per year on a ' +
                '€10 million payroll. The benefit is realised two years after the accident rate drops.',
            rows: [
                row('AAA premium saving on annual payroll',
                    'Annual saving from an improvement in the AAA Bonus-Malus multiplier, applied to gross payroll.',
                    'Qty = gross annual payroll (€); Rate = reduction in effective AAA rate as a decimal. ' +
                    'Example: Malus 1.30× → 1.00× on 0.70% base = 0.21% saving → Rate = 0.0021. ' +
                    'AAA Bonus-Malus multipliers: 0.85 (bonus) | 1.00 (neutral) | 1.10 | 1.30 | 1.50 (max malus). ' +
                    'Source: AAA 2025.',
                    'AAA Bonus-Malus — aaa.public.lu', 'https://aaa.public.lu/fr/prestations-cotisations/cotisations/bonusmalus.html',
                    0, 0),
                row('MDE class benefit (if applicable)',
                    'Reduction in MDE (Mutualité des Employeurs) premium if the class is downgraded due to fewer absence days.',
                    'MDE classes employers based on their average incapacity days per employee. ' +
                    'A significant reduction in absence can move the employer to a lower (cheaper) MDE class. ' +
                    'Verify the applicable class change with the MDE affiliation office before including this row.',
                    'MDE — mde.public.lu', 'https://mde.public.lu/fr/affiliation-financement/financement.html',
                    1, 0),
            ]
        },

        medical: {
            paragraph:
                'Preventing the injury eliminates the direct cost of medical care. In Luxembourg, ' +
                'the AAA and CNS cover most medical expenses for declared occupational accidents, ' +
                'but employers absorb residual costs such as occupational health visits, ' +
                'workplace first-aid supplies, and any non-covered rehabilitation. ' +
                'The AAA national average direct medical cost per recognised accident was €4,053 in 2024.',
            rows: [
                row('Direct medical treatment avoided',
                    'Primary medical care: emergency response, GP/specialist consultations, hospitalization, pharmacy.',
                    'Use the AAA 2024 average of €4,053 per recognised accident (moderate, S3 severity). ' +
                    'Adjust up for higher severity: S4 major ~€15,000; S5 catastrophic ~€29,635 (TAL-2021-02459). ' +
                    'Qty = expected incidents per year avoided; Rate = cost per incident.',
                    'AAA Annual Report 2024', 'https://aaa.public.lu/fr/aaa/Rapport-annuel.html',
                    0, 0),
                row('Rehabilitation & physiotherapy',
                    'Post-acute rehabilitation not fully covered by CNS: physiotherapy sessions, specialist follow-up.',
                    'Qty = expected incidents per year; Rate = estimated rehabilitation cost per case. ' +
                    'CNS covers a portion; the remainder may fall on employer or worker depending on the case.',
                    'CNS / occupational health estimate', '', 0, 0),
                row('Occupational health & first-aid cost',
                    'On-site occupational health nurse time, first-aid supplies, and referral costs absorbed by the employer.',
                    'Qty = expected incidents per year; Rate = employer-side first-aid cost per incident (typically €100–€500). ' +
                    'Exclude amounts covered by AAA/CNS.',
                    'Internal occupational health / HR estimate', '', 0, 0),
            ]
        },

        regulatory: {
            paragraph:
                'The ITM issued 1,152 administrative fines in 2024 totalling €6,370,500, ' +
                'an average of €5,530 per fine. In serious cases fines can reach €4,000 per ' +
                'worker concerned, and 116 files were transmitted to the Parquet for criminal ' +
                'prosecution. This benefit captures the expected fine value weighted by the ' +
                'probability that the uncontrolled hazard would have been cited by ITM or triggered ' +
                'an enforcement action following an accident.',
            rows: [
                row('ITM administrative fine risk',
                    'Expected ITM fine if the hazard remains uncontrolled, weighted by the probability of an enforcement action.',
                    'Qty = probability of a citation (0.0–1.0, e.g., 0.30 = 30% chance); ' +
                    'Rate = expected fine amount. Use the ITM 2024 average of €5,530 for standard violations, ' +
                    'or €4,000 × number of workers for systemic failures.',
                    'ITM Annual Report 2024', 'https://itm.public.lu/dam-assets/fr/publications/rapports-annuels/rapport-annuel-2024.pdf',
                    0, 0),
                row('Legal defence cost avoided',
                    'Estimated legal fees to defend an ITM or AAA formal case or criminal referral.',
                    'Qty = 1; Rate = estimated legal defence cost (€). ' +
                    'Luxembourg criminal defence for a workplace accident prosecution: typically €15,000–€50,000+. ' +
                    'Only include if the hazard severity makes criminal referral a realistic risk.',
                    'Luxembourg Bar / legal counsel estimate', '', 1, 0),
                row('CCSS / AAA administrative penalty',
                    'Fines for late or missing accident declaration to CCSS or AAA.',
                    'AAA requires formal declaration within a set period of a workplace accident. ' +
                    'Late or missing declaration triggers administrative penalties. ' +
                    'Qty = 1; Rate = estimated penalty.',
                    'CCSS / AAA compliance rules', 'https://aaa.public.lu/fr/aaa/Rapport-annuel.html',
                    1, 0),
            ]
        },

        production: {
            paragraph:
                'This benefit captures the additional productive output gained because the hazard ' +
                'no longer causes stoppages, slowdowns, rework, or quality losses. ' +
                'Estimate how many hours per year the team lost to the hazard — from micro-stoppages, ' +
                'toolbox talks after near-misses, or post-incident clean-up — and multiply by ' +
                'the hourly value of production output.',
            rows: [
                row('Hours of production downtime avoided per year',
                    'Total hours per year previously lost to the hazard (stoppages, incidents, near-miss response).',
                    'Qty = hours per year; Rate = value of output per production hour (€/hr). ' +
                    'Use throughput rate, contribution margin per hour, or the effective machine rate. ' +
                    'Discuss with production/operations management to validate.',
                    'Production / operations management estimate', '', 0, 0),
                row('Quality rework hours avoided',
                    'Hours spent reworking defective or damaged output caused by the hazard.',
                    'Qty = rework hours per year; Rate = labour rate of the rework crew (€/hr). ' +
                    'Include material scrap cost if significant.',
                    'Quality / operations management estimate', '', 0, 0),
            ]
        },

        material: {
            paragraph:
                'Controlling the hazard reduces physical damage to equipment, tooling, and ' +
                'materials — every damaged item that does not need to be replaced or repaired ' +
                'is a direct saving. This benefit covers reduced replacement costs, lower ' +
                'consumable waste, and smaller repair bills caused directly by the hazard.',
            rows: [
                row('Equipment damage replacements avoided per year',
                    'Number of equipment or component replacements per year that the hazard was causing, multiplied by cost per replacement.',
                    'Qty = replacement events per year; Rate = cost per replacement (parts + labour). ' +
                    'Use maintenance records to identify the frequency.',
                    'Maintenance / procurement records', '', 0, 0),
                row('Consumable / material waste reduction',
                    'Annual saving in raw materials, packaging, or consumables no longer damaged or wasted due to the hazard.',
                    'Qty = 1 year; Rate = annual saving in € (compare current material consumption with projected consumption after control). ' +
                    'Use procurement records or production scrap rate data.',
                    'Procurement / production records', '', 0, 0),
            ]
        },

        ppe: {
            paragraph:
                'If this safety measure eliminates or sufficiently controls the hazard at source, ' +
                'the PPE previously required to protect workers against it may no longer be needed. ' +
                'This generates an ongoing annual saving in procurement, fitting, storage, ' +
                'inspection, and record-keeping of personal protective equipment — and removes ' +
                'the discomfort and physiological burden on workers.',
            rows: [
                row('PPE items eliminated per year',
                    'Number of PPE units that no longer need to be purchased each year as a result of this control.',
                    'Qty = (items per person × replacement frequency per year) × number of workers; ' +
                    'Rate = cost per item (€). ' +
                    'Use the current PPE procurement records as the baseline.',
                    'PPE procurement records / stores', '', 0, 0),
                row('PPE storage, inspection & admin saving',
                    'Time and cost saving from no longer managing, inspecting, recording, and disposing of the eliminated PPE.',
                    'Qty = hours per year spent on PPE management for this item; ' +
                    'Rate = hourly cost of the person responsible (H&S officer or stores). ' +
                    'Some PPE (e.g., harnesses, RPE) requires periodic inspection records under ITM rules.',
                    'H&S / stores management estimate', '', 0, 0),
            ]
        },

        manhours: {
            paragraph:
                'Preventing the injury avoids the absence days that would otherwise be lost to ' +
                'the workforce. Each absent day represents 8 hours of paid but unproductive time. ' +
                'In Luxembourg, the employer continues to pay the full salary during absence ' +
                '(Lohnfortzahlung) and MDE reimburses only 80%, so there is a direct ' +
                'labour cost saving on top of the productivity recovery.',
            rows: [
                row('Absence days avoided × 8 hrs (labour cost)',
                    'Total productive hours recovered by preventing the expected accident and associated absence.',
                    'Qty = expected absence days avoided per year × 8 hours/day; ' +
                    'Rate = fully-loaded hourly labour rate (gross hourly wage + employer social charges). ' +
                    'Luxembourg STATEC median gross wage 2024: ~€58,126/yr = ~€28/hr. ' +
                    'Fully loaded (+ ~30% employer charges): ~€36/hr. ' +
                    'Use the actual worker\'s rate for higher accuracy.',
                    'STATEC Wages 2024 / HR payroll', 'https://statistiques.public.lu/fr.html',
                    0, 0),
            ]
        },

        retention: {
            paragraph:
                'A safer workplace directly reduces staff turnover linked to injuries, fear of harm, ' +
                'and low morale. Replacing a skilled worker in Luxembourg typically costs ' +
                'one to three months\' gross salary when recruitment fees, onboarding time, ' +
                'and the productivity gap before the new hire reaches full competence are ' +
                'all factored in. Retention savings compound over time.',
            rows: [
                row('Recruitment cost avoided',
                    'Agency fees, job advertising, and HR interview time saved by retaining workers who might otherwise leave due to safety concerns.',
                    'Qty = number of workers expected to be retained; ' +
                    'Rate = recruitment cost per hire (agency fee + internal HR time). ' +
                    'Luxembourg agency fees: typically 10–20% of annual gross salary for specialist roles.',
                    'HR / recruitment records', '', 0, 0),
                row('Onboarding & induction training avoided',
                    'Internal trainer and HR time + onboarding materials saved by not needing to replace a worker.',
                    'Qty = onboarding hours per new hire × number of hires avoided; ' +
                    'Rate = average hourly cost of trainer + HR. ' +
                    'Typically 20–40 hrs of structured onboarding for a safety-critical role.',
                    'HR / training records', '', 0, 0),
                row('Productivity ramp-up loss avoided',
                    'The output gap during the weeks a new hire is learning the role — the difference between their output and a fully-competent worker\'s output.',
                    'Qty = weeks of ramp-up × weekly productivity gap (hours/week × fraction of full competence gap); ' +
                    'Rate = hourly output value. ' +
                    'Typical ramp-up to full competence: 4–12 weeks for operational roles.',
                    'Operations / HR estimate', '', 0, 0),
            ]
        },

        otherBenefit: {
            paragraph:
                'Use this category for any additional benefits not captured in the categories above. ' +
                'Examples include improved employer brand attractiveness, eligibility for government ' +
                'safety grants or subsidies, customer confidence gains, or reduced civil litigation ' +
                'exposure. Assign a conservative monetary estimate and document your reasoning clearly.',
            rows: [
                row('Reputational / employer brand benefit',
                    'Estimated annual monetary value of improved employer brand, talent attraction, or customer/client confidence attributable to the safety improvement.',
                    'This is inherently subjective — document your methodology. ' +
                    'Possible proxies: reduction in recruitment advertising spend, or % improvement in employee survey safety scores converted to a turnover saving. ' +
                    'Keep the estimate conservative and justified.',
                    'Internal HR / communications estimate', '', 1, 0),
                row('Other miscellaneous benefit',
                    'Any additional one-off or recurring benefit not categorised above.',
                    'Qty = 1; Rate = estimated annual (or one-off) benefit in €. ' +
                    'Add more rows for each distinct benefit.',
                    'Internal estimate', '', 1, 0),
            ]
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the template for a category.
     * @param {string} type  - 'cost' or 'benefit'
     * @param {string} key   - category key (e.g., 'capital', 'injuryCost')
     * @returns {{ paragraph: string, rows: Array }|null}
     */
    CBA.getBreakdownTemplate = function (type, key) {
        const section = type === 'cost' ? COST_TEMPLATES : BENEFIT_TEMPLATES;
        return section[key] || null;
    };

    /**
     * Build template rows with the correct runtime unit applied.
     * Returns a deep copy so mutations don't affect the originals.
     * @param {string} type       - 'cost' or 'benefit'
     * @param {string} key        - category key
     * @param {string} unitLabel  - e.g., 'one-off', 'per year', 'per month'
     * @returns {Array} array of row objects ready to assign to breakdowns[key]
     */
    CBA.buildTemplateRows = function (type, key, unitLabel) {
        const tmpl = CBA.getBreakdownTemplate(type, key);
        if (!tmpl) return [];
        return tmpl.rows.map(r => {
            const copy = JSON.parse(JSON.stringify(r));
            copy.unit = unitLabel || '';
            return copy;
        });
    };

    /**
     * Get just the rationale paragraph for a category.
     * Returns '' if no template exists.
     */
    CBA.getBreakdownParagraph = function (type, key) {
        const tmpl = CBA.getBreakdownTemplate(type, key);
        return tmpl ? tmpl.paragraph : '';
    };

})();
