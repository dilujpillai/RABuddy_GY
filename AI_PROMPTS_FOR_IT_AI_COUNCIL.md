## AI Prompts — Risk Assessment Buddy (for IT AI Council)

Purpose: Organized by workflow/modal, listing exact AI prompts used by the application for IT AI council review.

---

## 1. MAIN TASK BREAKDOWN WORKFLOW

### 1.1 Task breakdown / process analysis (`breakdownPrompt` – Index.HTML)

**Workflow:** User enters free-form work process description (text OR image descriptions) → AI analyzes and populates main risk assessment table

**Applies to:** Free text entry AND image/photo hazard descriptions (same prompt template, handles both)

Exact prompt copied from `Index.HTML`:

```text
You are a world-class safety and risk assessment expert. Your task is to analyze the user's description of a work process and break it down into a structured JSON array for a detailed risk assessment table. You must be thorough.
**Your Knowledge Base (Use these exact values for matching):**
- Hazard List Registry: ${JSON.stringify(Object.keys(HAZARD_REGISTRY))}
- Consequence Registry: ${JSON.stringify(CONSEQUENCE_REGISTRY)}
- Frequency Scale: ${JSON.stringify(FREQUENCY_SCALE)}
- Severity Scale: ${JSON.stringify(SEVERITY_SCALE)}
- Likelihood Scale: ${JSON.stringify(LIKELIHOOD_SCALE)}
- Countermeasure Ladder: ["Level 1 - Individual Target", "Level 2 - Administrative Controls", "Level 3 - Visual Controls", "Level 4 - Engineering Controls", "Level 5 - Substitution", "Level 6 - Elimination"]
**User's Input:** "${userInput}"
**Your Instructions (Critical: Follow these for EACH task/step you identify):**
1. **Identify the Step:** Clearly state the task or sub-task in the "Steps" field.
2. **Comprehensive Hazard Identification (Most Important Rule):**
   * For each step, identify ALL plausible direct, indirect, and hidden hazards.
   * For EACH identified hazard, create a separate JSON object. The same "Steps" value will appear in multiple objects if a step has multiple hazards.
3. **Match Hazard:** Select the single most appropriate "Hazard List" item from the Registry.
4. **Match Consequence:** Select the single most appropriate "Risk/Consequences" item from the Registry.
5. **Infer Details:** Infer "Hazard Source," suggest "Current Control," and classify "Routine/Non-Routine/Emergency Situation".
6. **Countermeasure Ladder Classification:** Based on the "Current Control" you suggest, classify it into one or more Countermeasure Ladder levels. Use EXACT values from the list. Examples: PPE = "Level 1 - Individual Target", Training/SOP = "Level 2 - Administrative Controls", Signs/Mirrors/Markings = "Level 3 - Visual Controls", Guards/Barriers/Interlocks = "Level 4 - Engineering Controls", Safer alternatives = "Level 5 - Substitution", Remove hazard = "Level 6 - Elimination". Output as comma-separated if multiple apply.
7. **Select F, S, L Values:** Select the most appropriate NUMERIC value for "Frequency," "Severity," and "Likelihood" from the scales.
8. **Consider Past Incidents:** If the user's input mentions previous incidents, near misses, or accidents related to a specific step or hazard, you MUST increase the 'Likelihood' score for that specific hazard object accordingly (e.g., move from 5 'Possible' to 8 'Likely' or from 8 'Likely' to 10 'Very likely') to reflect the known history. Clearly state in the "Hazard Source" if a past incident influenced the score.
9. **Link Image ID:** The user's input may contain (ImageID: xxx). If you see this, you MUST add this exact ID to your JSON object for that step using the key "imageId". If no ID is provided for a step, output imageId: null.
**Final Output:** Your response MUST ONLY be a valid JSON array of objects. Do not include any text outside the JSON. Each object MUST have these keys: "Steps", "Hazard List", "Risk/Consequences", "Hazard Source", "Current Control", "Countermeasure_Ladder", "Routine/Non-Routine/Emergency Situation", "Frequency", "Severity", "Likelihood".
```

---

## 2. GOEHS INTEGRATION MODAL

### 2.1 Task categorization (`aiAssistTaskFields` – Index.HTML)

**Workflow:** GOEHS Integration Modal → Tab 2 (Tasks) → [🤖 AI Assist] button

Exact prompt copied from `Index.HTML`:

```text
You are a workplace safety expert helping categorize industrial tasks.

Given the following task names from a Risk Assessment, match each task to the MOST appropriate Core Activity and Job Title from the provided lists.

CORE_ACTIVITIES (choose exactly one per task):
${CORE_ACTIVITIES.join(', ')}

JOB_TITLES (choose exactly one per task):
${JOB_TITLES.join(', ')}

TASKS TO CATEGORIZE:
${taskData.map((t, i) => `${i + 1}. "${t.taskName}"`).join('\n')}

IMPORTANT RULES:
1. ONLY use values from the exact lists provided above - do not invent new values
2. Match based on the task description's keywords and context
3. If unsure, pick the most generic applicable option

Return ONLY a valid JSON array with this exact structure (no explanation, no markdown):
[
  {"taskIndex": 0, "coreActivity": "exact value from list", "jobTitle": "exact value from list"},
  ...
]
```

### 2.2 Control classification (`aiAssistHazardFields` – Index.HTML)

**Workflow:** GOEHS Integration Modal → Tab 3 (Hazards) → [🤖 AI Assist] button

Exact prompt copied from `Index.HTML`:

```text
You are a workplace safety expert classifying control measures using the Hierarchy of Controls.

COUNTERMEASURE LADDER LEVELS (from most to least effective):
- "Level 6 - Elimination" - Completely removing the hazard (discontinue, get rid of, stop using)
- "Level 5 - Substitution" - Replacing with something safer (alternative material, less hazardous)
- "Level 4 - Engineering Controls" - Physical changes (guards, barriers, interlocks, ventilation, automation)
- "Level 3 - Visual Controls" - Visual warnings (signs, labels, floor markings, mirrors, lights, beacons)
- "Level 2 - Administrative Controls" - Procedures (training, SOPs, permits, inspections, schedules, supervision)
- "Level 1 - Individual Target" - PPE (gloves, goggles, helmets, respirators, safety shoes, harnesses)

CONTROL DESCRIPTIONS TO CLASSIFY:
${controlData.map((c, i) => {
    let text = `${i + 1}. `;
    if (c.counterDesc) text += `Current Control: "${c.counterDesc}"`;
    if (c.predDesc) text += ` | Predicted Control: "${c.predDesc}"`;
    return text;   
}).join('\n')}

IMPORTANT RULES:
1. A control can match MULTIPLE levels (e.g., "guard with warning sign" = Level 4 + Level 3)
2. Use the exact level names from the list above
3. Analyze keywords carefully - mirrors, reflectors = Visual Controls; guards, barriers = Engineering Controls

Return ONLY a valid JSON array with this exact structure (no explanation, no markdown):
[
  {"index": 0, "currentLevels": ["Level X - Name", "Level Y - Name"], "predictedLevels": ["Level Z - Name"]},
  ...
]
```

---

## 3. RECOMMENDATIONS WORKFLOW

### 3.1 Batch recommendation prompt (`generateRecommendations` – Index.HTML)

**Workflow:** User clicks [Generate AI Recommendations & Visuals] → AI analyzes all hazards → generates improvement recommendations

Exact prompt copied from `Index.HTML` (batch processing):

```text
Analyze these high-risk tasks. For each, provide a concise, actionable recommendation.
Then, estimate the new Frequency, Severity, and Likelihood values if the recommendation is implemented.
Format your response ONLY as a JSON array of objects. Each object must have these exact keys:
"step": "exact step name from input",
"hazard": "exact hazard from input",
"recommendation": "Your full recommendation text",
"newFrequency": new_frequency_number,
"newSeverity": new_severity_number,
"newLikelihood": new_likelihood_number

Tasks: ${JSON.stringify(batch.map(r => ({step: r.Steps, hazard: r['Hazard List'], Frequency: r.Frequency, Severity: r.Severity, Likelihood: r.Likelihood})), null, 2)}
```

---

## 4. SUPPORTING WORKFLOWS

### 4.1 Free Text Analysis (freeTextPrompt – IT_SECURITY_REVIEW_PREPARATION.md)

**Workflow:** Alternative entry point for field notes analysis (not currently in Index.HTML main flow)

Exact prompt (as documented in IT_SECURITY_REVIEW_PREPARATION.md):

```text
You are an expert occupational health and safety professional conducting a risk assessment.

Analyze the following field observations and generate a structured risk assessment table.

FIELD OBSERVATIONS:
"""
${sanitizedUserNotes}
"""

For each hazard identified, provide:
1. Task/Activity - What work activity is being performed
2. Hazard Description - Specific hazard identified
3. Potential Consequence - What could happen if the hazard causes an incident
4. Current Controls - Safety measures already in place (from the notes)
5. Severity (1-10) - Potential severity if incident occurs
   - 1-3: Minor (first aid, minor discomfort)
   - 4-6: Moderate (medical treatment, temporary disability)
   - 7-9: Serious (hospitalization, permanent disability)
   - 10: Catastrophic (fatality, multiple fatalities)
6. Likelihood (1-10) - Probability of incident occurring
   - 1-3: Unlikely (rare circumstances)
   - 4-6: Possible (could occur)
   - 7-9: Likely (expected to occur)
   - 10: Almost certain
7. Frequency (1-10) - How often the task is performed
   - 1-3: Rare (yearly or less)
   - 4-6: Occasional (monthly/weekly)
   - 7-9: Frequent (daily)
   - 10: Continuous
8. Recommended Controls - Additional safety measures to implement
9. Control Hierarchy - Classify recommended controls:
   - Elimination, Substitution, Engineering, Visual, Administrative, PPE

Respond in JSON format:
{
  "assessmentTitle": "Generated title based on location/activity",
  "hazards": [
    {
      "taskActivity": "...",
      "hazardDescription": "...",
      "potentialConsequence": "...",
      "currentControls": "...",
      "severity": 7,
      "likelihood": 5,
      "frequency": 8,
      "riskScore": 280,
      "recommendedControls": "...",
      "controlHierarchy": ["Engineering", "Administrative", "PPE"]
    }
  ]
}

Rules:
1. Identify ALL hazards mentioned or implied in the notes
2. Be specific - don't use generic descriptions
3. Risk Score = Severity × Likelihood × Frequency
4. If information is missing, make reasonable assumptions based on industry standards
5. Return valid JSON only, no explanation text
```

### 4.2 Task Batch AI Assist (taskPrompt – IT_SECURITY_REVIEW_PREPARATION.md)

**Workflow:** Documented for future use; not actively in Index.HTML

Exact prompt (as documented):

```text
You are an expert occupational health and safety classifier.

Given the following task names from a risk assessment, suggest the most appropriate 
Core Activity and Job Title for each task.

TASK NAMES:
${taskNames.map((name, i) => `${i + 1}. "${name}"`).join('\n')}

AVAILABLE CORE ACTIVITIES (you MUST choose from this list only):
- Equipment Operation
- Material Handling
- Maintenance
- Assembly
- Quality Control
- Cleaning
- Administrative Work
- Electrical Work
- Welding/Hot Work
- Confined Space Entry
- Working at Heights
- Chemical Handling
- Warehousing
- Transportation
- Construction

AVAILABLE JOB TITLES (you MUST choose from this list only):
- Forklift Operator
- Machine Operator
- Maintenance Technician
- Assembly Worker
- Quality Inspector
- Warehouse Technician
- Electrical Technician
- Welder
- Safety Officer
- Production Supervisor
- General Laborer
- Chemical Handler
- Crane Operator
- Truck Driver
- Cleaner

Respond in JSON format only:
[
  {"taskIndex": 0, "coreActivity": "Equipment Operation", "jobTitle": "Forklift Operator"},
  {"taskIndex": 1, "coreActivity": "Material Handling", "jobTitle": "Warehouse Technician"}
]

Rules:
1. Use ONLY values from the provided lists
2. If unsure, pick the closest match
3. Return valid JSON only, no explanation
```

### 4.3 Hazard Batch AI Assist (hazardPrompt – IT_SECURITY_REVIEW_PREPARATION.md)

**Workflow:** Documented for future use; not actively in Index.HTML

Exact prompt (as documented):

```text
You are an expert occupational health and safety classifier specializing in the Hierarchy of Controls.

Analyze the following control measures and classify them according to the Countermeasure Ladder levels.

CONTROL MEASURES TO ANALYZE:
${hazards.map((h, i) => `\nHazard ${i + 1}:\n- Current Control: "${h.currentControl}"\n- Predicted Control: "${h.predictedControl || 'None specified'}"\n`).join('\n')}

COUNTERMEASURE LADDER LEVELS (use EXACT values):
- "Level 6 - Elimination" = Completely removing the hazard (e.g., removing the chemical, eliminating the task)
- "Level 5 - Substitution" = Replacing with something less hazardous (e.g., using water-based instead of solvent-based)
- "Level 4 - Engineering Controls" = Physical changes to isolate people from hazard (e.g., guards, ventilation, barriers, interlocks)
- "Level 3 - Visual Controls" = Visual warnings and indicators (e.g., signs, labels, floor markings, warning lights)
- "Level 2 - Administrative Controls" = Procedures and training (e.g., SOPs, permits, job rotation, training programs)
- "Level 1 - Individual Target (PPE)" = Personal protective equipment (e.g., gloves, helmets, safety glasses, respirators)

Respond in JSON format only:
[
  {
    "index": 0,
    "currentLevels": ["Level 4 - Engineering Controls", "Level 1 - Individual Target (PPE)"],
    "predictedLevels": ["Level 6 - Elimination"]
  }
]

Rules:
1. Use EXACT level names as shown above (case-sensitive)
2. A single control description may include multiple levels
3. Return empty array [] if no controls match
4. Return valid JSON only, no explanation
5. "PPE", "gloves", "helmet" = Level 1
6. "training", "SOP" = Level 2
7. "sign", "label" = Level 3
8. "guard", "barrier", "ventilation" = Level 4
9. "substitute", "replace" = Level 5
10. "eliminate", "remove hazard" = Level 6
```

---

## Notes for the Council

### Batch Processing Architecture

**Why Batch Processing Matters:**

1. **Token Limit Management:** Large user inputs (text + images) can exceed AI model context limits. The system splits long inputs into ~1200-character batches before sending to OpenRouter/Azure OpenAI, ensuring each batch stays within safe token ranges.

2. **Concurrency Control:** Multiple batches are processed with a concurrency limit (prevents overwhelming the API and exceeds rate limits). Batches are queued and executed sequentially with monitoring.

3. **Resilience & Error Handling:** If one batch fails, the system:
   - Logs the failure with batch number
   - Continues processing remaining batches
   - Merges successful results
   - Reports partial success (e.g., "Batch 1–3 succeeded; Batch 4 failed")

4. **Cost Optimization:** Batch processing reduces API calls and token usage by:
   - Breaking down large tasks into smaller, more efficient chunks
   - Avoiding redundant analysis
   - Consolidating results server-side

5. **AI Accuracy:** Smaller, focused prompts often yield more accurate results than overwhelming the model with massive inputs. Each batch is self-contained with full context.

---

## Actual Batch Processing Code (Index.HTML)

### Main Workflow Batch Splitting Rule ([Index.HTML Lines 3619-3621](Index.HTML#L3619-L3621))

**Comment from source code:**
```
// Split large input into batches to avoid losing data
// Batch strategy: split on sentence boundaries (~1200 chars per batch for efficiency)
const batches = splitTextIntoBatches(userInput, 1200);
```

**Implementation of `splitTextIntoBatches()` function ([Index.HTML Lines 3799-3824](Index.HTML#L3799-L3824)):**

```javascript
function splitTextIntoBatches(text, maxBatchSize = 500) {
    const batches = [];
    let currentBatch = '';
    
    // Split by sentence boundaries (period, question mark, exclamation mark)
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (let sentence of sentences) {
        // If adding this sentence would exceed limit, start a new batch
        if ((currentBatch + ' ' + sentence).length > maxBatchSize && currentBatch.length > 0) {
            batches.push(currentBatch.trim());
            currentBatch = sentence;
        } else {
            currentBatch += (currentBatch ? ' ' : '') + sentence;
        }
    }
    
    // Add any remaining text
    if (currentBatch.trim()) {
        batches.push(currentBatch.trim());
    }
    
    return batches.length > 0 ? batches : [text]; // Return at least the original text
}
```

**Key Rule:** Text is split on sentence boundaries (`.`, `!`, `?`) to ensure no partial sentences. Each batch size limit is 1200 characters.

---

### Concurrency Control Rule ([Index.HTML Lines 3695-3713](Index.HTML#L3695-L3713))

**Concurrency limit constant:**
```javascript
// Process batches in parallel with concurrency limit (3 at a time)
const concurrencyLimit = 3;
const batchPromises = batches.map((batchText, index) => 
    processBatchSafely(batchText, index)
);

// Execute with concurrency limit
const results = await executeWithConcurrencyLimit(batchPromises, concurrencyLimit);
```

**Implementation of `executeWithConcurrencyLimit()` ([Index.HTML Lines 3787-3802](Index.HTML#L3787-L3802)):**

```javascript
async function executeWithConcurrencyLimit(promises, limit) {
    const results = [];
    const executing = [];
    
    for (const promise of promises) {
        const p = promise.then(result => {
            executing.splice(executing.indexOf(p), 1);
            return result;
        });
        results.push(p);
        executing.push(p);
        
        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }
    
    return Promise.all(results);
}
```

**Key Rule:** Maximum 3 batches process in parallel at any time. This prevents API rate limits and resource exhaustion.

---

### Recommendations Workflow Batch Size Rule ([Index.HTML Lines 4512-4524](Index.HTML#L4512-L4524))

**Batch size constant for recommendations:**
```javascript
// 5. --- BATCHING LOGIC (Process 'risksToSendToAI') ---
// Batch size of 2 for more detailed AI analysis (smaller batches = deeper focus per group)
const BATCH_SIZE = 2; 
const allBatches = chunkArray(risksToSendToAI.map(r => r.row), BATCH_SIZE);
```

**Key Rule:** Recommendations are batched with **2 hazards per batch** (not 5 as previously documented). This allows deeper AI focus on each hazard's recommendations.

**Loop processing batches:**
```javascript
for (let i = 0; i < allBatches.length; i++) {
    const batch = allBatches[i];
    const batchNumber = i + 1;
    recommendationsDiv.innerHTML = `<p class="text-slate-500 italic">🤖 Generating recommendations... (Batch ${batchNumber} of ${allBatches.length})</p>`;
    
    const prompt = `
        Analyze these high-risk tasks. For each, provide a concise, actionable recommendation.
        Then, estimate the new Frequency, Severity, and Likelihood values if the recommendation is implemented.
        Format your response ONLY as a JSON array of objects...
        
        Tasks: ${JSON.stringify(batch.map(r => ({step: r.Steps, hazard: r['Hazard List'], Frequency: r.Frequency, Severity: r.Severity, Likelihood: r.Likelihood})), null, 2)}
    `;

    try {
        const paidResponse = await callAPI(PAID_MODEL, prompt);
        const parsedBatchRecs = parseAndCleanData(paidResponse);
        allRecommendations.push(...parsedBatchRecs); 
    } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);
        failedBatches.push(batchNumber);
    }
}
```

**Key Rule:** Each batch sends 2 hazards with their current F/S/L values. AI returns recommendation + new F/S/L estimates. Failed batches are logged and skipped; successful results are merged.

---

**Batch Processing Implementation (Main Workflow):**
- User enters large description (500–5000 chars) → System detects batch need
- Splits on sentence boundaries into batches (~1200 chars each)
- Calls `breakdownPrompt` for **each batch** with concurrency limit of 3
- Consolidates JSON arrays from all batches
- Populates single table with merged results

**Batch Processing Implementation (Recommendations Workflow):**
- User clicks "Generate AI Recommendations & Visuals"
- System groups hazards into batches of **2 hazards per batch**
- Calls `generateRecommendations` prompt for **each batch**
- Merges recommendations and new F/S/L scores
- Updates table with improvement estimates

---

### Other Notes

- All prompts are built from sanitized user inputs (DOMPurify) before being embedded into the template.
- Current pilot environment uses OpenRouter (`openai/gpt-4o-mini`) via Vercel; future Phase 2 will use Azure OpenAI (enterprise DPA) with the same prompt templates.
- Prompts intentionally request JSON-only outputs and include whitelist/registry adherence rules to reduce hallucination risk.

If you want, I can: add line references to source files, export this as a PDF, or include a short risk/security checklist for each prompt.
