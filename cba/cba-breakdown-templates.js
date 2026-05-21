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
    // COMPONENT RATIONALE MAP
    // Pattern → rich explanation for each known baseline component type.
    // Used by buildBenefitRows in cba-ui.js to populate noteDetails on every
    // split row so the user can read exactly what the value represents and why.
    //
    // Fields per entry:
    //   patterns  — lowercase substrings to match against the extracted label
    //   category  — optional: 'injuryCost' | 'medical' | 'regulatory' | null (any)
    //   definition — short title shown in the note header
    //   basis      — full audit narrative (what, why, Luxembourg statutory context)
    //   formula    — calculation instruction for Qty × Rate
    // ─────────────────────────────────────────────────────────────────────────
    CBA.COMPONENT_RATIONALE_MAP = [

        // ─── injuryCost / iceberg components ───────────────────────────────
        {
            patterns: ['mde deadweight', 'unrecovered salary', '20% mde', 'lohnfortzahlung deadweight', 'deadweight'],
            category: 'injuryCost',
            definition: 'MDE 20% employer deadweight (Lohnfortzahlung)',
            basis: 'During incapacity the employer must continue the worker\'s full gross salary (Lohnfortzahlung) until the end of the month containing the 77th absence day. MDE reimburses only 80% of this; the remaining 20% is a permanent non-recoverable loss to the employer. Luxembourg median daily employer cost (incl. 14% social charges): ~€255/day (STATEC 2024: €58,126/yr ÷ 260 days × 1.14). This 20% gap applies from day 1 of absence. Source: MDE mde.public.lu; Luxembourg Social Security Code Art. 92.',
            formula: 'Absence days × daily gross salary cost (incl. employer charges) × 20%'
        },
        {
            patterns: ['lost productivity', 'productivity loss', 'output loss', 'productive output', 'absent worker'],
            category: 'injuryCost',
            definition: 'Lost productive output — absent worker',
            basis: 'Value of work not produced while the worker is absent from the workplace. Standard Luxembourg proxy: daily gross salary × 1.5 value-added multiplier (adjust if you have throughput data). This is distinct from overtime cost — lost output is the counterfactual production gap; overtime is the recovery cost incurred by having colleagues cover. Source: ISSA Return on Prevention 2024 / internal operations estimate.',
            formula: 'Absence days × (daily gross salary × productivity multiplier, default 1.5)'
        },
        {
            patterns: ['overtime premium', 'overtime', 'covering absence', 'overtime cost'],
            category: 'injuryCost',
            definition: 'Overtime premium — colleagues covering the absence',
            basis: 'Extra cost of paying remaining workers at premium rates (typically 1.25×–1.50× normal rate under the applicable Luxembourg CBA/collective agreement) to maintain output while the worker is absent. Only count the premium increment over the normal rate — standard-rate cover is already in the productivity loss row above.',
            formula: 'Overtime hours × (hourly rate × premium multiplier − base hourly rate)'
        },
        {
            patterns: ['admin', 'investigation', 'administrative overhead', 'reporting overhead', 'investigation overhead', 'admin & investigation'],
            category: 'injuryCost',
            definition: 'Administrative & investigation overhead',
            basis: 'Internal HR, safety officer, and management time consumed by: accident investigation and root cause analysis; formal ITM declaration (mandatory for any recognized workplace accident); CCSS/AAA dossier filing; corrective-action follow-up; and management review. Luxembourg senior staff fully-loaded rate: ~€50–€80/hr. Typical investigation for a moderate case: 20–40 hrs = €1,000–€3,200. Source: ITM reporting requirements / internal HR estimate.',
            formula: 'Investigation + admin hours × fully-loaded hourly rate of staff involved'
        },
        {
            patterns: ['asset damage', 'material damage', 'equipment damage', 'property damage'],
            category: 'injuryCost',
            definition: 'Asset, equipment & property damage',
            basis: 'Repair or replacement cost of tools, machinery, vehicles, or infrastructure damaged in or by the incident. Use actual repair invoices or depreciated replacement cost. Exclude amounts covered by separate property insurance that is already captured in your insurance costs. Source: maintenance / facilities management estimate.',
            formula: 'Repair cost or (replacement value × % damaged) of each asset affected'
        },
        {
            patterns: ['aaa malus', 'aaa max malus', 'malus', 'insurance premium hike', 'bonus-malus', 'bonus malus', 'premium hike'],
            category: 'injuryCost',
            definition: 'AAA Bonus-Malus insurance premium hike (2-year effect)',
            basis: 'A declared workplace accident triggers an increase in the AAA accident insurance multiplier, raising the effective contribution rate for a 2-year observation window. AAA base rate 2025: 0.70% of gross payroll. Multipliers: 0.85 (bonus) | 1.00 (neutral) | 1.10 | 1.30 | 1.50 (maximum Malus). Example: on €10 M payroll, neutral→max Malus adds €35,000/yr → €70,000 over 2 years. This row uses the 1-year annualised impact; multiply by 2 for full exposure. Source: AAA aaa.public.lu.',
            formula: 'Gross annual payroll × (new effective AAA rate % − previous effective rate %)'
        },
        {
            patterns: ['recruitment', 'retraining', 'replacement', 'rehiring', 'recruitment / retraining'],
            category: 'injuryCost',
            definition: 'Recruitment, retraining & replacement costs',
            basis: 'Cost of hiring and onboarding a replacement when the injured worker leaves permanently (fatality, permanent incapacity > 78 weeks, or voluntary departure following injury). Components: agency/job board fees (~15–20% of annual salary), HR admin time (~20 hrs × €65/hr), induction and site-specific training (1–3 weeks × cost per training day), and reduced productivity during the learning curve (typically 3–6 months at 60–80% of experienced output). Source: HR / recruitment estimate.',
            formula: 'Agency fees + HR admin cost + training cost + productivity shortfall during ramp-up period'
        },
        {
            patterns: ['knowledge loss', 'productivity & knowledge', 'tacit knowledge', 'institutional knowledge'],
            category: 'injuryCost',
            definition: 'Tacit knowledge & institutional expertise loss',
            basis: 'Medium-term productivity gap from losing an experienced worker\'s tacit knowledge, process know-how, client relationships, and team expertise. This is distinct from the initial ramp-up cost (captured in retraining/recruitment). ISSA ROP study assigns a knowledge-loss multiplier of 0.5–2.0× annual salary for technical and specialist roles depending on role complexity and tenure length.',
            formula: 'Annual salary × knowledge-loss multiplier (0.5–2.0 based on role complexity and tenure)'
        },
        {
            patterns: ['itm criminal', 'criminal prosecution', 'criminal referral', 'parquet', 'procès-verbal'],
            category: 'injuryCost',
            definition: 'ITM criminal prosecution exposure',
            basis: 'For grave or fatal accidents, ITM transmits a procès-verbal to the Parquet (Luxembourg criminal prosecution authority). In 2024, 116 such referrals were made out of 1,856 targeted H&S controls. Criminal proceedings expose the company and responsible managers to criminal fines, suspended sentences, and civil liability. Costs include criminal defence counsel (Castegnaro 2024: €15,000–€80,000+), potential criminal fine awarded by the court, and management time over 18–36 months of proceedings. Source: ITM Annual Report 2024.',
            formula: 'Probability of criminal referral × (defence cost + expected fine + value of management time)'
        },
        {
            patterns: ['civil litigation', 'civil damages', 'civil liability', 'civil compensation', 'civil claim'],
            category: 'injuryCost',
            definition: 'Civil liability & litigation damages',
            basis: 'Parallel civil claims filed alongside criminal proceedings or the AAA statutory award. Victims and their families may claim non-statutory prejudice: préjudice d\'agrément, moral suffering, care costs, and loss of future earnings not covered by AAA. Luxembourg reference case: TAL-2021-02459 awarded €29,635 total (incl. €4,500 préjudice d\'agrément + €1,500 esthétique + €3,000 physiological). For fatal cases, civil awards routinely exceed €100,000.',
            formula: '1 × estimated civil damages award or out-of-court settlement (based on case severity and precedent)'
        },
        {
            patterns: ['legal defence', 'legal costs', 'legal fees', 'defence costs', 'criminal defence'],
            category: 'injuryCost',
            definition: 'Legal defence costs (all proceedings)',
            basis: 'External legal counsel costs to defend: ITM administrative proceedings; criminal prosecution before the Parquet; civil claims from the victim/family; and employment tribunal cases. For a single serious accident with criminal referral, total legal spend across all proceedings typically ranges from €30,000 to €80,000+ in Luxembourg (Castegnaro 2024 benchmark). Does not include internal management time (captured in admin overhead).',
            formula: '1 × estimated total external legal fees across all ongoing and anticipated proceedings'
        },
        {
            patterns: ['business disruption', 'operational disruption', 'disruption'],
            category: 'injuryCost',
            definition: 'Business disruption & operational impact',
            basis: 'Revenue or margin lost due to: mandatory site shutdown or machine lock-out ordered by ITM; production stoppages caused by the incident; customer delivery delays; order cancellations. ITM has authority to halt operations immediately pending investigation. Quantify by lost contribution margin per day of stoppage × estimated stoppage duration. Source: operations management / finance estimate.',
            formula: 'Stoppage days × daily contribution margin at risk (revenue − variable costs)'
        },
        {
            patterns: ['reputational damage', 'reputational', 'brand damage'],
            category: 'injuryCost',
            definition: 'Reputational & brand damage',
            basis: 'Medium-term impact on customer retention, talent attraction, and contract awards following a public incident, ITM press release, or criminal conviction. Highly variable; ISSA ROP assigns 5–15% of annual revenue at risk for SMEs following a high-profile fatal accident over 1–3 years. Use conservatively — only include if your company\'s reputation and contract pipeline is genuinely at risk.',
            formula: 'Conservative % of annual revenue at risk × estimated years of impact'
        },

        // ─── medicalCost components ────────────────────────────────────────
        {
            patterns: ['emergency', 'acute trauma', 'icu', 'hospitalization', 'emergency care', 'acute care', 'acute medical'],
            category: 'medical',
            definition: 'Acute trauma care & emergency hospitalization',
            basis: 'Immediate medical response: ambulance dispatch, A&E treatment, surgery, ICU stay, and acute hospitalization. Covered primarily by AAA for declared occupational accidents. Luxembourg national average total direct medical cost per AAA-declared accident: €4,053 (AAA 2024; 13,724 workplace accidents). For catastrophic/fatal cases (ITM Severity 5), acute hospitalization and trauma surgery costs are substantially higher — reference: AAA judgment TAL-2021-02459 documents €29,635 total indemnification. Source: AAA Annual Report 2024.',
            formula: 'Qty = expected incidents prevented per year; Rate = acute care cost per case (€4,053 avg S3, adjust per severity)'
        },
        {
            patterns: ['rehabilitation', 'physiotherapy', 'rehab', 'post-acute', 'recovery program', 'long-term rehabilitation'],
            category: 'medical',
            definition: 'Rehabilitation & physiotherapy',
            basis: 'Post-acute rehabilitation: physiotherapy sessions, occupational therapy, specialist follow-up consultations, and assistive devices. CNS (Centre National de la Santé) covers a portion; residual costs may fall on the employer or worker depending on the case classification. For major injuries (amputation, severe fracture, spinal trauma), active rehabilitation can extend 6–24 months. Source: CNS / occupational health estimate.',
            formula: 'Number of sessions (or months) × cost per session / monthly programme cost'
        },
        {
            patterns: ['disability pension', 'permanent disability', 'capitalised pension', 'capitalised value', 'annual pension', 'art. 92', 'art 92', 'incapacité permanente'],
            category: 'medical',
            definition: 'Permanent disability pension — capitalised present value (AAA Art. 92)',
            basis: 'Where permanent incapacity (incapacité permanente) is declared, AAA pays an annual disability pension under Luxembourg Social Security Code Art. 92. The capitalised NPV of all future pension payments can be very significant: for a 35-year-old worker with 80% incapacity rated at Luxembourg average wage (~€75,919/yr), the NPV at a 2% discount rate over 30 years exceeds €200,000. The figure reported here is the AAA-documented benchmark for this severity/age profile. This is the dominant cost item for catastrophic cases. Source: AAA Annual Report 2024; Luxembourg Social Security Code Art. 92 et seq.',
            formula: 'Annual pension amount × capitalisation factor (life table and discount rate; typically 15–30× for a working-age worker)'
        },
        {
            patterns: ['moral prejudice', 'physiological damages', 'préjudice', 'prejudice esthétique', 'agrément', 'aesthetic prejudice', 'non-economic'],
            category: 'medical',
            definition: 'Physiological, moral & aesthetic prejudice (non-economic damages)',
            basis: 'Courts award compensation beyond economic losses for: pain and suffering (pretium doloris), physiological impairment (IPP percentage), aesthetic disfigurement (préjudice esthétique), and loss of life enjoyment (préjudice d\'agrément). Luxembourg reference case TAL-2021-02459 documented: €4,500 préjudice d\'agrément + €1,500 préjudice esthétique + €3,000 physiological damages = €9,000 non-economic component on a total €29,635 award. These amounts are in addition to the disability pension and direct medical costs. Source: Luxembourg Labour Tribunal TAL-2021-02459.',
            formula: '1 × court-awarded non-economic damages (use TAL precedent or legal counsel estimate for the case profile)'
        },
        {
            patterns: ['direct medical treatment', 'medical treatment', 'treatment', 'primary care', 'medical care covered'],
            category: 'medical',
            definition: 'Direct medical treatment costs (AAA/CNS covered)',
            basis: 'Primary care covered by AAA: emergency room, GP/specialist consultations, hospitalization, pharmacy, and diagnostic imaging. AAA 2024 national average per declared accident: €4,053 (covering 13,724 workplace accidents nationally, 128 declarations/day). Adjust for severity: S1 minimal; S2 ~€2,000; S3 €4,053 (national avg); S4 ~€15,000 (serious injury hospitalization + rehab); S5 €29,635+ (catastrophic/fatal; TAL-2021-02459 documented). Source: AAA Annual Report 2024.',
            formula: 'Qty = incidents prevented per year; Rate = €4,053 (S3 AAA average) or severity-adjusted cost per case'
        },

        // ─── regulatoryFine components ─────────────────────────────────────
        {
            patterns: ['itm administrative fine', 'itm fine', 'administrative fine', 'itm sanction', 'itm admin'],
            category: 'regulatory',
            definition: 'ITM administrative fine (Labour Code Art. L.8115-3)',
            basis: 'ITM issued 1,152 administrative fines in 2024 totalling €6,370,500 (average €5,530/fine; up €939,000 vs 2023, reflecting a +12.3% increase in targeted H&S controls). Maximum fine: €4,000 per worker concerned per violation — this multiplies with the number of workers at risk. Example: 15 workers on a cited installation → €60,000 maximum. For criminal referrals (116 in 2024), additional prosecution risk is captured separately. Source: ITM Annual Report 2024.',
            formula: 'Maximum scenario: €4,000 × number of workers concerned; Expected scenario: ITM average €5,530'
        },
        {
            patterns: ['criminal defence', 'defence costs', 'criminal legal', 'prosecution defence', 'legal defence costs'],
            category: 'regulatory',
            definition: 'Criminal defence legal costs',
            basis: 'Where ITM transmits a procès-verbal to the Parquet (116 cases in 2024 for grave/fatal accidents), the employer and responsible managers must engage criminal defence counsel throughout proceedings (typically 18–36 months in Luxembourg courts). Castegnaro 2024 benchmark: €15,000–€80,000 in external legal fees depending on case complexity and number of charges. For fatal cases, defence usually involves multiple hearings, expert witnesses, and potential appeals. Source: ITM Annual Report 2024; Castegnaro legal benchmark 2024.',
            formula: '1 × estimated criminal defence fees across all hearings and proceedings (use Castegnaro benchmark)'
        },
        {
            patterns: ['civil damages', 'civil compensation', 'civil award', 'civil claim settlement'],
            category: 'regulatory',
            definition: 'Civil liability damages & compensation',
            basis: 'Parallel civil proceedings alongside criminal prosecution or the AAA statutory award. Victims or families claim moral prejudice, loss of earnings, and care costs not covered by AAA. Luxembourg courts have documented €29,635 in a serious case (TAL-2021-02459). For fatal cases, civil awards routinely exceed €100,000 and can include claims from multiple family members. Quantify at the conservative end of the precedent range unless counsel advises otherwise.',
            formula: '1 × expected civil damages award or settlement amount (based on case profile and Luxembourg precedent)'
        },
        {
            patterns: ['pdca', 'corrective action', 'mandatory programme', 'remediation programme', 'mandatory pdca'],
            category: 'regulatory',
            definition: 'Mandatory corrective action programme (PDCA)',
            basis: 'Following a serious ITM enforcement action, the employer must implement and document a formal corrective action programme (Plan-Do-Check-Act cycle), typically under ITM supervision. Costs: external OSH consultant (€300–€500/day × 30–60 days); engineering modifications; training delivery; re-certification; and ITM re-inspection costs. Typical engagement: 3–6 months = €9,000–€30,000. Failure to implement the PDCA adequately can result in renewed enforcement action and additional fines.',
            formula: '1 × total external consultant and implementation costs across the PDCA programme duration'
        },
        {
            patterns: ['ccss penalty', 'ccss fine', 'declaration penalty', 'late declaration', 'aaa penalty'],
            category: 'regulatory',
            definition: 'CCSS / AAA late-declaration penalty',
            basis: 'Employers must declare a workplace accident to CCSS and AAA within the statutory deadline after the accident occurs. Late or missing declarations attract administrative penalties and create a compliance record referenced in future ITM risk profiling. The penalty itself is typically modest, but the compliance failure can escalate enforcement risk and increase audit frequency.',
            formula: '1 × penalty per late/missing declaration × number of affected incidents'
        }
    ];

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
