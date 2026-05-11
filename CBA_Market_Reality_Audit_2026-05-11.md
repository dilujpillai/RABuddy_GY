# CBA + Luxembourg Market Reality Audit
Date: 2026-05-11
Reviewer: GitHub Copilot (GPT-5.3-Codex)

## 1) Scope Reviewed
- CBA logic and assumptions in:
  - cba/cba-baseline.js
  - cba/cba-ai.js
  - cba/cba-engine.js
  - cba/cba-ui.js
- Research file:
  - Luxembourg Workplace Safety Incident Costs.md
- External validation against available official/public sources:
  - Gouvernement.lu AAA communiqué (Rapport annuel 2024 publication)
  - AAA bonus-malus page
  - MDE affiliation/financing pages
  - ITM figures (via article linking to ITM annual report)

---

## 2) Executive Verdict
Overall, your direction is strong and largely aligned with Luxembourg context, but there is one **critical market-reality deviation** in both the research narrative and CBA prompts: **the model treats workplace accidents as directly driving MDE class upgrades**, while MDE official rules indicate accident-at-work absences are excluded from the financial absenteeism rate used for classing.

This affects the reliability of:
- the reported €32,341 scenario decomposition,
- baseline assumptions tied to MDE class jump due to accidents,
- AI-generated insurance benefit/cost projections.

---

## 3) What Is Confirmed / Aligned

### 3.1 AAA 2024 headline figures are aligned
Confirmed from Gouvernement.lu communiqué:
- 16,751 recognized accidents in 2024
- 13,724 workplace accidents
- 2,889 commuting accidents
- 138 occupational diseases
- average cost €4,053 per accident
- 128 declarations/day
- 501,285 worker-units; 31,085 enterprises

Where used:
- Luxembourg Workplace Safety Incident Costs.md (sections 3 and 8)
- cba/cba-baseline.js (comments and severity anchors)
- cba/cba-ai.js (Luxembourg framework prompts)

### 3.2 AAA bonus-malus structure is aligned
Confirmed from AAA bonus-malus page:
- bonus-malus system applied from 2019
- bonus factor improved from 0.90 to 0.85 from 01.01.2023
- risk class logic and coefficient approach are correctly represented

Where used:
- cba/cba-baseline.js
- cba/cba-ai.js
- Luxembourg Workplace Safety Incident Costs.md

### 3.3 MDE reimbursement mechanics are aligned (80% / 100% exceptions)
Confirmed from MDE affiliation page:
- standard reimbursement 80%
- specific cases at 100%
- continuation period up to end of month containing day 77 over 18-month reference

Where used:
- cba/cba-baseline.js
- cba/cba-ai.js
- Luxembourg Workplace Safety Incident Costs.md

### 3.4 MDE contribution rates table (2025/2026) is aligned
Confirmed from MDE financing page:
- 2025: class 1 = 0.07%, class 2 = 0.99%
- 2026 rates published (0.23%, 0.95%, 1.56%, 2.66% across 4 classes)

---

## 4) Deviations and Risks (Priority Ordered)

## CRITICAL

### 4.1 MDE classing logic is misapplied to occupational accidents
**Issue:** The research and CBA logic assume accident frequency pushes MDE class from 1 to 2 and adds +0.92% payroll overhead.

**Why this is problematic:** On MDE financing rules, financial absenteeism excludes:
- incapacity due to occupational accident,
- incapacity due to occupational disease.

Therefore, treating workplace accidents as direct MDE class-upgrade drivers can materially overstate recurring insurance impact.

**Where it appears:**
- Luxembourg Workplace Safety Incident Costs.md
  - line 171 (claiming accidents inevitably drive MDE class jump)
  - line 255 (scenario row "Future MDE Premium Hike")
- cba/cba-baseline.js
  - line 107 (note tying insurance impact to MDE +0.92)
  - line 112 (severity 3 notes/source includes MDE class 1->2 upgrade)
- cba/cba-ai.js
  - line 168 (framework prompt states MDE class 1->2 from serious accident)
  - line 227 and line 262 (benefit logic explicitly monetizes this assumption)
  - line 358 and line 381 (baseline refresh prompt repeats same assumption)

**Recommended fix:**
1. Remove direct accident->MDE class upgrade statements from baseline and AI prompts.
2. Reframe MDE effects as:
   - 80% reimbursement / 20% deadweight in short term,
   - class effects only where truly relevant to included absenteeism categories.
3. Recompute severity-level insurance benefit factors after this correction.

---

## HIGH

### 4.2 Currency handling can mislead outputs
**Issue:** UI allows changing currency display while Luxembourg prompts enforce EUR and baseline values are EUR anchors.

**Risk:** User can see "$" or another symbol for values still computed as EUR, creating false comparability.

**Where:**
- cba/cba-ui.js line 618 (currency dropdown still active)
- cba/cba-ui.js line 622 (changes s.location.currency only)
- cba/cba-ai.js line 162 and line 341 (prompts enforce EUR)

**Recommended fix:**
- If Luxembourg-only mode is intended, lock currency to EUR in analyze screen too.
- Or add explicit conversion layer + timestamped FX source before allowing non-EUR display.

### 4.3 AI schema example has duplicate JSON key
**Issue:** `insurance` appears twice in `benefitBreakdowns` schema example.

**Risk:** Confuses model outputs and increases malformed/overwritten key risk.

**Where:**
- cba/cba-ai.js line 227
- cba/cba-ai.js line 228

**Recommended fix:**
- Keep only one `insurance` key definition.

---

## MEDIUM

### 4.4 Baseline incident-rate citation mismatch at severity 3
**Issue:** severity 3 value is `1.00` cases/100 FTE/yr but source text cites `13,724 / 501,285` which equals ~2.74/100.

**Interpretation:** This can be valid only if 1.00 is a severity-slice allocation, but source text currently reads like total rate evidence.

**Where:**
- cba/cba-baseline.js line 49 and line 55

**Recommended fix:**
- Clarify that 1.00 is allocated share, and add allocation methodology (or confidence range).

### 4.5 Terminology debt: USD field names with EUR values
**Issue:** keys `medicalCostUSD` and `regulatoryFineUSD` hold EUR values.

**Risk:** Future developer confusion and integration mistakes.

**Where:**
- cba/cba-baseline.js line 79 and line 124
- cba/cba-ai.js baseline schema section uses same key names

**Recommended fix:**
- Introduce normalized names (e.g., `medicalCostPerCase`, `regulatoryFinePerViolation`) with backward-compat aliasing.

### 4.6 Residual US references in Luxembourg prompts
**Issue:** Prompt rationale text still references OSHA in a few places.

**Where:**
- cba/cba-ai.js line 207
- cba/cba-ai.js line 239
- cba/cba-ai.js line 321 (comment)

**Recommended fix:**
- Replace with AAA/ITM/MDE/STATEC references only.

---

## 5) Research File Quality/Governance Gaps

### 5.1 Source quality is mixed (primary + weak secondary)
The paper includes strong primary references but also weak/non-authoritative entries (blogs, glossaries, aggregator-like pages).

Examples:
- line 324 (WaryMe)
- line 327 (ABAC Interim blog)
- line 330 and line 351 (Salary.lu glossary)
- line 349 (ftp.bills.com.au)

**Recommendation:**
- Rebuild quantitative sections using a strict source hierarchy:
  1) Luxembourg public institutions (AAA, MDE, ITM, CCSS, CNS, STATEC, Legilux)
  2) EU/ILO/ISSA primary studies
  3) professional commentary only as non-numeric context

### 5.2 Legal citation quality issue
A key sanctions reference points to Legifrance (French code website), not Luxembourg legal text repository.

- line 359 (Legifrance link)

**Recommendation:**
- Replace with Luxembourg legal source (Legilux / official Luxembourg labour code reference).

### 5.3 Data freshness labeling
The table labels 2026 as "Projected" although MDE 2026 rates are already published on the MDE site.

- line 165-169

**Recommendation:**
- Rename to "Published" for 2026 rates and add publication date.

---

## 6) Practical Improvement Backlog

### Immediate (must do)
1. Remove MDE class-upgrade-from-accident logic from prompts and baseline assumptions.
2. Correct insurance benefit/cost formulas and rationales accordingly.
3. Remove duplicate `insurance` JSON schema key in AI prompt.

### Short term
4. Lock currency to EUR in Luxembourg mode (or implement explicit FX conversion).
5. Clarify incident-rate allocation methodology across severity bands.
6. Rename misleading `*USD` keys to currency-neutral names.

### Research governance
7. Replace weak references with official Luxembourg primary sources.
8. Add confidence tags per major metric:
   - High confidence (official statistics)
   - Medium (derived calculation)
   - Low (scenario assumption)

---

## 7) Suggested Revised Modeling Principle
For Luxembourg mode:
- Keep AAA bonus-malus as the main insurance rate-volatility channel.
- Keep MDE at reimbursement/deadweight channel unless class effect is justified by included absenteeism categories under official MDE rules.
- Treat catastrophic litigation/fine risk as scenario-based probabilistic layer, not deterministic fixed annual uplift.

---

## 8) Final Assessment
- **Strength:** Luxembourg localization is substantially better than generic OSHA/BLS anchoring.
- **Main blocker to market realism:** MDE classing causality attached to occupational accidents.
- **Confidence after correction:** High for directional and comparative decisions; medium for absolute euro forecasts unless you add payroll/sector inputs and probability distributions.

---

## 9) Appendix A — Metric Definitions

### 9.1 `cases/100 FTE/yr`
Definition:
- Annual incident rate normalized to 100 full-time-equivalent workers.

Formula:
- `rate = (number of cases in a year / exposed FTE) x 100`

Reverse formula (to estimate expected cases):
- `expected cases = (rate / 100) x FTE`

### 9.2 What `0.90 cases/100 FTE/yr` means
- It means **0.90 incidents per year for every 100 FTE** in that severity bucket.
- Equivalent probability view: **0.009 cases per FTE-year**.

Worked examples:
- At 100 FTE: `0.90/100 x 100 = 0.90` expected cases/year.
- At 250 FTE: `0.90/100 x 250 = 2.25` expected cases/year.
- At 1,000 FTE: `0.90/100 x 1000 = 9.0` expected cases/year.

Model interpretation note:
- In this CBA baseline, the `0.90` value is used as a **severity-band allocation anchor** (minor/short-absence cases), not as a direct whole-population headline rate by itself.

### 9.3 `FTE`
- Full-Time Equivalent worker-year. Example: 2 people at 50% time each = 1.0 FTE.

### 9.4 `DAFW`
- Days Away From Work (lost workday cases where the employee misses at least one working day).

---

## 10) Appendix B — Abbreviations

- `AAA`: Association d'Assurance Accident (Luxembourg accident insurance)
- `ALARP`: As Low As Reasonably Practicable
- `BCR`: Benefit-Cost Ratio
- `CCSS`: Centre commun de la sécurité sociale
- `CNS`: Caisse nationale de santé
- `DAFW`: Days Away From Work
- `DF`: Disproportion Factor
- `ESG`: Environmental, Social, and Governance
- `FTE`: Full-Time Equivalent
- `ITM`: Inspection du Travail et des Mines
- `ISSA`: International Social Security Association
- `MDE`: Mutualité des Employeurs
- `OSH`: Occupational Safety and Health
- `ROP`: Return on Prevention
- `STATEC`: Institut national de la statistique et des études économiques du Luxembourg

---

## 11) Link Status Note
- The ISSA website is currently returning a maintenance/503 page. Use backup sources for continuity until ISSA is back online.
