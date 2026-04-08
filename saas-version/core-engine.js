// ============================================================================
// EHS SMART - SAAS CORE ENGINE
// Version: 1.0.0 (Independent SaaS - No Goodyear IP)
// ============================================================================
// This module contains the core risk assessment logic for the SaaS version.
// It uses the HSE UK hazard registry (not Goodyear GOEHS) for compliance.
// ============================================================================

'use strict';

// ============================================================================
// CORE CONFIGURATION
// ============================================================================
const SAAS_CONFIG = {
    VERSION: '1.0.0',
    API_ENDPOINT: 'https://risk-assessment-api-nine.vercel.app/api/ai',
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'fr', 'ar'],
    MAX_BATCH_SIZE: 500,
    MAX_IMAGES_PER_BATCH: 5
};

// ============================================================================
// RISK SCORING SCALES (HSE UK Standard 5x5 Matrix)
// ============================================================================
const FREQUENCY_SCALE = {
    1: "Routine (Daily)",
    1.25: "Frequent (Weekly)",
    1.5: "Occasional (Monthly)", 
    1.75: "Infrequent (Yearly)",
    2: "Rare (Exceptional)"
};

const SEVERITY_SCALE = {
    1: "Negligible - No injury",
    2: "Minor - First aid only",
    4: "Moderate - Medical treatment",
    6: "Major - Serious injury",
    8: "Severe - Permanent disability",
    10: "Catastrophic - Fatality"
};

const LIKELIHOOD_SCALE = {
    1: "Rare - Exceptional circumstances",
    2: "Unlikely - Could occur sometime",
    4: "Possible - Might occur",
    6: "Likely - Probably will occur",
    8: "Almost Certain - Expected to occur",
    10: "Certain - Will occur"
};

// ============================================================================
// RISK CATEGORY THRESHOLDS (Based on F x S x L)
// ============================================================================
const RISK_CATEGORIES = {
    LOW: { max: 20, color: '#22c55e', bgColor: '#dcfce7', label: 'Low Risk' },
    MEDIUM: { max: 50, color: '#eab308', bgColor: '#fef9c3', label: 'Medium Risk' },
    HIGH: { max: 100, color: '#f97316', bgColor: '#ffedd5', label: 'High Risk' },
    CRITICAL: { max: Infinity, color: '#dc2626', bgColor: '#fee2e2', label: 'Critical Risk' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate risk score using F x S x L formula
 */
function calculateRiskScore(frequency, severity, likelihood) {
    return parseFloat(frequency) * parseFloat(severity) * parseFloat(likelihood);
}

/**
 * Get risk category based on score
 */
function getRiskCategory(score) {
    if (score <= RISK_CATEGORIES.LOW.max) return 'Low Risk';
    if (score <= RISK_CATEGORIES.MEDIUM.max) return 'Medium Risk';
    if (score <= RISK_CATEGORIES.HIGH.max) return 'High Risk';
    return 'Critical Risk';
}

/**
 * Get risk color based on score
 */
function getRiskColor(score) {
    if (score <= RISK_CATEGORIES.LOW.max) return RISK_CATEGORIES.LOW;
    if (score <= RISK_CATEGORIES.MEDIUM.max) return RISK_CATEGORIES.MEDIUM;
    if (score <= RISK_CATEGORIES.HIGH.max) return RISK_CATEGORIES.HIGH;
    return RISK_CATEGORIES.CRITICAL;
}

/**
 * Get translation for a key
 */
function t(key, lang = null) {
    const currentLang = lang || window.currentLanguage || SAAS_CONFIG.DEFAULT_LANGUAGE;
    
    // Check if HSE_HAZARD_REGISTRY exists and has translations
    if (typeof HSE_HAZARD_REGISTRY !== 'undefined' && HSE_HAZARD_REGISTRY.translations) {
        // Check categories
        if (HSE_HAZARD_REGISTRY.translations.categories[key]) {
            return HSE_HAZARD_REGISTRY.translations.categories[key][currentLang] || key;
        }
        // Check hazards
        if (HSE_HAZARD_REGISTRY.translations.hazards[key]) {
            return HSE_HAZARD_REGISTRY.translations.hazards[key][currentLang] || key;
        }
        // Check UI labels
        if (HSE_HAZARD_REGISTRY.translations.ui[key]) {
            return HSE_HAZARD_REGISTRY.translations.ui[key][currentLang] || key;
        }
    }
    return key;
}

/**
 * Get hazard category details from registry
 */
function getHazardCategory(categoryId) {
    if (typeof HSE_HAZARD_REGISTRY === 'undefined') return null;
    return HSE_HAZARD_REGISTRY.hazardCategories.find(c => c.id === categoryId);
}

/**
 * Get hazards for a category
 */
function getHazardsForCategory(categoryId) {
    if (typeof HSE_HAZARD_REGISTRY === 'undefined') return [];
    return HSE_HAZARD_REGISTRY.hazards[categoryId] || [];
}

/**
 * Get control measures for a category
 */
function getControlMeasures(categoryId) {
    if (typeof HSE_HAZARD_REGISTRY === 'undefined') return [];
    return HSE_HAZARD_REGISTRY.controlMeasures[categoryId] || [];
}

/**
 * Get industry preset categories
 */
function getIndustryPreset(industryKey) {
    if (typeof HSE_HAZARD_REGISTRY === 'undefined') return [];
    return HSE_HAZARD_REGISTRY.industryPresets[industryKey] || [];
}

// ============================================================================
// API COMMUNICATION
// ============================================================================

/**
 * Call the AI API for risk assessment
 */
async function callAPI(model, prompt) {
    const response = await fetch(SAAS_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            prompt: prompt
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('API response was empty or invalid.');
    }
    return data.choices[0].message.content;
}

/**
 * Parse and clean AI JSON response
 */
function parseAndCleanData(rawJson) {
    try {
        const startIndex = rawJson.indexOf('[');
        const endIndex = rawJson.lastIndexOf(']');
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error("Valid JSON array boundaries not found in the AI response.");
        }
        const jsonString = rawJson.substring(startIndex, endIndex + 1);
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error("AI response was in an invalid format.");
    }
}

/**
 * Split text into batches for processing
 */
function splitTextIntoBatches(text, maxBatchSize = SAAS_CONFIG.MAX_BATCH_SIZE) {
    const batches = [];
    let currentBatch = '';
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (let sentence of sentences) {
        if ((currentBatch + ' ' + sentence).length > maxBatchSize && currentBatch.length > 0) {
            batches.push(currentBatch.trim());
            currentBatch = sentence;
        } else {
            currentBatch += (currentBatch ? ' ' : '') + sentence;
        }
    }

    if (currentBatch.trim()) {
        batches.push(currentBatch.trim());
    }

    return batches.length > 0 ? batches : [text];
}

// ============================================================================
// PROMPT GENERATION (SaaS Version - No Goodyear References)
// ============================================================================

/**
 * Generate AI prompt for risk assessment (Generic/HSE UK based)
 */
function generateRiskAssessmentPrompt(description, industry = null) {
    // Get relevant hazard categories based on industry
    let relevantCategories = [];
    if (industry && typeof HSE_HAZARD_REGISTRY !== 'undefined') {
        const preset = getIndustryPreset(industry);
        relevantCategories = preset.map(catId => {
            const cat = getHazardCategory(catId);
            return cat ? cat.name : catId;
        });
    }

    const categoryHint = relevantCategories.length > 0
        ? `\nRelevant hazard categories for this industry: ${relevantCategories.join(', ')}`
        : '';

    return `You are an expert EHS (Environment, Health & Safety) professional conducting a risk assessment.

Analyze the following work activity description and identify ALL potential hazards:

"""
${description}
"""
${categoryHint}

For EACH identified hazard, provide a JSON array with the following structure:
[
  {
    "Steps": "Brief description of the task/activity step",
    "Hazard Group": "Category from HSE UK standards (e.g., Slips/Trips, Manual Handling, Working at Height, Machinery, Electrical, Fire, Chemical, Noise, etc.)",
    "Hazard List": "Specific hazard identified",
    "Risk/Consequences": "Potential injury or harm (e.g., Fractures, Burns, Cuts, Crush injuries, Hearing loss, etc.)",
    "Frequency": "1 for daily, 1.25 for weekly, 1.5 for monthly, 1.75 for yearly, 2 for rare",
    "Severity": "1-10 scale (1=negligible, 2=minor, 4=moderate, 6=major, 8=severe, 10=catastrophic)",
    "Likelihood": "1-10 scale (1=rare, 2=unlikely, 4=possible, 6=likely, 8=almost certain, 10=certain)",
    "Hazard Source": "Source or cause of the hazard",
    "Current Control": "Existing control measures if mentioned, otherwise leave blank",
    "Routine/Non-Routine/Emergency Situation": "Classify the activity type"
  }
]

IMPORTANT RULES:
1. Return ONLY the JSON array, no additional text
2. Identify ALL hazards, even minor ones
3. Be specific with hazard descriptions
4. Use realistic severity and likelihood values based on the scenario
5. Each hazard should be a separate object in the array
6. Reference HSE UK hazard categories where applicable`;
}

/**
 * Generate AI prompt for image analysis
 */
function generateImageAnalysisPrompt(imageDescription = null) {
    return `You are an expert EHS (Environment, Health & Safety) professional analyzing a workplace image for hazards.

${imageDescription ? `Image context: ${imageDescription}` : 'Analyze the workplace image provided.'}

Identify ALL visible hazards and potential risks. For EACH hazard found, provide a JSON array with:
[
  {
    "Steps": "Description of the activity or area shown",
    "Hazard Group": "HSE UK category (Slips/Trips, Manual Handling, Working at Height, Machinery, Electrical, Fire, Chemical, etc.)",
    "Hazard List": "Specific hazard observed",
    "Risk/Consequences": "Potential injury or harm",
    "Frequency": "1-2 scale based on how often this activity likely occurs",
    "Severity": "1-10 scale based on potential harm",
    "Likelihood": "1-10 scale based on probability",
    "Hazard Source": "Source of the hazard visible in image",
    "Current Control": "Any visible safety controls (PPE, barriers, signs, etc.)",
    "Routine/Non-Routine/Emergency Situation": "Activity classification"
  }
]

Return ONLY the JSON array. Be thorough - identify all visible and potential hazards.`;
}

/**
 * Generate prompt for control measure recommendations
 */
function generateControlRecommendationPrompt(hazardData) {
    return `You are an EHS expert recommending control measures using the Hierarchy of Controls.

For this hazard:
- Activity: ${hazardData.Steps}
- Hazard: ${hazardData['Hazard List']}
- Category: ${hazardData['Hazard Group']}
- Current Risk Score: ${hazardData.riskScore}
- Consequences: ${hazardData['Risk/Consequences']}

Recommend control measures in order of effectiveness:

1. ELIMINATION - Can the hazard be completely removed?
2. SUBSTITUTION - Can something less hazardous be used?
3. ENGINEERING CONTROLS - Physical changes to isolate people from hazard?
4. ADMINISTRATIVE CONTROLS - Changes to work practices, training, procedures?
5. PPE - Personal protective equipment as last resort?

For each recommended control, estimate the new risk score after implementation.

Return as JSON:
{
  "recommendations": [
    {
      "controlType": "Elimination/Substitution/Engineering/Administrative/PPE",
      "description": "Specific control measure",
      "newFrequency": 1-2,
      "newSeverity": 1-10,
      "newLikelihood": 1-10,
      "newRiskScore": calculated score,
      "implementation": "How to implement this control"
    }
  ]
}`;
}

// ============================================================================
// TABLE BUILDING & DATA MANAGEMENT
// ============================================================================

/**
 * Build risk assessment table from AI data
 */
function buildTableFromData(data, containerId = 'table-container') {
    const tableContainer = document.getElementById(containerId);
    if (!tableContainer) {
        console.error('Table container not found:', containerId);
        return;
    }

    if (!data || data.length === 0) {
        tableContainer.innerHTML = `<p class="text-center p-8 text-slate-600 italic">
            No hazards identified. Please try a different description or upload images.
        </p>`;
        return;
    }

    // Store data globally for modal access
    window.currentAssessmentRows = data;

    const headers = [
        { name: "📷", width: "60px" },
        { name: "Steps", width: "200px" },
        { name: "Hazard Group", width: "180px" },
        { name: "Hazard List", width: "200px" },
        { name: "Risk/Consequences", width: "180px" },
        { name: "Frequency", width: "140px" },
        { name: "Severity", width: "140px" },
        { name: "Likelihood", width: "140px" },
        { name: "Risk Score", width: "100px" },
        { name: "Risk Category", width: "120px" },
        { name: "Hazard Source", width: "180px" },
        { name: "Current Control", width: "200px" },
        { name: "Activity Type", width: "160px" },
        { name: "Actions", width: "140px" }
    ];

    let tableHTML = `
        <div class="overflow-x-auto p-4">
            <table class="w-full text-sm border-collapse" style="min-width: 1900px;">
                <thead class="bg-slate-100">
                    <tr>
                        ${headers.map(h => `<th class="p-3 text-left font-semibold text-slate-700 uppercase tracking-wider text-xs border-b-2 border-slate-300" style="min-width: ${h.width}">${h.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;

    data.forEach((row, index) => {
        // Parse and validate values
        const frequency = Math.min(parseFloat(row.Frequency) || 1, 2);
        const severity = Math.min(parseFloat(row.Severity) || 1, 10);
        const likelihood = Math.min(parseFloat(row.Likelihood) || 1, 10);
        const riskScore = calculateRiskScore(frequency, severity, likelihood);
        const riskCategory = getRiskCategory(riskScore);
        const riskColor = getRiskColor(riskScore);
        
        // Get tagged images for this row
        const taggedImages = row.taggedImages || [];
        const hasImages = taggedImages.length > 0;
        const imagePreview = hasImages 
            ? `<img src="${taggedImages[0]}" class="w-10 h-10 object-cover rounded cursor-pointer" onclick="openRowDetailModal(${index})" title="View details">`
            : `<button onclick="openRowDetailModal(${index})" class="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 transition" title="Add image">+</button>`;

        tableHTML += `
            <tr data-row-index="${index}" data-tagged-images='${JSON.stringify(taggedImages)}' class="hover:bg-slate-50 transition border-b border-slate-200 cursor-pointer" ondblclick="openRowDetailModal(${index})">
                <td class="p-3 text-center" style="min-width: 60px">
                    ${imagePreview}
                    ${hasImages && taggedImages.length > 1 ? `<span class="text-xs text-slate-500 block">+${taggedImages.length - 1}</span>` : ''}
                </td>
                <td class="p-3" style="min-width: 200px">${DOMPurify.sanitize(row.Steps || '')}</td>
                <td class="p-3" style="min-width: 180px">${createHazardGroupDropdown(row['Hazard Group'] || 'Unknown', index)}</td>
                <td class="p-3" style="min-width: 200px">${createHazardListDropdown(row['Hazard Group'], row['Hazard List'], index)}</td>
                <td class="p-3" style="min-width: 180px">${createConsequenceDropdown(row['Risk/Consequences'], index)}</td>
                <td class="p-3" style="min-width: 140px">${createScaleDropdown(FREQUENCY_SCALE, frequency, index, 'frequency')}</td>
                <td class="p-3" style="min-width: 140px">${createScaleDropdown(SEVERITY_SCALE, severity, index, 'severity')}</td>
                <td class="p-3" style="min-width: 140px">${createScaleDropdown(LIKELIHOOD_SCALE, likelihood, index, 'likelihood')}</td>
                <td class="p-3 font-bold score-cell" style="min-width: 100px; color: ${riskColor.color}">${riskScore.toFixed(2)}</td>
                <td class="p-3" style="min-width: 120px">
                    <span class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style="background-color: ${riskColor.bgColor}; color: ${riskColor.color}">
                        ${riskCategory}
                    </span>
                </td>
                <td class="p-3" style="min-width: 180px"><input type="text" value="${DOMPurify.sanitize(row['Hazard Source'] || '')}" class="w-full p-2 border border-slate-300 rounded text-sm" onclick="event.stopPropagation()"></td>
                <td class="p-3" style="min-width: 200px"><input type="text" value="${DOMPurify.sanitize(row['Current Control'] || '')}" class="w-full p-2 border border-slate-300 rounded text-sm" onclick="event.stopPropagation()"></td>
                <td class="p-3" style="min-width: 160px">${createActivityTypeDropdown(row['Routine/Non-Routine/Emergency Situation'], index)}</td>
                <td class="p-3 text-center" style="min-width: 140px">
                    <div class="flex gap-1 justify-center">
                        <button onclick="event.stopPropagation(); openRowDetailModal(${index})" class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200 transition whitespace-nowrap" title="Review Details">
                            🔍 Review
                        </button>
                        <button onclick="event.stopPropagation(); openControlModal(${index})" class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 transition whitespace-nowrap" title="Add Control Measures">
                            🛡️
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    tableHTML += `</tbody></table></div>`;
    tableContainer.innerHTML = tableHTML;

    // Update statistics
    updateRiskStatistics(data);
}

/**
 * Create hazard group dropdown
 */
function createHazardGroupDropdown(selectedValue, rowIndex) {
    if (typeof HSE_HAZARD_REGISTRY === 'undefined') {
        return `<select class="w-full p-2 border border-slate-300 rounded text-sm">
            <option value="${selectedValue}">${selectedValue}</option>
        </select>`;
    }

    let options = HSE_HAZARD_REGISTRY.hazardCategories.map(cat => {
        const selected = cat.name === selectedValue || cat.id === selectedValue ? 'selected' : '';
        const translatedName = t(cat.id);
        return `<option value="${cat.id}" ${selected}>${cat.icon} ${translatedName}</option>`;
    }).join('');

    return `<select class="w-full p-2 border border-slate-300 rounded text-sm" onchange="onHazardGroupChange(${rowIndex}, this.value)">
        ${options}
    </select>`;
}

/**
 * Create hazard list dropdown based on category
 */
function createHazardListDropdown(categoryId, selectedValue, rowIndex) {
    const hazards = getHazardsForCategory(categoryId);
    
    if (hazards.length === 0) {
        return `<input type="text" value="${DOMPurify.sanitize(selectedValue || '')}" class="w-full p-2 border border-slate-300 rounded text-sm">`;
    }

    const currentLang = window.currentLanguage || 'en';
    let options = hazards.map(h => {
        // Get translated hazard name
        let displayName = h.name;
        if (typeof HSE_HAZARD_REGISTRY !== 'undefined' && HSE_HAZARD_REGISTRY.translations.hazards[h.id]) {
            displayName = HSE_HAZARD_REGISTRY.translations.hazards[h.id][currentLang] || h.name;
        }
        const selected = h.name === selectedValue || h.id === selectedValue ? 'selected' : '';
        return `<option value="${h.id}" ${selected}>${displayName}</option>`;
    }).join('');

    // Add option for custom hazard if not in list
    if (selectedValue && !hazards.find(h => h.name === selectedValue || h.id === selectedValue)) {
        options = `<option value="${selectedValue}" selected>${selectedValue}</option>` + options;
    }

    return `<select class="w-full p-2 border border-slate-300 rounded text-sm" onchange="recalculateRow(${rowIndex})">
        ${options}
    </select>`;
}

/**
 * Create consequence dropdown
 */
function createConsequenceDropdown(selectedValue, rowIndex) {
    const consequences = [
        "Fatality", "Permanent Disability", "Serious Injury", "Lost Time Injury",
        "Medical Treatment", "First Aid", "Near Miss", "Property Damage",
        "Burns", "Fractures", "Cuts/Lacerations", "Crush Injuries",
        "Hearing Loss", "Respiratory Issues", "Skin Conditions", "Eye Injury",
        "Electric Shock", "Falls", "Struck By", "Caught In/Between"
    ];

    let options = consequences.map(c => {
        const selected = c === selectedValue ? 'selected' : '';
        return `<option value="${c}" ${selected}>${c}</option>`;
    }).join('');

    // Add custom value if not in list
    if (selectedValue && !consequences.includes(selectedValue)) {
        options = `<option value="${selectedValue}" selected>${selectedValue}</option>` + options;
    }

    return `<select class="w-full p-2 border border-slate-300 rounded text-sm" onchange="recalculateRow(${rowIndex})">
        ${options}
    </select>`;
}

/**
 * Create scale dropdown (Frequency, Severity, Likelihood)
 */
function createScaleDropdown(scale, selectedValue, rowIndex, scaleType) {
    let options = Object.entries(scale).map(([value, label]) => {
        const selected = parseFloat(value) === parseFloat(selectedValue) ? 'selected' : '';
        return `<option value="${value}" ${selected}>${value} - ${label}</option>`;
    }).join('');

    return `<select class="w-full p-2 border border-slate-300 rounded text-sm" onchange="recalculateRow(${rowIndex})">
        ${options}
    </select>`;
}

/**
 * Create activity type dropdown
 */
function createActivityTypeDropdown(selectedValue, rowIndex) {
    const types = ['Routine', 'Non-Routine', 'Emergency Situation'];
    let options = types.map(type => {
        const selected = type === selectedValue ? 'selected' : '';
        return `<option value="${type}" ${selected}>${type}</option>`;
    }).join('');

    return `<select class="w-full p-2 border border-slate-300 rounded text-sm">
        ${options}
    </select>`;
}

/**
 * Recalculate row risk score
 */
window.recalculateRow = function(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;

    const selects = row.querySelectorAll('select');
    let frequency = 1, severity = 1, likelihood = 1;

    // Find the frequency, severity, likelihood selects by position
    // Headers: Steps, Hazard Group, Hazard List, Risk/Consequences, Frequency, Severity, Likelihood, ...
    const cells = row.querySelectorAll('td');
    
    cells.forEach((cell, idx) => {
        const select = cell.querySelector('select');
        if (select) {
            // Check by examining option text patterns
            const firstOption = select.options[0]?.text || '';
            if (firstOption.includes('Routine') || firstOption.includes('Daily')) {
                frequency = parseFloat(select.value) || 1;
            } else if (firstOption.includes('Negligible') || firstOption.includes('No injury')) {
                severity = parseFloat(select.value) || 1;
            } else if (firstOption.includes('Rare') || firstOption.includes('Exceptional')) {
                likelihood = parseFloat(select.value) || 1;
            }
        }
    });

    // Recalculate
    const riskScore = calculateRiskScore(frequency, severity, likelihood);
    const riskCategory = getRiskCategory(riskScore);
    const riskColor = getRiskColor(riskScore);

    // Update score cell
    const scoreCell = row.querySelector('.score-cell');
    if (scoreCell) {
        scoreCell.textContent = riskScore.toFixed(2);
        scoreCell.style.color = riskColor.color;
    }

    // Update category cell (next sibling of score)
    const categoryCell = scoreCell?.nextElementSibling;
    if (categoryCell) {
        const span = categoryCell.querySelector('span') || categoryCell;
        span.textContent = riskCategory;
        span.style.backgroundColor = riskColor.bgColor;
        span.style.color = riskColor.color;
    }
};

/**
 * Handle hazard group change - update hazard list dropdown
 */
window.onHazardGroupChange = function(rowIndex, newCategoryId) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;

    // Find hazard list cell (3rd td, index 2)
    const cells = row.querySelectorAll('td');
    if (cells.length > 2) {
        const hazardListCell = cells[2];
        const hazards = getHazardsForCategory(newCategoryId);
        
        if (hazards.length > 0) {
            const defaultHazard = hazards[0];
            hazardListCell.innerHTML = createHazardListDropdown(newCategoryId, defaultHazard.id, rowIndex);
        }
    }

    recalculateRow(rowIndex);
};

// ============================================================================
// STATISTICS & VISUALIZATION
// ============================================================================

/**
 * Update risk statistics summary
 */
function updateRiskStatistics(data) {
    const stats = {
        total: data.length,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    };

    data.forEach(row => {
        const frequency = Math.min(parseFloat(row.Frequency) || 1, 2);
        const severity = Math.min(parseFloat(row.Severity) || 1, 10);
        const likelihood = Math.min(parseFloat(row.Likelihood) || 1, 10);
        const score = calculateRiskScore(frequency, severity, likelihood);
        const category = getRiskCategory(score);

        if (category === 'Critical Risk') stats.critical++;
        else if (category === 'High Risk') stats.high++;
        else if (category === 'Medium Risk') stats.medium++;
        else stats.low++;
    });

    // Update UI if elements exist
    const statsContainer = document.getElementById('riskStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-lg">
                <div class="text-center">
                    <div class="text-2xl font-bold text-slate-700">${stats.total}</div>
                    <div class="text-xs text-slate-500">Total Hazards</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-red-600">${stats.critical}</div>
                    <div class="text-xs text-slate-500">Critical</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-orange-500">${stats.high}</div>
                    <div class="text-xs text-slate-500">High</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-amber-500">${stats.medium}</div>
                    <div class="text-xs text-slate-500">Medium</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">${stats.low}</div>
                    <div class="text-xs text-slate-500">Low</div>
                </div>
            </div>
        `;
    }

    return stats;
}

/**
 * Load Google Charts for visualization
 */
function loadCharts(riskData, hazardData) {
    if (typeof google === 'undefined' || !google.charts) {
        console.error("Google Charts library not loaded.");
        return;
    }

    google.charts.load('current', { 'packages': ['corechart'] });
    google.charts.setOnLoadCallback(() => {
        const chartOptions = {
            pieHole: 0.4,
            backgroundColor: 'transparent',
            chartArea: { width: '90%', height: '80%' },
            legend: { position: 'bottom', textStyle: { color: '#475569', fontSize: 12 } },
            colors: ['#22c55e', '#eab308', '#f97316', '#dc2626']
        };

        if (Object.keys(riskData).length > 0) {
            drawRiskChart(riskData, chartOptions);
        }
        if (Object.keys(hazardData).length > 0) {
            drawHazardChart(hazardData, chartOptions);
        }
    });
}

/**
 * Draw risk distribution chart
 */
function drawRiskChart(riskData, options) {
    const chartDiv = document.getElementById('riskChart');
    if (!chartDiv) return;

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Risk Category');
    dataTable.addColumn('number', 'Count');

    Object.entries(riskData).forEach(([category, count]) => {
        dataTable.addRow([category, count]);
    });

    const chart = new google.visualization.PieChart(chartDiv);
    chart.draw(dataTable, { ...options, title: 'Risk Distribution' });
}

/**
 * Draw hazard group chart
 */
function drawHazardChart(hazardData, options) {
    const chartDiv = document.getElementById('hazardChart');
    if (!chartDiv) return;

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Hazard Group');
    dataTable.addColumn('number', 'Count');

    Object.entries(hazardData).forEach(([group, count]) => {
        dataTable.addRow([group, count]);
    });

    const chart = new google.visualization.PieChart(chartDiv);
    chart.draw(dataTable, { ...options, title: 'Hazards by Category' });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Extract table data for export
 */
function extractTableData() {
    const table = document.querySelector('#table-container table');
    if (!table) return { headers: [], rows: [] };

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = [];

    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowData = {};
        rowData['rowIndex'] = tr.dataset.rowIndex;

        tr.querySelectorAll('td').forEach((td, index) => {
            const header = headers[index];
            if (header && header !== 'Actions') {
                const select = td.querySelector('select');
                const input = td.querySelector('input');
                if (select) {
                    rowData[header] = select.value;
                } else if (input) {
                    rowData[header] = input.value;
                } else {
                    rowData[header] = td.textContent.trim();
                }
            }
        });
        rows.push(rowData);
    });

    return { headers, rows };
}

/**
 * Export to Excel
 */
function exportToExcel() {
    const { headers, rows } = extractTableData();
    if (rows.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Risk Assessment");

    const filename = `Risk_Assessment_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast('Assessment exported to Excel', 'success');
}

/**
 * Export to PDF (basic implementation)
 */
async function exportToPDF() {
    const { headers, rows } = extractTableData();
    if (rows.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    // Use PDFKit if available
    if (typeof PDFDocument !== 'undefined') {
        const doc = new PDFDocument();
        const stream = doc.pipe(blobStream());

        doc.fontSize(18).text('Risk Assessment Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        rows.forEach((row, idx) => {
            doc.fontSize(12).text(`${idx + 1}. ${row.Steps || 'N/A'}`, { underline: true });
            doc.fontSize(10).text(`   Hazard: ${row['Hazard List'] || 'N/A'}`);
            doc.text(`   Risk Score: ${row['Risk Score'] || 'N/A'} (${row['Risk Category'] || 'N/A'})`);
            doc.moveDown();
        });

        doc.end();

        stream.on('finish', function () {
            const blob = stream.toBlob('application/pdf');
            saveAs(blob, `Risk_Assessment_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Assessment exported to PDF', 'success');
        });
    } else {
        showToast('PDF export requires PDFKit library', 'warning');
    }
}

// ============================================================================
// CONTROL MEASURES MODAL
// ============================================================================

/**
 * Open control measures modal for a row
 */
window.openControlModal = function(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;

    // Get hazard group from the row
    const cells = row.querySelectorAll('td');
    const hazardGroupSelect = cells[1]?.querySelector('select');
    const categoryId = hazardGroupSelect?.value || 'SLIP';

    // Get suggested controls from registry
    const controls = getControlMeasures(categoryId);

    // Create modal content
    const modalHTML = `
        <div id="controlModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div class="p-6 border-b border-slate-200">
                    <h3 class="text-xl font-bold text-slate-800">Control Measures</h3>
                    <p class="text-sm text-slate-500 mt-1">Select applicable control measures for this hazard</p>
                </div>
                <div class="p-6 overflow-y-auto max-h-[50vh]">
                    <div class="space-y-3">
                        ${controls.map((control, idx) => `
                            <label class="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                                <input type="checkbox" class="mt-1 h-4 w-4 text-green-600 rounded" value="${idx}">
                                <span class="text-sm text-slate-700">${control}</span>
                            </label>
                        `).join('')}
                        ${controls.length === 0 ? '<p class="text-slate-500 italic">No pre-defined controls for this category. Add custom controls below.</p>' : ''}
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-slate-700 mb-2">Additional Controls</label>
                        <textarea id="customControls" rows="3" class="w-full p-3 border border-slate-300 rounded-lg text-sm" placeholder="Enter additional control measures..."></textarea>
                    </div>
                </div>
                <div class="p-6 border-t border-slate-200 flex justify-end gap-3">
                    <button onclick="closeControlModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                    <button onclick="saveControls(${rowIndex})" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Save Controls</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

/**
 * Close control measures modal
 */
window.closeControlModal = function() {
    const modal = document.getElementById('controlModal');
    if (modal) modal.remove();
};

/**
 * Save selected controls
 */
window.saveControls = function(rowIndex) {
    const modal = document.getElementById('controlModal');
    if (!modal) return;

    const selectedControls = [];
    modal.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const label = cb.closest('label').querySelector('span').textContent;
        selectedControls.push(label);
    });

    const customControls = document.getElementById('customControls')?.value;
    if (customControls?.trim()) {
        selectedControls.push(customControls.trim());
    }

    // Store controls on the row
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (row) {
        row.dataset.controls = JSON.stringify(selectedControls);
        
        // Update the Current Control input
        const controlInput = row.querySelector('td:nth-child(12) input');
        if (controlInput) {
            controlInput.value = selectedControls.slice(0, 2).join('; ') + (selectedControls.length > 2 ? '...' : '');
        }
    }

    closeControlModal();
    showToast(`${selectedControls.length} control measure(s) saved`, 'success');
};

// ============================================================================
// ROW DETAIL REVIEW MODAL
// ============================================================================

// Track current row being viewed in modal
window.currentRowDetailIndex = -1;

// Store uploaded/available images for tagging
window.availableImages = [];

/**
 * Open the row detail modal for reviewing a specific row
 */
window.openRowDetailModal = function(rowIndex) {
    const data = window.currentAssessmentRows;
    if (!data || rowIndex < 0 || rowIndex >= data.length) return;
    
    window.currentRowDetailIndex = rowIndex;
    const row = data[rowIndex];
    const tableRow = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    
    // Calculate current values from the table (in case user edited them)
    const frequency = parseFloat(tableRow?.querySelector('select[onchange*="frequency"]')?.value) || parseFloat(row.Frequency) || 1;
    const severity = parseFloat(tableRow?.querySelector('select[onchange*="severity"]')?.value) || parseFloat(row.Severity) || 4;
    const likelihood = parseFloat(tableRow?.querySelector('select[onchange*="likelihood"]')?.value) || parseFloat(row.Likelihood) || 4;
    const riskScore = calculateRiskScore(frequency, severity, likelihood);
    const riskCategory = getRiskCategory(riskScore);
    const riskColor = getRiskColor(riskScore);
    
    // Update title
    document.getElementById('rowDetailTitle').textContent = `Entry ${rowIndex + 1} of ${data.length}`;
    
    // Update header color based on risk
    const header = document.getElementById('rowDetailHeader');
    if (riskScore > 100) {
        header.className = 'bg-gradient-to-r from-red-600 to-red-700 p-4 text-white flex justify-between items-center';
    } else if (riskScore > 50) {
        header.className = 'bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white flex justify-between items-center';
    } else if (riskScore > 20) {
        header.className = 'bg-gradient-to-r from-yellow-500 to-amber-500 p-4 text-white flex justify-between items-center';
    } else {
        header.className = 'bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white flex justify-between items-center';
    }
    
    // Update risk card
    const riskCard = document.getElementById('rowDetailRiskCard');
    riskCard.style.backgroundColor = riskColor.bgColor;
    riskCard.style.borderColor = riskColor.color;
    document.getElementById('rowDetailScore').textContent = riskScore.toFixed(2);
    document.getElementById('rowDetailScore').style.color = riskColor.color;
    
    const categoryBadge = document.getElementById('rowDetailCategory');
    categoryBadge.textContent = riskCategory;
    categoryBadge.style.backgroundColor = riskColor.color;
    categoryBadge.style.color = '#ffffff';
    
    // Update details
    document.getElementById('rowDetailStep').textContent = row.Steps || 'No step description';
    document.getElementById('rowDetailHazardGroup').textContent = row['Hazard Group'] || '-';
    document.getElementById('rowDetailHazardList').textContent = row['Hazard List'] || '-';
    document.getElementById('rowDetailConsequences').textContent = row['Risk/Consequences'] || '-';
    document.getElementById('rowDetailFrequency').textContent = frequency;
    document.getElementById('rowDetailSeverity').textContent = severity;
    document.getElementById('rowDetailLikelihood').textContent = likelihood;
    document.getElementById('rowDetailSource').textContent = row['Hazard Source'] || '-';
    document.getElementById('rowDetailControls').textContent = row['Current Control'] || '-';
    document.getElementById('rowDetailActivityType').textContent = row['Routine/Non-Routine/Emergency Situation'] || '-';
    
    // Show additional controls if available
    const additionalControlsSection = document.getElementById('rowDetailAdditionalControls');
    const controlsList = document.getElementById('rowDetailControlsList');
    const savedControls = tableRow?.dataset.controls ? JSON.parse(tableRow.dataset.controls) : [];
    
    if (savedControls.length > 0) {
        additionalControlsSection.classList.remove('hidden');
        controlsList.innerHTML = savedControls.map(c => `
            <div class="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-800">
                ✓ ${c}
            </div>
        `).join('');
    } else {
        additionalControlsSection.classList.add('hidden');
    }
    
    // Populate tagged images
    const imagesContainer = document.getElementById('rowDetailImages');
    const taggedImages = row.taggedImages || [];
    
    if (taggedImages.length > 0) {
        imagesContainer.innerHTML = taggedImages.map((imgSrc, idx) => `
            <div class="relative group">
                <img src="${imgSrc}" class="w-full rounded-lg shadow-md" alt="Tagged image ${idx + 1}">
                <button onclick="untagImageFromRow(${rowIndex}, ${idx})" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
            </div>
        `).join('');
    } else {
        imagesContainer.innerHTML = `
            <div class="bg-slate-200 rounded-lg aspect-video flex items-center justify-center text-slate-500">
                <span>No images tagged - click below to add</span>
            </div>
        `;
    }
    
    // Populate available images for tagging
    populateAvailableImagesForTagging(rowIndex);
    
    // Show modal
    document.getElementById('rowDetailModal').classList.remove('hidden');
};

/**
 * Close the row detail modal
 */
window.closeRowDetailModal = function() {
    document.getElementById('rowDetailModal').classList.add('hidden');
    window.currentRowDetailIndex = -1;
};

/**
 * Navigate to previous/next row in detail modal
 */
window.navigateRowDetail = function(direction) {
    const data = window.currentAssessmentRows;
    if (!data) return;
    
    const newIndex = window.currentRowDetailIndex + direction;
    if (newIndex >= 0 && newIndex < data.length) {
        openRowDetailModal(newIndex);
    }
};

/**
 * Edit the current row in the table
 */
window.editRowFromModal = function() {
    const index = window.currentRowDetailIndex;
    closeRowDetailModal();
    
    // Scroll to the row in the table
    const row = document.querySelector(`tr[data-row-index="${index}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('bg-yellow-100');
        setTimeout(() => row.classList.remove('bg-yellow-100'), 2000);
    }
};

/**
 * Populate available images for tagging
 */
function populateAvailableImagesForTagging(rowIndex) {
    const container = document.getElementById('availableImagesForTagging');
    const currentRow = window.currentAssessmentRows?.[rowIndex];
    const taggedImages = currentRow?.taggedImages || [];
    
    // Get all available images from the gallery and video frames
    const allImages = [...window.availableImages];
    
    // Add images from the image gallery
    const galleryImages = document.querySelectorAll('#imageGallery img');
    galleryImages.forEach(img => {
        if (!allImages.includes(img.src)) {
            allImages.push(img.src);
        }
    });
    
    // Add frames from video processor if available
    if (typeof VideoProcessor !== 'undefined' && VideoProcessor.frames) {
        const frames = VideoProcessor.frames.get();
        frames.forEach(frame => {
            const url = URL.createObjectURL(frame.blob);
            if (!allImages.includes(url)) {
                allImages.push(url);
            }
        });
    }
    
    if (allImages.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 col-span-4 text-center py-2">No images available. Upload images or capture video frames first.</p>`;
        return;
    }
    
    container.innerHTML = allImages.map((imgSrc, idx) => {
        const isTagged = taggedImages.includes(imgSrc);
        return `
            <div class="relative cursor-pointer group" onclick="toggleImageTag(${rowIndex}, '${imgSrc}')">
                <img src="${imgSrc}" class="w-full h-12 object-cover rounded border-2 ${isTagged ? 'border-green-500' : 'border-transparent'} hover:border-blue-400 transition">
                ${isTagged ? '<div class="absolute inset-0 bg-green-500/30 rounded flex items-center justify-center"><span class="text-white text-xs font-bold">✓</span></div>' : ''}
            </div>
        `;
    }).join('');
}

/**
 * Toggle image tag on/off for a row
 */
window.toggleImageTag = function(rowIndex, imgSrc) {
    const data = window.currentAssessmentRows;
    if (!data || !data[rowIndex]) return;
    
    if (!data[rowIndex].taggedImages) {
        data[rowIndex].taggedImages = [];
    }
    
    const taggedImages = data[rowIndex].taggedImages;
    const idx = taggedImages.indexOf(imgSrc);
    
    if (idx > -1) {
        taggedImages.splice(idx, 1);
        showToast('Image untagged', 'info');
    } else {
        taggedImages.push(imgSrc);
        showToast('Image tagged to this entry', 'success');
    }
    
    // Update the table row's data attribute
    const tableRow = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (tableRow) {
        tableRow.dataset.taggedImages = JSON.stringify(taggedImages);
        
        // Update the image preview cell
        const imgCell = tableRow.querySelector('td:first-child');
        if (imgCell) {
            if (taggedImages.length > 0) {
                imgCell.innerHTML = `
                    <img src="${taggedImages[0]}" class="w-10 h-10 object-cover rounded cursor-pointer" onclick="openRowDetailModal(${rowIndex})" title="View details">
                    ${taggedImages.length > 1 ? `<span class="text-xs text-slate-500 block">+${taggedImages.length - 1}</span>` : ''}
                `;
            } else {
                imgCell.innerHTML = `<button onclick="openRowDetailModal(${rowIndex})" class="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 transition" title="Add image">+</button>`;
            }
        }
    }
    
    // Refresh the modal view
    openRowDetailModal(rowIndex);
};

/**
 * Untag an image from a row
 */
window.untagImageFromRow = function(rowIndex, imageIndex) {
    const data = window.currentAssessmentRows;
    if (!data || !data[rowIndex] || !data[rowIndex].taggedImages) return;
    
    data[rowIndex].taggedImages.splice(imageIndex, 1);
    
    // Update table and refresh modal
    const tableRow = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (tableRow) {
        tableRow.dataset.taggedImages = JSON.stringify(data[rowIndex].taggedImages);
    }
    
    showToast('Image removed', 'info');
    openRowDetailModal(rowIndex);
};

/**
 * Add images to the available pool for tagging
 */
window.addAvailableImage = function(imgSrc) {
    if (!window.availableImages.includes(imgSrc)) {
        window.availableImages.push(imgSrc);
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the SaaS core engine
 */
function initializeSaaSEngine() {
    console.log('EHS Smart SaaS Engine v' + SAAS_CONFIG.VERSION + ' initialized');
    
    // Set default language
    window.currentLanguage = SAAS_CONFIG.DEFAULT_LANGUAGE;
    
    // Check if hazard registry is loaded
    if (typeof HSE_HAZARD_REGISTRY === 'undefined') {
        console.warn('HSE Hazard Registry not loaded. Some features may be limited.');
    } else {
        console.log('HSE Hazard Registry loaded:', HSE_HAZARD_REGISTRY.statistics?.summary);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSaaSEngine);
} else {
    initializeSaaSEngine();
}

// ============================================================================
// EXPORTS (for module usage)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SAAS_CONFIG,
        FREQUENCY_SCALE,
        SEVERITY_SCALE,
        LIKELIHOOD_SCALE,
        calculateRiskScore,
        getRiskCategory,
        getRiskColor,
        callAPI,
        parseAndCleanData,
        generateRiskAssessmentPrompt,
        generateImageAnalysisPrompt,
        buildTableFromData,
        extractTableData,
        exportToExcel,
        exportToPDF,
        t
    };
}
