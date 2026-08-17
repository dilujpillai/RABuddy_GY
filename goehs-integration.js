// ========================================================================
// GOEHS INTEGRATION - Complete Implementation with CSV Generation
// ========================================================================

// ========================================================================
// SECURITY UTILITIES - Safe DOM Manipulation
// ========================================================================

/**
 * Sanitize a string for safe display (prevents XSS)
 * @param {string} str - The string to sanitize
 * @returns {string} - HTML-escaped string safe for display
 */
function sanitizeForDisplay(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Create a safe text element (paragraph, span, etc.)
 * @param {string} tag - HTML tag name (e.g., 'p', 'span', 'div')
 * @param {string} text - Text content (will be safely escaped)
 * @param {string} className - CSS classes to apply
 * @returns {HTMLElement} - Safe DOM element
 */
function createSafeTextElement(tag, text, className = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

/**
 * Validate file upload (type, extension, size)
 * @param {File} file - The file to validate
 * @param {object} options - Validation options
 * @returns {object} - { valid: boolean, error: string|null }
 */
function validateFileUpload(file, options = {}) {
    const {
        allowedExtensions = ['.xlsx', '.xls'],
        allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ],
        maxSizeMB = 10
    } = options;
    
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` };
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return { valid: false, error: `File too large (${sizeMB}MB). Maximum: ${maxSizeMB}MB` };
    }
    
    return { valid: true, error: null };
}

// ========================================================================
// DIRECT GOEHS UPLOAD - RA 2025 Template Parser
// ========================================================================

// Store for direct GOEHS upload data
let directGoehsData = null;

const GOEHS_WORKFLOW_SOURCES = Object.freeze({
    RA2025_SINGLE: 'RA2025_SINGLE',
    LEGACY_AI: 'LEGACY_AI'
});

function setGoehsWorkflowContext(source, metadata = {}) {
    const context = {
        source: source || '',
        setAt: new Date().toISOString(),
        metadata: metadata || {}
    };
    window.goehsWorkflowContext = context;
    return context;
}

window.GOEHS_WORKFLOW_SOURCES = GOEHS_WORKFLOW_SOURCES;
window.setGoehsWorkflowContext = setGoehsWorkflowContext;

// Helper to show alerts (works across script scopes)
function showDirectGoehsAlert(message, type = 'info') {
    if (window.showCustomAlert) {
        window.showCustomAlert(message, type);
    } else {
        // Fallback - use the GOEHS alert or basic alert
        const container = document.getElementById('toast-container');
        if (container) {
            let bgColor;
            switch (type) {
                case 'success': bgColor = 'bg-green-100 border-green-400 text-green-800'; break;
                case 'error': bgColor = 'bg-red-100 border-red-400 text-red-800'; break;
                default: bgColor = 'bg-blue-100 border-blue-400 text-blue-800'; break;
            }
            const toast = document.createElement('div');
            toast.className = `flex items-center gap-3 p-4 rounded-lg shadow-lg border ${bgColor} transition-all duration-300`;
            // Create message div safely using textContent to prevent XSS
            const messageDiv = document.createElement('div');
            messageDiv.className = 'text-sm font-medium flex-1';
            messageDiv.textContent = message;
            // Create close button safely without inline onclick
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'p-1.5 rounded-full hover:bg-black/10';
            closeBtn.textContent = '×';
            closeBtn.onclick = () => { toast.remove(); };
            toast.appendChild(messageDiv);
            toast.appendChild(closeBtn);
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        } else {
            alert(message);
        }
    }
}

// After an RA2025 auto-detect parse, tell the user up front if Frequency/Severity/Likelihood
// couldn't actually be detected/read for some rows (they were filled with a scale default
// instead) - the per-cell dashed amber outline (.scale-value-unverified) marks exactly which
// rows, but a banner right after upload means it can't be missed or scrolled past unnoticed.
function warnIfRA2025ScaleColumnsUnverified(riskItems) {
    if (!Array.isArray(riskItems) || riskItems.length === 0) return;

    const counts = { frequency: 0, severity: 0, likelihood: 0 };
    riskItems.forEach(item => {
        const a = item.assessment_pre_control || {};
        if (a.frequency_unverified) counts.frequency++;
        if (a.severity_unverified) counts.severity++;
        if (a.likelihood_unverified) counts.likelihood++;
    });

    const flagged = Object.entries(counts).filter(([, n]) => n > 0);
    if (flagged.length === 0) return;

    const parts = flagged.map(([field, n]) => `${n} row(s) with no ${field}`);
    setTimeout(() => {
        showDirectGoehsAlert(
            `⚠️ Could not auto-detect: ${parts.join(', ')}. These were filled with a default value (dashed amber outline in the table) - please verify or use "Remap Columns" to map them manually.`,
            'warning'
        );
    }, 600);
}
window.warnIfRA2025ScaleColumnsUnverified = warnIfRA2025ScaleColumnsUnverified;

// Handle Direct GOEHS Excel Upload (RA 2025 Template format)
// Now with fallback to manual column mapping if auto-detection fails
async function handleDirectGoehsUpload(event) {
    console.log('handleDirectGoehsUpload called', event);
    const file = event.target.files?.[0];
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    console.log('Processing file:', file.name);
    
    // SECURITY: Validate file type, extension, and size
    const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream' // Some browsers report this for Excel files
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        showDirectGoehsAlert('❌ Invalid file type. Please upload an Excel file (.xlsx or .xls)', 'error');
        event.target.value = ''; // Reset input
        return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showDirectGoehsAlert(`❌ File too large (${sizeMB}MB). Maximum allowed size is 10MB.`, 'error');
        event.target.value = ''; // Reset input
        return;
    }
    
    // Additional MIME type check (with fallback for browser inconsistencies)
    if (file.type && !validMimeTypes.includes(file.type)) {
        console.warn('Unexpected MIME type:', file.type, '- proceeding with extension-based validation');
    }
    
    try {
        showDirectGoehsAlert('📂 Processing RA 2025 Template (auto-detecting language)...', 'info');
        
        // Check for multiple sheets first
        const sheetList = await getExcelSheetList(file);
        if (sheetList.length > 1) {
            // Show sheet picker modal and let user choose
            showSheetPickerForRA2025(file, sheetList, 'single');
            return;
        }
        
        // Single sheet — pass the sheet index directly to skip hasRA2025Structure check.
        // The user explicitly chose this upload path, so we trust it's an RA2025 template.
        const singleSheetIdx = sheetList.length === 1 ? sheetList[0].index : 1;
        const data = await parseRA2025Template(file, null, singleSheetIdx);
        console.log('Parsed data:', data);
        
        // Check if we got valid data
        if (!data.risk_items || data.risk_items.length === 0) {
            throw new Error('NO_DATA_FOUND');
        }
        
        // Store context for GOEHS modal to use later
        window.directGoehsContext = data.process_context;
        setGoehsWorkflowContext(GOEHS_WORKFLOW_SOURCES.RA2025_SINGLE, {
            workflow: 'ra2025_single_upload',
            sourceFile: file.name,
            selectedSheetIndex: singleSheetIdx,
            selectedSheetCount: 1,
            sheetName: data.sheet_name || null,
            detectedLanguage: data.detectedLang || null,
            riskItemCount: Array.isArray(data.risk_items) ? data.risk_items.length : 0,
            processContext: data.process_context || null
        });
        
        // Store the file and raw data for potential remapping
        window.ra2025LoadedFile = file;
        window.ra2025RawRiskItems = data.risk_items;
        window.ra2025SelectedSheetIndex = null; // single-sheet, no specific index
        
        // Convert parsed data to the format buildTableFromData expects
        const tableData = convertRA2025ToTableFormat(data.risk_items);
        console.log('Converted table data:', tableData);
        
        // Populate the main risk assessment table (same as AI does)
        // Use window.buildTableFromData since it's in a different script scope
        if (window.buildTableFromData) {
            window.buildTableFromData(tableData);
        } else {
            throw new Error('buildTableFromData not available');
        }
        
        if (window.initializeDashboard) {
            window.initializeDashboard();
        }
        
        // Show dashboard
        document.getElementById('dashboard-container').style.display = 'block';
        
        // Switch to the Rich Media tab (where the main table lives) and scroll into view
        if (window.switchTab) window.switchTab('rich-media');
        
        // Show the Remap Columns button since we loaded RA2025 data
        const remapBtn = document.getElementById('remapColumnsBtn');
        if (remapBtn) remapBtn.classList.remove('rab-hidden');
        
        // Scroll to table
        setTimeout(() => {
            const table = document.querySelector('#table-container table');
            if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
        showDirectGoehsAlert(`✅ Loaded ${data.risk_items.length} risk items from "${file.name}". Review the table, then use "Open GOEHS Integration" to upload to GOEHS.`, 'success');
        warnIfRA2025ScaleColumnsUnverified(data.risk_items);

    } catch (error) {
        console.error('Direct GOEHS Upload Error:', error);
        
        // If auto-detection failed, offer manual column mapping
        if (error.message === 'NO_DATA_FOUND' || error.message.includes('Could not find RA 2025')) {
            showDirectGoehsAlert('� ️ Could not auto-detect RA 2025 format. Opening manual column mapper...', 'info');
            
            // Store file for manual mapping
            window.ra2025PendingFile = file;
            
            // Open the fallback column mapper modal
            setTimeout(() => {
                openRA2025ColumnMapper(file);
            }, 500);
        } else {
            showDirectGoehsAlert('❌ Error parsing Excel: ' + error.message, 'error');
        }
    }
    
    // Reset input for re-upload
    event.target.value = '';
}

// Show the sheet picker modal for multi-tab Excel files
// mode: 'single' (RA 2025 single file) or 'batch' (batch RA 2025)
function showSheetPickerForRA2025(file, sheetList, mode, batchFileIndex) {
    const modal = document.getElementById('sheetPickerModal');
    const listDiv = document.getElementById('sheetPickerList');
    const fileNameEl = document.getElementById('sheetPickerFileName');
    const confirmBtn = document.getElementById('sheetPickerConfirm');
    const selectAllBtn = document.getElementById('sheetPickerSelectAll');

    fileNameEl.textContent = '📁 ' + file.name + ' — ' + sheetList.length + ' sheets found';
    listDiv.innerHTML = '';

    sheetList.forEach((sheet, idx) => {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; cursor:pointer; transition:all 0.15s;';
        row.onmouseenter = () => { row.style.background = '#eff6ff'; row.style.borderColor = '#93c5fd'; };
        row.onmouseleave = () => { row.style.background = cb.checked ? '#eff6ff' : '#f8fafc'; row.style.borderColor = cb.checked ? '#93c5fd' : '#e2e8f0'; };

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = sheet.index;
        cb.checked = idx === 0; // Check first by default
        cb.style.cssText = 'width:18px; height:18px; accent-color:#002c5f; cursor:pointer;';
        cb.addEventListener('change', () => {
            row.style.background = cb.checked ? '#eff6ff' : '#f8fafc';
            row.style.borderColor = cb.checked ? '#93c5fd' : '#e2e8f0';
        });

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-size:0.95rem; color:#1e293b; font-weight:500; flex:1;';
        nameSpan.textContent = sheet.name;

        const idxBadge = document.createElement('span');
        idxBadge.style.cssText = 'font-size:0.75rem; color:#64748b; background:#e2e8f0; padding:2px 8px; border-radius:999px;';
        idxBadge.textContent = 'Sheet ' + sheet.index;

        row.appendChild(cb);
        row.appendChild(nameSpan);
        row.appendChild(idxBadge);
        listDiv.appendChild(row);

        // Initial highlight for checked
        if (cb.checked) { row.style.background = '#eff6ff'; row.style.borderColor = '#93c5fd'; }
    });

    // Select All toggle
    selectAllBtn.onclick = () => {
        const cbs = listDiv.querySelectorAll('input[type=checkbox]');
        const allChecked = Array.from(cbs).every(c => c.checked);
        cbs.forEach(c => { c.checked = !allChecked; c.dispatchEvent(new Event('change')); });
        selectAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
    };

    // Confirm handler
    confirmBtn.onclick = async () => {
        const selected = Array.from(listDiv.querySelectorAll('input[type=checkbox]:checked')).map(c => parseInt(c.value));
        if (selected.length === 0) {
            showCustomAlert('Please select at least one sheet.', 'info');
            return;
        }
        modal.style.display = 'none';

        if (mode === 'single') {
            await processSelectedSheetsRA2025(file, selected);
        } else if (mode === 'batch') {
            await processSelectedSheetsBatchRA2025(file, selected, batchFileIndex);
        }
    };

    modal.style.display = 'flex';
}

// Process selected sheets for RA 2025 single-file workflow
async function processSelectedSheetsRA2025(file, sheetIndices) {
    let allRiskItems = [];
    let lastContext = null;
    let lastDetectedLang = 'en';
    let lastDetectedColumns = {};
    let errors = [];

    showDirectGoehsAlert(`📂 Processing ${sheetIndices.length} sheet(s) from "${file.name}"...`, 'info');

    for (const sheetIdx of sheetIndices) {
        try {
            const data = await parseRA2025Template(file, null, sheetIdx);
            if (data.risk_items && data.risk_items.length > 0) {
                allRiskItems = allRiskItems.concat(data.risk_items);
                lastContext = data.process_context;
                lastDetectedLang = data.detectedLang || lastDetectedLang;
                lastDetectedColumns = data.detectedColumns || lastDetectedColumns;
            } else {
                errors.push(`Sheet ${sheetIdx}: No data rows found`);
            }
        } catch (err) {
            errors.push(`Sheet ${sheetIdx}: ${err.message}`);
        }
    }

    if (allRiskItems.length === 0) {
        showDirectGoehsAlert('� ️ No data found in selected sheets. Opening manual column mapper...', 'info');
        window.ra2025PendingFile = file;
        // Pass the first selected sheet index so the mapper shows the correct sheet data
        const firstSheetIdx = sheetIndices[0] || null;
        setTimeout(() => { openRA2025ColumnMapper(file, firstSheetIdx); }, 500);
        return;
    }

    // Store context
    window.directGoehsContext = lastContext;
    setGoehsWorkflowContext(GOEHS_WORKFLOW_SOURCES.RA2025_SINGLE, {
        workflow: 'ra2025_single_upload_multisheet',
        sourceFile: file.name,
        selectedSheetIndices: sheetIndices,
        selectedSheetCount: sheetIndices.length,
        sheetMode: sheetIndices.length > 1 ? 'multi' : 'single',
        detectedLanguage: lastDetectedLang || null,
        riskItemCount: allRiskItems.length,
        processContext: lastContext || null,
        partialErrorCount: errors.length
    });
    window.ra2025LoadedFile = file;
    window.ra2025RawRiskItems = allRiskItems;
    window.ra2025SelectedSheetIndex = sheetIndices[0] || null;

    // Convert and build table
    const tableData = convertRA2025ToTableFormat(allRiskItems);
    if (window.buildTableFromData) {
        window.buildTableFromData(tableData);
    } else {
        showDirectGoehsAlert('❌ buildTableFromData not available', 'error');
        return;
    }

    if (window.initializeDashboard) window.initializeDashboard();

    document.getElementById('dashboard-container').style.display = 'block';
    if (window.switchTab) window.switchTab('rich-media');

    const remapBtn = document.getElementById('remapColumnsBtn');
    if (remapBtn) remapBtn.classList.remove('rab-hidden');

    setTimeout(() => {
        const table = document.querySelector('#table-container table');
        if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

    let msg = `✅ Loaded ${allRiskItems.length} risk items from ${sheetIndices.length} sheet(s) in "${file.name}".`;
    if (errors.length > 0) msg += ` � ️ ${errors.length} sheet(s) had issues.`;
    showDirectGoehsAlert(msg, 'success');
    warnIfRA2025ScaleColumnsUnverified(allRiskItems);
}

// Process selected sheets for RA 2025 batch workflow.
// Returns per-file metadata compatible with batch dashboards and can also hand off
// to a host callback when running inside an external batch processor.
async function processSelectedSheetsBatchRA2025(file, sheetIndices, batchFileIndex) {
    let allRiskItems = [];
    let lastContext = null;
    let lastDetectedLang = 'en';
    let lastDetectedColumns = {};
    const errors = [];

    showDirectGoehsAlert(`📂 Processing ${sheetIndices.length} selected sheet(s) from "${file.name}"...`, 'info');

    for (const sheetIdx of sheetIndices) {
        try {
            const data = await parseRA2025Template(file, null, sheetIdx);
            if (data.risk_items && data.risk_items.length > 0) {
                allRiskItems = allRiskItems.concat(data.risk_items);
                lastContext = data.process_context;
                lastDetectedLang = data.detectedLang || lastDetectedLang;
                lastDetectedColumns = data.detectedColumns || lastDetectedColumns;
            } else {
                errors.push(`Sheet ${sheetIdx}: No data rows found`);
            }
        } catch (err) {
            errors.push(`Sheet ${sheetIdx}: ${err.message}`);
        }
    }

    const parsed = {
        fileName: file && file.name ? file.name : `BatchFile_${batchFileIndex ?? ''}`,
        status: allRiskItems.length > 0 ? 'ready' : 'failed',
        riskItems: allRiskItems,
        tableData: allRiskItems.length > 0 ? convertRA2025ToTableFormat(allRiskItems) : [],
        parsedContext: lastContext,
        detectedLang: lastDetectedLang || 'en',
        detectedColumns: lastDetectedColumns || {},
        selectedSheetIndices: Array.isArray(sheetIndices) ? [...sheetIndices] : [],
        partialErrors: errors,
        errorMsg: allRiskItems.length > 0 ? '' : (errors.join(' | ') || 'No data found in selected sheets')
    };

    if (typeof window.onBatchSheetSelectionResult === 'function') {
        try {
            window.onBatchSheetSelectionResult(batchFileIndex, parsed);
        } catch (callbackErr) {
            console.warn('onBatchSheetSelectionResult callback failed:', callbackErr);
        }
    }

    if (allRiskItems.length === 0) {
        showDirectGoehsAlert('⚠ No usable rows found in selected sheets.', 'warning');
        return parsed;
    }

    const issueCount = errors.length;
    const summary = `✅ Parsed ${allRiskItems.length} row(s) from ${sheetIndices.length} selected sheet(s)` +
        (issueCount > 0 ? ` · ${issueCount} sheet(s) had issues.` : '.');
    showDirectGoehsAlert(summary, issueCount > 0 ? 'info' : 'success');
    return parsed;
}

// Convert RA 2025 parsed data to buildTableFromData format
// Note: This function passes raw values - buildTableFromData will handle registry lookups
function convertRA2025ToTableFormat(riskItems) {
    // --- AUTO-DETECT LANGUAGE FROM HAZARD GROUPS ---
    let detectedLang = null;
    // Get current language from localStorage (since currentLang is in IIFE scope)
    let appLang = localStorage.getItem('appLanguage') || 'en';
    
    if (riskItems.length > 0) {
        const firstHazardGroup = riskItems[0].hazard_classification?.group || '';
        detectedLang = window.detectLanguageFromContent ? window.detectLanguageFromContent(firstHazardGroup) : null;
        
        if (detectedLang && detectedLang !== appLang) {
            console.log(`🌐 Auto-detected Excel language: ${detectedLang.toUpperCase()}`);
            // Auto-switch UI language to match Excel file
            appLang = detectedLang;
            localStorage.setItem('appLanguage', appLang);
            
            // Update language selector dropdown
            const langSelect = document.getElementById('langSelect');
            if (langSelect) langSelect.value = detectedLang;
            
            // Trigger language change event to update UI
            if (langSelect) {
                langSelect.dispatchEvent(new Event('change'));
            }
            
            showDirectGoehsAlert(`🌐 Detected ${detectedLang === 'fr' ? 'French' : detectedLang === 'de' ? 'German' : detectedLang.toUpperCase()} Excel file - UI switched to match.`, 'info');
        }
    }
    
    return riskItems.map(item => {
        // Get hazard info from parsed data
        const hazardType = item.hazard_classification.type || '';
        // Normalize hazard group: convert French/German back to English key
        const rawHazardGroup = item.hazard_classification.group || 'Physical';
        const hazardGroup = window.reverseTranslate ? window.reverseTranslate(rawHazardGroup) : rawHazardGroup;
        
        // Normalize hazard list and consequence: convert French/German back to English key
        const rawHazardType = item.hazard_classification.type || '';
        const normalizedHazardType = window.reverseTranslate ? window.reverseTranslate(rawHazardType) : rawHazardType;
        
        const rawConsequence = item.risk_scenario.consequence || '';
        const normalizedConsequence = window.reverseTranslate ? window.reverseTranslate(rawConsequence) : rawConsequence;
        
        // Map control hierarchy to Countermeasure Ladder
        const countermeasureLadder = mapHierarchyToCountermeasureLadder(item.mitigation_plan.control_hierarchy);
        
        // Use normalized values - buildTableFromData will validate against registry
        return {
            'Steps': item.task_name,
            'Hazard Group': hazardGroup,
            'Hazard List': normalizedHazardType || 'Hand tools (cut, impact, puncture, etc.)', // Default fallback
            'Risk/Consequences': normalizedConsequence || 'Injury',
            'Hazard Source': item.risk_scenario.source || '',
            'Current Control': item.mitigation_plan.current_controls || '',
            'Countermeasure_Ladder': countermeasureLadder,
            'Routine/Non-Routine/Emergency Situation': parseGoehsConditionMode(
                item.routine_type || item.routineType || item.condition_mode || item.mode || 'Routine'
            ),
            'Frequency': item.assessment_pre_control.frequency || 1, // Use extracted frequency, default to 1
            'Severity': item.assessment_pre_control.severity || 5,
            'Likelihood': item.assessment_pre_control.likelihood || 3,
            'Risk Score': item.assessment_pre_control.calculated_score,
            // Flags a Frequency/Severity/Likelihood that couldn't be detected/parsed from the
            // Excel file at all (column not found, or cell content in an unrecognized format) -
            // as opposed to a genuinely-read value that happens to equal the same number. Lets
            // the table/GOEHS modal visibly mark it instead of silently showing an indistinguishable default.
            '_frequencyUnverified': !!item.assessment_pre_control.frequency_unverified,
            '_severityUnverified': !!item.assessment_pre_control.severity_unverified,
            '_likelihoodUnverified': !!item.assessment_pre_control.likelihood_unverified,
            'imageId': null
        };
    });
}

// Map control hierarchy text to Countermeasure Ladder values.
// Returns '' (not a guessed default) when there's no text or no keyword match - a blank
// field correctly signals "needs classification" so it surfaces to the Fix Countermeasure
// Ladder AI/Intelligent tools (and the live issue counter) instead of silently looking
// pre-resolved with a fabricated "Level 2 - Administrative Controls" that has no basis in
// the actual content (this previously misclassified any non-English or unrecognized text).
function mapHierarchyToCountermeasureLadder(hierarchy) {
    if (!hierarchy) return '';

    const h = hierarchy.toLowerCase();

    if (h.includes('elimination') || h.includes('eliminate') || h.includes('remove')) {
        return 'Level 6 - Elimination';
    }
    if (h.includes('substitution') || h.includes('substitute') || h.includes('replace')) {
        return 'Level 5 - Substitution';
    }
    if (h.includes('engineering') || h.includes('guard') || h.includes('barrier') || h.includes('interlock') || h.includes('isolation')) {
        return 'Level 4 - Engineering Controls';
    }
    if (h.includes('visual') || h.includes('sign') || h.includes('warning') || h.includes('marking') || h.includes('label')) {
        return 'Level 3 - Visual Controls';
    }
    if (h.includes('administrative') || h.includes('training') || h.includes('procedure') || h.includes('sop') || h.includes('instruction')) {
        return 'Level 2 - Administrative Controls';
    }
    if (h.includes('ppe') || h.includes('individual') || h.includes('personal') || h.includes('glove') || h.includes('goggle') || h.includes('helmet')) {
        return 'Level 1 - Individual Target';
    }

    return '';
}

// Helper: Enumerate all sheets in an Excel file
async function getExcelSheetList(file) {
    const zip = await JSZip.loadAsync(file);
    const parser = new DOMParser();
    const wbXml = await zip.file("xl/workbook.xml")?.async("text") || "";
    const wbDoc = parser.parseFromString(wbXml, "text/xml");
    const wbSheets = wbDoc.getElementsByTagName("sheet");
    const sheets = [];
    for (let i = 1; i <= 50; i++) {
        const path = `xl/worksheets/sheet${i}.xml`;
        if (zip.file(path)) {
            const name = (wbSheets[i - 1] && wbSheets[i - 1].getAttribute("name")) || `Sheet ${i}`;
            sheets.push({ index: i, name: name });
        }
    }
    return sheets;
}

// Parse RA 2025 Template Excel file
// sheetIndex: if provided, parse only that specific sheet (1-based)
async function parseRA2025Template(file, columnOverrides, sheetIndex) {
    const zip = await JSZip.loadAsync(file);
    
    // Get shared strings
    const strXml = await zip.file("xl/sharedStrings.xml")?.async("text") || "";
    const strings = parseSharedStringsForRA2025(strXml);
    
    // Find the best sheet (look for one with "Plant" in cell A2 area)
    const parser = new DOMParser();
    let targetSheet = null;
    let sheetName = '';
    
    if (sheetIndex) {
        // Parse a specific sheet by index
        const path = `xl/worksheets/sheet${sheetIndex}.xml`;
        const sheetFile = zip.file(path);
        if (sheetFile) {
            const xml = await sheetFile.async("text");
            targetSheet = parser.parseFromString(xml, "text/xml");
            const wbXml = await zip.file("xl/workbook.xml")?.async("text") || "";
            const wbDoc = parser.parseFromString(wbXml, "text/xml");
            const sheets = wbDoc.getElementsByTagName("sheet");
            if (sheets[sheetIndex - 1]) {
                sheetName = sheets[sheetIndex - 1].getAttribute("name") || `Sheet${sheetIndex}`;
            }
        }
    } else {
        for (let i = 1; i <= 50; i++) {
            const path = `xl/worksheets/sheet${i}.xml`;
            const sheetFile = zip.file(path);
            if (sheetFile) {
                const xml = await sheetFile.async("text");
                const doc = parser.parseFromString(xml, "text/xml");
                
                // Check if this sheet has "Plant" indicator in rows 1-5
                if (hasRA2025Structure(doc, strings)) {
                    targetSheet = doc;
                    // Try to get sheet name from workbook.xml
                    const wbXml = await zip.file("xl/workbook.xml")?.async("text") || "";
                    const wbDoc = parser.parseFromString(wbXml, "text/xml");
                    const sheets = wbDoc.getElementsByTagName("sheet");
                    if (sheets[i-1]) {
                        sheetName = sheets[i-1].getAttribute("name") || `Sheet${i}`;
                    }
                    break;
                }
            }
        }
    }
    
    if (!targetSheet) {
        throw new Error('Could not find RA 2025 formatted sheet. Looking for "Plant" label in header area.');
    }
    
    // Parse Zone A: Header Metadata (Rows 1-13)
    const context = parseZoneA(targetSheet, strings);
    
    // Extract raw preview rows (first 25 rows) for column mapper UI
    const previewRows = extractSheetPreview(targetSheet, strings, 25);
    
    // Detect columns (also detects language)
    const detectionResult = detectRA2025Columns(targetSheet, strings);
    const detectedLang = detectionResult.detectedLang || 'en';
    
    // Parse Zone B: Risk Items (Row 15+) — pass column overrides if provided
    const riskItems = parseZoneB(targetSheet, strings, columnOverrides);
    
    // Build a clean detectedColumns map (field → column letter) for the mapper UI
    const detectedColumns = {};
    const _dcFields = ['taskId','taskDesc','hazardGroup','hazardDetail','consequence','source','currentControl','routine','frequency','severity','likelihood','riskScore','newControl','hierarchy'];
    _dcFields.forEach(f => { if (detectionResult[f]) detectedColumns[f] = detectionResult[f]; });
    if (detectionResult.headerRow) detectedColumns.headerRow = detectionResult.headerRow;
    
    return {
        file_source: file.name,
        sheet_name: sheetName,
        process_context: context,
        risk_items: riskItems,
        previewRows: previewRows,
        detectedLang: detectedLang,
        detectedColumns: detectedColumns
    };
}

// Extract first N rows from a sheet for preview display
function extractSheetPreview(doc, strings, maxRows) {
    const rows = doc.getElementsByTagName("row");
    const preview = [];
    let maxCol = 0; // track widest row
    
    for (let i = 0; i < rows.length && preview.length < maxRows; i++) {
        const row = rows[i];
        const rowNum = parseInt(row.getAttribute("r"));
        const cells = row.getElementsByTagName("c");
        const rowData = { _rowNum: rowNum };
        
        for (let cell of cells) {
            const ref = cell.getAttribute("r") || '';
            const colMatch = ref.match(/^([A-Z]+)/);
            if (colMatch) {
                const colLetter = colMatch[1];
                const colIdx = colLetterToIndex(colLetter);
                if (colIdx > maxCol) maxCol = colIdx;
                rowData[colLetter] = getCellTextRA2025(cell, strings);
            }
        }
        preview.push(rowData);
    }
    
    // Build column letters array up to the widest column found
    const columns = [];
    for (let i = 0; i <= Math.min(maxCol, 25); i++) { // Cap at Z
        columns.push(indexToColLetter(i));
    }
    
    return { rows: preview, columns: columns };
}

// Convert column letter (A, B, ..., Z, AA, AB...) to 0-based index
function colLetterToIndex(col) {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
        idx = idx * 26 + (col.charCodeAt(i) - 64);
    }
    return idx - 1;
}

// Convert 0-based index to column letter
function indexToColLetter(idx) {
    let s = '';
    idx++;
    while (idx > 0) {
        idx--;
        s = String.fromCharCode(65 + (idx % 26)) + s;
        idx = Math.floor(idx / 26);
    }
    return s;
}

// Parse shared strings XML for RA 2025
function parseSharedStringsForRA2025(xml) {
    const strings = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const siNodes = doc.getElementsByTagName("si");
    
    for (let si of siNodes) {
        let text = '';
        const tNodes = si.getElementsByTagName("t");
        for (let t of tNodes) {
            text += t.textContent || '';
        }
        strings.push(text);
    }
    return strings;
}

// Multi-language keywords for RA 2025 template detection
const RA2025_KEYWORDS = {
    // Header area keywords (Zone A)
    headerKeywords: {
        plant: ['plant', 'usine', 'werk', 'fabrika', 'planta', 'stabilimento'],
        department: ['department', 'département', 'abteilung', 'bölüm', 'departamento', 'dipartimento'],
        area: ['area', 'zone', 'bereich', 'alan', 'área', 'area'],
        workstation: ['workstation', 'poste de travail', 'arbeitsplatz', 'iş istasyonu', 'estación de trabajo', 'postazione'],
        raReference: ['ra reference', 'référence ra', 'ra-referenz', 'ra referansı', 'referencia ra']
    },
    // Data row header keywords (Zone B - Row 14)
    columnKeywords: {
        taskId: ['task id', 'id tâche', 'aufgaben-id', 'görev id', 'id da tarefa', 'no', 'nr', '#', 'id'],
        taskDesc: ['task description', 'job step', 'description', 'beschreibung', 'açıklama', 'description de la tâche', 'tâche', 'aufgabe', 'görev', 'descrição da tarefa', 'descrição', 'etapa'],
        hazardGroup: ['hazard group', 'groupe de risque', 'gefahrengruppe', 'tehlike grubu', 'categoria', 'catégorie', 'hazard category', 'groupe de danger', 'grupo de risco', 'grupo de perigo'],
        hazardDetail: ['hazard detail', 'hazard list', 'détail du risque', 'gefahrendetail', 'tehlike detayı', 'tipo', 'type de danger', 'liste des dangers', 'detalhe do risco', 'lista de riscos', 'tipo de risco'],
        consequence: ['consequence', 'conséquence', 'konsequenz', 'sonuç', 'injury', 'blessure', 'verletzung', 'illness', 'maladie', 'risk/consequence', 'risque/conséquence', 'injury/illness', 'blessure/maladie', 'verletzung/krankheit', 'consequência', 'lesão', 'ferimento', 'risco/consequência'],
        source: ['source', 'quelle', 'kaynak', 'origen', 'hazard source', 'source du danger', 'fonte', 'fonte do risco'],
        currentControl: ['current control', 'contrôle actuel', 'aktuelle kontrolle', 'mevcut kontrol', 'control actual', 'counter measure', 'countermeasure', 'maßnahme', 'mesure existante', 'controle atual', 'contramedida'],
        routine: ['routine', 'non-routine', 'non routine', 'emergency situation', 'condition mode', 'work mode', 'mode de travail', 'mode de condition', 'routine/non-routine', 'routine/non routine', 'rotina', 'não rotineira', 'situação de emergência'],
        frequency: ['frequency', 'frequency (f)', 'frequency f', 'fréquence', 'häufigkeit', 'sıklık', 'frecuencia', 'frequência', 'frequencia', 'freq', 'freq.'],
        severity: ['severity', 'severity (s)', 'severity s', 'gravité', 'schweregrad', 'şiddet', 'severidad', 'gravidade', 'severidade', 'sev', 'sev.'],
        likelihood: ['likelihood', 'likelihood (l)', 'likelihood l', 'probability', 'probability of occurrence', 'probability of happen', 'probabilité', 'wahrscheinlichkeit', 'olasılık', 'probabilidad', 'probabilidade', 'vraisemblance'],
        riskScore: ['risk score', 'score de risque', 'risikobewertung', 'risk skoru', 'puntuación', 'note de risque', 'score', 'initial risk', 'pontuação de risco', 'pontuação', 'risco inicial'],
        newControl: ['new control', 'nouveau contrôle', 'neue kontrolle', 'yeni kontrol', 'proposed', 'mesure proposée', 'action', 'novo controle', 'controle proposto'],
        hierarchy: ['hierarchy', 'hiérarchie', 'hierarchie', 'hiyerarşi', 'level', 'niveau', 'ladder', 'échelle', 'hierarquia', 'nível']
    }
};

// Check if sheet has RA 2025 structure (multi-language support)
function hasRA2025Structure(doc, strings) {
    const rows = doc.getElementsByTagName("row");
    let matchCount = 0;
    
    // Check up to 25 rows (wider scan covers templates with larger header zones)
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
        const cells = rows[r].getElementsByTagName("c");
        for (let c of cells) {
            const text = getCellTextRA2025(c, strings).toLowerCase().trim();
            if (!text) continue;
            
            // Check against all header keywords in all languages
            for (const category of Object.values(RA2025_KEYWORDS.headerKeywords)) {
                if (category.some(kw => text.includes(kw))) {
                    matchCount++;
                    if (matchCount >= 2) return true; // Need at least 2 matches for confidence
                }
            }
            
            // Also check column headers
            for (const category of Object.values(RA2025_KEYWORDS.columnKeywords)) {
                if (category.some(kw => text.includes(kw))) {
                    matchCount++;
                    if (matchCount >= 3) return true;
                }
            }
        }
    }
    return matchCount >= 2;
}

// Get cell text helper for RA 2025 parser
function getCellTextRA2025(cell, strings) {
    const type = cell.getAttribute("t");
    const vNode = cell.getElementsByTagName("v")[0];

    // Inline string (type="inlineStr") — value is in <is><t>...</t></is>
    if (type === "inlineStr") {
        const isNode = cell.getElementsByTagName("is")[0];
        if (!isNode) return '';
        let text = '';
        const tNodes = isNode.getElementsByTagName("t");
        for (let t of tNodes) text += t.textContent || '';
        return text;
    }

    if (!vNode) return '';

    if (type === "s") {
        const idx = parseInt(vNode.textContent, 10);
        return strings[idx] || '';
    }
    return vNode.textContent || '';
}

// Get cell value by column letter and row number
function getCellByRef(doc, colLetter, rowNum, strings) {
    const ref = colLetter + rowNum;
    const rows = doc.getElementsByTagName("row");
    
    for (let row of rows) {
        const r = row.getAttribute("r");
        if (parseInt(r) === rowNum) {
            const cells = row.getElementsByTagName("c");
            for (let cell of cells) {
                if (cell.getAttribute("r") === ref) {
                    return getCellTextRA2025(cell, strings);
                }
            }
        }
    }
    return '';
}

// Parse Zone A: Header Metadata (Context)
function parseZoneA(doc, strings) {
    // Based on template structure:
    // B2 = Plant, B3 = RA Reference, B4 = Department, B5 = Area/HPU, B6 = Work Station
    // Creation date around C11-C16 area
    
    const plant = getCellByRef(doc, 'B', 2, strings) || '';
    const raReference = getCellByRef(doc, 'B', 3, strings) || '';
    const department = getCellByRef(doc, 'B', 4, strings) || '';
    const area = getCellByRef(doc, 'B', 5, strings) || '';
    const workstation = getCellByRef(doc, 'B', 6, strings) || '';
    
    // Try to find creation date (search C column rows 10-16)
    let creationDate = '';
    for (let r = 10; r <= 16; r++) {
        const val = getCellByRef(doc, 'C', r, strings);
        if (val && (val.includes('-') || val.includes('/'))) {
            creationDate = val;
            break;
        }
    }
    
    // Format date if found
    if (!creationDate) {
        creationDate = new Date().toISOString().split('T')[0];
    }
    
    return {
        plant_id: plant,
        ra_reference: raReference,
        department_id: department,
        area_hpu: area,
        workstation_id: workstation,
        assessment_date: creationDate
    };
}

const RA2025_FREQUENCY_VALUES = [1, 1.25, 1.5, 1.75, 2];
const RA2025_SEVERITY_VALUES = [1, 3, 5, 7, 9, 10];
const RA2025_LIKELIHOOD_VALUES = [1, 3, 5, 8, 10];

const RA2025_FSL_KEYWORDS = {
    frequency: [
        { value: 2, keywords: ['permanent', 'continuous', 'constant', 'always', 'daily', 'every day', 'everyday', 'all day', 'permanent exposure', 'en permanence', 'toujours', 'surekli', 'dauerhaft', 'standig', 'stets', 'permanente', 'continuo', 'constante', 'diario', 'diaria', 'todos os dias'] },
        { value: 1.75, keywords: ['frequent', 'frequently', 'often', 'souvent', 'haeufig', 'sik', '1-3 days', '1 to 3 days', '1-3 days/wk', '1-3 day/wk', 'frequente', 'frecuente', 'frecuentemente'] },
        { value: 1.5, keywords: ['intermediate', 'intermediaire', 'intermittent', 'medium', 'middle', 'mittel', '2-8', '2 to 8', '2-8 hours', '2 to 8 hours', '2-8 hrs', '2 to 8 hrs', 'intermediario', 'intermitente'] },
        { value: 1.25, keywords: ['occasional', 'occasionally', 'occasion', 'occasionnel', 'occasionnelle', 'gelegentlich', 'ara sira', 'sometimes', 'sporadic', 'sporadically', 'ocasional', 'ocasionalmente'] },
        { value: 1, keywords: ['rarely', 'rare', 'seldom', 'infrequent', 'rarement', 'selten', 'nadiren', '<30 min', 'under 30 min', 'less than 30 min', 'raramente', 'raro', 'rara'] }
    ],
    severity: [
        { value: 10, keywords: ['fatality', 'fatal', 'death', 'deces', 'mortal', 'olum', 'totlich', 'potential of fatality', 'potential fatality', 'fatalidade', 'morte', 'potencial de fatalidade'] },
        { value: 9, keywords: ['sia', 'serious injury', 'serious incident', 'severe injury', 'blessure grave', 'schwere verletzung', 'ciddi yaralanma', 'potential of sia', 'lesao grave', 'lesion grave'] },
        { value: 7, keywords: ['dart', 'days away', 'restricted work', 'restricted duty', 'job transfer', 'lost time', 'arbeitseinschrankung', 'potential of dart', 'afastamento', 'restricao de trabalho'] },
        { value: 5, keywords: ['medical treatment', 'medical treat', 'traitement medical', 'medizinische behandlung', 'tibbi tedavi', 'recordable', 'potential of medical treatment', 'tratamento medico'] },
        { value: 3, keywords: ['first aid', 'premiers soins', 'erste hilfe', 'ilk yardim', 'potential of first aid', 'primeiros socorros', 'primeros auxilios'] },
        { value: 1, keywords: ['no injury', 'without injury', 'aucune blessure', 'keine verletzung', 'yaralanma yok', 'potential of no injury', 'no potential of injury', 'no potential injury', 'sem lesao', 'sin lesion'] }
    ],
    likelihood: [
        { value: 10, keywords: ['very likely', 'almost certain', 'certain', 'highly likely', 'very likely to happen', 'almost certain to happen', 'tres probable', 'sehr wahrscheinlich', 'cok olasi', 'muito provavel', 'quase certo'] },
        { value: 8, keywords: ['likely', 'probable', 'likely to happen', 'vraisemblable', 'wahrscheinlich', 'muhtemel', 'provavel'] },
        { value: 5, keywords: ['possible', 'possible to happen', 'might happen', 'can happen', 'could happen', 'peut arriver', 'moglich', 'olasi', 'possivel'] },
        { value: 3, keywords: ['very unlikely', 'very unlikely to happen', 'unlikely', 'improbable', 'sehr unwahrscheinlich', 'pek olasi degil', 'muito improvavel', 'improvavel'] },
        { value: 1, keywords: ['almost impossible', 'almost impossible to happen', 'impossible', 'very remote', 'extremely unlikely', 'quasi impossible', 'fast unmoglich', 'imkansiz', 'quase impossivel', 'impossivel'] }
    ]
};

function normalizeRA2025FuzzyText(value) {
    const fallback = String(value || '').toLowerCase();
    try {
        return fallback
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ı/g, 'i')
            .replace(/ß/g, 'ss')
            .replace(/æ/g, 'ae')
            .replace(/œ/g, 'oe')
            .replace(/[^a-z0-9.\-\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    } catch (_e) {
        return fallback.replace(/\s+/g, ' ').trim();
    }
}

function extractNumericFromMixedText(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const text = String(value).trim();
    if (!text) return null;
    const normalized = text.replace(/(\d),(\d)/g, '$1.$2');
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;

    const parsed = parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
}

function nearestScaleValue(inputValue, allowedValues, fallback) {
    if (!Number.isFinite(inputValue) || !Array.isArray(allowedValues) || allowedValues.length === 0) {
        return fallback;
    }

    let nearest = allowedValues[0];
    let minDiff = Math.abs(inputValue - nearest);
    for (let i = 1; i < allowedValues.length; i++) {
        const current = allowedValues[i];
        const diff = Math.abs(inputValue - current);
        if (diff < minDiff) {
            nearest = current;
            minDiff = diff;
        }
    }
    return nearest;
}

function escapeRegexText(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(normalizedText, keyword) {
    const needle = normalizeRA2025FuzzyText(keyword);
    if (!needle) return false;
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegexText(needle)}([^a-z0-9]|$)`);
    return pattern.test(normalizedText);
}

function matchScaleByKeywords(rawValue, table) {
    const normalized = normalizeRA2025FuzzyText(rawValue);
    if (!normalized) return null;

    for (const item of table) {
        if (!item || !Array.isArray(item.keywords)) continue;
        for (const keyword of item.keywords) {
            if (containsKeyword(normalized, keyword)) return item.value;
        }
    }
    return null;
}

// Returns null (not a guessed default) when the cell can't be read at all - callers
// decide the per-row fallback themselves, so one unparseable/merged-blank cell can't
// get cached as a fabricated "real" value and carried forward onto later rows.
function parseFrequencySmart(rawValue) {
    const keywordMatch = matchScaleByKeywords(rawValue, RA2025_FSL_KEYWORDS.frequency);
    if (Number.isFinite(keywordMatch)) return keywordMatch;

    const numeric = extractNumericFromMixedText(rawValue);
    if (Number.isFinite(numeric)) {
        return nearestScaleValue(numeric, RA2025_FREQUENCY_VALUES, 1);
    }

    return null;
}

function parseSeveritySmart(rawValue) {
    const keywordMatch = matchScaleByKeywords(rawValue, RA2025_FSL_KEYWORDS.severity);
    if (Number.isFinite(keywordMatch)) return keywordMatch;

    const numeric = extractNumericFromMixedText(rawValue);
    if (Number.isFinite(numeric)) {
        return nearestScaleValue(numeric, RA2025_SEVERITY_VALUES, 5);
    }

    return null;
}

function parseLikelihoodSmart(rawValue) {
    const keywordMatch = matchScaleByKeywords(rawValue, RA2025_FSL_KEYWORDS.likelihood);
    if (Number.isFinite(keywordMatch)) return keywordMatch;

    const numeric = extractNumericFromMixedText(rawValue);
    if (Number.isFinite(numeric)) {
        return nearestScaleValue(numeric, RA2025_LIKELIHOOD_VALUES, 3);
    }

    return null;
}

function parseRiskScoreSmart(rawValue) {
    const numeric = extractNumericFromMixedText(rawValue);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

window.RA2025SmartScaleParser = Object.freeze({
    parseFrequency: parseFrequencySmart,
    parseSeverity: parseSeveritySmart,
    parseLikelihood: parseLikelihoodSmart,
    parseRiskScore: parseRiskScoreSmart,
    normalizeText: normalizeRA2025FuzzyText
});

// Parse Zone B: Risk Line Items (Row 14 = headers, Row 15+ = data)
function parseZoneB(doc, strings, columnOverrides) {
    const riskItems = [];
    const rows = doc.getElementsByTagName("row");
    const lastScaleValues = {
        frequency: null,
        severity: null,
        likelihood: null
    };
    
    // First, detect column mapping from header row (typically row 14)
    const columnMap = detectRA2025Columns(doc, strings);
    console.log('Detected column mapping:', columnMap);
    
    // Merge manual overrides on top of auto-detected columns
    if (columnOverrides) {
        console.log('🗺️ Applying column overrides:', columnOverrides);
        for (const [key, val] of Object.entries(columnOverrides)) {
            if (key !== 'headerRow' && key !== 'dataStartRow' && key !== 'routineDefault' && val) {
                columnMap[key] = val;
            }
        }
        if (columnOverrides.headerRow) columnMap.headerRow = columnOverrides.headerRow;
    }
    
    // If we couldn't detect columns, use fallback defaults
    const cols = {
        taskId: columnMap.taskId || 'A',
        taskDesc: columnMap.taskDesc || 'B',
        hazardGroup: columnMap.hazardGroup || 'C',
        hazardDetail: columnMap.hazardDetail || 'D',
        consequence: columnMap.consequence || 'E',
        source: columnMap.source || 'G',
        currentControl: columnMap.currentControl || 'H',
        routine: columnMap.routine || '',
        frequency: columnMap.frequency || 'I',
        severity: columnMap.severity || 'K',
        likelihood: columnMap.likelihood || 'L',
        riskScore: columnMap.riskScore || 'M',
        newControl: columnMap.newControl || 'N',
        hierarchy: columnMap.hierarchy || 'O'
    };

    const routineDefault = parseGoehsConditionMode(
        (columnOverrides && columnOverrides.routineDefault) || 'Routine'
    );
    
    // Find data start row (row after header) — use override if provided
    const dataStartRow = (columnOverrides && columnOverrides.dataStartRow) ? columnOverrides.dataStartRow : (columnMap.headerRow || 14) + 1;
    
    for (let row of rows) {
        const rowNum = parseInt(row.getAttribute("r"));
        
        // Skip header rows
        if (rowNum < dataStartRow) continue;
        
        // Get cell values for this row
        const cells = row.getElementsByTagName("c");
        const rowData = {};
        
        for (let cell of cells) {
            const ref = cell.getAttribute("r") || '';
            const colMatch = ref.match(/^([A-Z]+)/);
            if (colMatch) {
                rowData[colMatch[1]] = getCellTextRA2025(cell, strings);
            }
        }
        
        // Stop condition: Column A contains "Total" or "Insert rows" (end of data section)
        const colA = (rowData[cols.taskId] || '').toLowerCase().trim();
        if (colA.includes('total') || colA.includes('insert row') || colA.includes('somme') || colA.includes('gesamt') || colA.includes('toplam')) {
            break;
        }
        
        // Extract risk item data using detected columns
        const taskDesc = rowData[cols.taskDesc] || '';
        const hazardGroup = rowData[cols.hazardGroup] || '';
        const hazardDetail = rowData[cols.hazardDetail] || '';
        
        // Skip truly empty rows (no task description AND no hazard info)
        if (!taskDesc && !hazardGroup && !hazardDetail) continue;
        
        const consequence = rowData[cols.consequence] || '';
        const source = rowData[cols.source] || '';
        const currentControls = rowData[cols.currentControl] || '';
        const rawRoutineMode = cols.routine ? rowData[cols.routine] : '';
        const routineType = rawRoutineMode ? parseGoehsConditionMode(rawRoutineMode) : routineDefault;

        const rawFrequency = rowData[cols.frequency];
        const rawSeverity = rowData[cols.severity];
        const rawLikelihood = rowData[cols.likelihood];

        const isFrequencyBlank = String(rawFrequency ?? '').trim() === '';
        const isSeverityBlank = String(rawSeverity ?? '').trim() === '';
        const isLikelihoodBlank = String(rawLikelihood ?? '').trim() === '';

        let frequency = parseFrequencySmart(rawFrequency);
        let severity = parseSeveritySmart(rawSeverity);
        let likelihood = parseLikelihoodSmart(rawLikelihood);

        if (isFrequencyBlank && Number.isFinite(lastScaleValues.frequency)) {
            frequency = lastScaleValues.frequency;
        } else if (Number.isFinite(frequency)) {
            lastScaleValues.frequency = frequency;
        }

        if (isSeverityBlank && Number.isFinite(lastScaleValues.severity)) {
            severity = lastScaleValues.severity;
        } else if (Number.isFinite(severity)) {
            lastScaleValues.severity = severity;
        }

        if (isLikelihoodBlank && Number.isFinite(lastScaleValues.likelihood)) {
            likelihood = lastScaleValues.likelihood;
        } else if (Number.isFinite(likelihood)) {
            lastScaleValues.likelihood = likelihood;
        }

        // Per-row fallback only (not cached above) - a row with no real/carried value
        // still needs a valid scale number, but it must not contaminate lastScaleValues
        // for the merged-cell rows that follow it. Track which fields actually hit this
        // fallback so the UI can flag them instead of showing a silent, indistinguishable "1".
        const frequencyUnverified = !Number.isFinite(frequency);
        const severityUnverified = !Number.isFinite(severity);
        const likelihoodUnverified = !Number.isFinite(likelihood);
        if (frequencyUnverified) frequency = 1;
        if (severityUnverified) severity = 5;
        if (likelihoodUnverified) likelihood = 3;

        const parsedRiskScore = parseRiskScoreSmart(rowData[cols.riskScore]);
        const riskScore = Number.isFinite(parsedRiskScore) ? parsedRiskScore : (frequency * severity * likelihood);
        const newControl = rowData[cols.newControl] || '';
        const hierarchyLevel = rowData[cols.hierarchy] || '';
        
        // Determine risk level
        let riskLevel = 'LOW';
        if (riskScore >= 50) riskLevel = 'HIGH';
        else if (riskScore >= 20) riskLevel = 'MEDIUM';
        
        riskItems.push({
            row_index: rowNum,
            task_name: taskDesc,
            routine_type: routineType,
            hazard_classification: {
                group: hazardGroup,
                type: hazardDetail
            },
            risk_scenario: {
                source: source,
                consequence: consequence
            },
            assessment_pre_control: {
                frequency: frequency,
                severity: severity,
                likelihood: likelihood,
                calculated_score: riskScore,
                risk_level: riskLevel,
                frequency_unverified: frequencyUnverified,
                severity_unverified: severityUnverified,
                likelihood_unverified: likelihoodUnverified
            },
            mitigation_plan: {
                current_controls: currentControls,
                proposed_controls: newControl,
                control_hierarchy: hierarchyLevel
            }
        });
    }

    return riskItems;
}

// Detect column letters from header row (multi-language)
function scoreRA2025HeaderKeyword(normalizedText, keyword) {
    const needle = normalizeRA2025FuzzyText(keyword);
    if (!needle) return 0;

    const boundaryPattern = new RegExp(`(^|[^a-z0-9])${escapeRegexText(needle)}([^a-z0-9]|$)`);
    if (normalizedText === needle) return 6;
    if (boundaryPattern.test(normalizedText)) {
        if (needle.length <= 2) return 1;
        if (needle.length <= 4) return 2;
        return 4;
    }

    // Allow a weak fallback only for longer keywords.
    if (needle.length >= 6 && normalizedText.includes(needle)) {
        return 1;
    }

    return 0;
}

function scoreRA2025HeaderField(normalizedText, field) {
    const keywords = RA2025_KEYWORDS.columnKeywords[field] || [];
    let bestScore = 0;
    for (const keyword of keywords) {
        const score = scoreRA2025HeaderKeyword(normalizedText, keyword);
        if (score > bestScore) {
            bestScore = score;
        }
    }
    return bestScore;
}

function findRA2025ColumnByKeywords(rows, strings, keywords, preferredHeaderRow) {
    if (!Array.isArray(keywords) || keywords.length === 0) return '';

    let best = null;

    const scanRange = (startRow, endRow, bonus) => {
        for (const row of rows) {
            const rowNum = parseInt(row.getAttribute("r"), 10);
            if (!Number.isFinite(rowNum) || rowNum < startRow || rowNum > endRow) continue;

            const cells = row.getElementsByTagName("c");
            for (const cell of cells) {
                const ref = cell.getAttribute("r") || '';
                const colMatch = ref.match(/^([A-Z]+)/);
                if (!colMatch) continue;

                const text = getCellTextRA2025(cell, strings);
                const normalizedText = normalizeRA2025FuzzyText(text);
                if (!normalizedText) continue;

                let baseScore = 0;
                for (const keyword of keywords) {
                    const score = scoreRA2025HeaderKeyword(normalizedText, keyword);
                    if (score > baseScore) {
                        baseScore = score;
                    }
                }

                if (baseScore <= 0) continue;
                const weightedScore = baseScore + bonus;
                const distance = Math.abs(rowNum - preferredHeaderRow);

                if (!best || weightedScore > best.score || (weightedScore === best.score && distance < best.distance)) {
                    best = {
                        col: colMatch[1],
                        score: weightedScore,
                        distance: distance
                    };
                }
            }
        }
    };

    const nearStart = Math.max(5, preferredHeaderRow - 3);
    const nearEnd = preferredHeaderRow + 3;
    scanRange(nearStart, nearEnd, 2);
    if (!best) {
        scanRange(5, 60, 0);
    }

    return best ? best.col : '';
}

// Detect column letters from header row (multi-language)
function detectRA2025Columns(doc, strings) {
    const rows = doc.getElementsByTagName("row");
    const mapping = {};
    let headerRow = 14; // Default

    // Language-specific keyword sets for detection scoring
    const LANG_KEYWORDS = {
        fr: ['tâche', 'description de la tâche', 'groupe de danger', 'groupe de risque', 'détail du risque', 'liste des dangers', 'conséquence', 'contrôle actuel', 'fréquence', 'gravité', 'probabilité', 'score de risque', 'hiérarchie', 'mesure', 'risque', 'blessure', 'étape', 'département', 'usine', 'poste de travail', 'routine', 'non-routine', 'situation d urgence'],
        de: ['beschreibung', 'aufgabe', 'gefahrengruppe', 'gefahrendetail', 'gefahrenliste', 'konsequenz', 'kontrolle', 'häufigkeit', 'schweregrad', 'wahrscheinlichkeit', 'risikobewertung', 'hierarchie', 'maßnahme', 'verletzung', 'arbeitsschritt', 'abteilung', 'werk', 'arbeitsplatz', 'routine', 'nicht-routine', 'notfall'],
        en: ['task description', 'hazard group', 'hazard detail', 'consequence', 'current control', 'frequency', 'severity', 'likelihood', 'risk score', 'hierarchy', 'injury', 'department', 'plant', 'workstation', 'routine', 'non-routine', 'emergency situation']
    };
    const langScores = { en: 0, fr: 0, de: 0 };

    const orderedFields = ['riskScore', 'taskId', 'taskDesc', 'hazardGroup', 'hazardDetail', 'consequence', 'source', 'currentControl', 'routine', 'frequency', 'severity', 'likelihood', 'newControl', 'hierarchy'];

    let bestCandidate = {
        rowNum: headerRow,
        score: -1,
        fieldMatches: {}
    };

    // Search rows 5-50 and score each row as a potential header row.
    for (const row of rows) {
        const rowNum = parseInt(row.getAttribute("r"), 10);
        if (!Number.isFinite(rowNum) || rowNum < 5 || rowNum > 50) continue;

        const cells = row.getElementsByTagName("c");
        const fieldMatches = {};

        for (const cell of cells) {
            const ref = cell.getAttribute("r") || '';
            const colMatch = ref.match(/^([A-Z]+)/);
            if (!colMatch) continue;

            const colLetter = colMatch[1];
            const rawText = getCellTextRA2025(cell, strings);
            const normalizedText = normalizeRA2025FuzzyText(rawText);
            if (!normalizedText) continue;

            // Score language matches for auto-detection.
            for (const [lang, kws] of Object.entries(LANG_KEYWORDS)) {
                for (const kw of kws) {
                    if (normalizedText.includes(normalizeRA2025FuzzyText(kw))) {
                        langScores[lang]++;
                    }
                }
            }

            // Detect the best field candidate for this cell.
            let bestField = '';
            let bestFieldScore = 0;
            for (const field of orderedFields) {
                const fieldScore = scoreRA2025HeaderField(normalizedText, field);
                if (fieldScore > bestFieldScore) {
                    bestField = field;
                    bestFieldScore = fieldScore;
                }
            }

            if (!bestField || bestFieldScore <= 0) continue;
            if (!fieldMatches[bestField] || bestFieldScore > fieldMatches[bestField].score) {
                fieldMatches[bestField] = {
                    col: colLetter,
                    score: bestFieldScore
                };
            }
        }

        const matchedFields = Object.keys(fieldMatches);
        if (matchedFields.length < 2) continue;

        const rowBaseScore = matchedFields.reduce((sum, field) => sum + (fieldMatches[field].score || 0), 0);
        const hasTaskDesc = !!fieldMatches.taskDesc;
        const fslMatches = ['frequency', 'severity', 'likelihood'].reduce((count, field) => count + (fieldMatches[field] ? 1 : 0), 0);
        const rowScore = rowBaseScore
            + matchedFields.length
            + (hasTaskDesc ? 4 : 0)
            + (fslMatches * 3)
            + (fslMatches === 3 ? 6 : 0);

        if (rowScore > bestCandidate.score) {
            bestCandidate = {
                rowNum: rowNum,
                score: rowScore,
                fieldMatches: fieldMatches
            };
        }
    }

    if (bestCandidate.score > 0) {
        Object.keys(bestCandidate.fieldMatches).forEach(field => {
            mapping[field] = bestCandidate.fieldMatches[field].col;
        });
        headerRow = bestCandidate.rowNum;
        mapping.headerRow = headerRow;
        console.log(`📊 RA2025 Column Detection - Best header row ${headerRow}:`, mapping);
    } else {
        mapping.headerRow = headerRow;
    }

    // Ensure core risk-scale columns are found using explicit keyword search.
    // This directly addresses templates where F/S/L labels are formatted differently.
    const criticalScaleFields = ['frequency', 'severity', 'likelihood'];
    for (const field of criticalScaleFields) {
        if (mapping[field]) continue;
        const fallbackCol = findRA2025ColumnByKeywords(rows, strings, RA2025_KEYWORDS.columnKeywords[field], headerRow);
        if (fallbackCol) {
            mapping[field] = fallbackCol;
        }
    }

    // Also scan header area (rows 1-10) for language clues.
    for (const row of rows) {
        const rowNum = parseInt(row.getAttribute("r"), 10);
        if (!Number.isFinite(rowNum) || rowNum > 10) break;

        const cells = row.getElementsByTagName("c");
        for (const cell of cells) {
            const rawText = getCellTextRA2025(cell, strings);
            const normalizedText = normalizeRA2025FuzzyText(rawText);
            if (!normalizedText) continue;

            for (const [lang, kws] of Object.entries(LANG_KEYWORDS)) {
                for (const kw of kws) {
                    if (normalizedText.includes(normalizeRA2025FuzzyText(kw))) {
                        langScores[lang]++;
                    }
                }
            }
        }
    }

    // Determine detected language (only FR/DE if clearly dominant, otherwise EN)
    const maxLang = Object.entries(langScores).sort((a, b) => b[1] - a[1])[0];
    if (maxLang[1] > 0 && maxLang[0] !== 'en' && maxLang[1] >= langScores.en + 2) {
        mapping.detectedLang = maxLang[0];
    } else if (maxLang[0] === 'en' || (langScores.en >= langScores.fr && langScores.en >= langScores.de)) {
        mapping.detectedLang = 'en';
    } else {
        mapping.detectedLang = maxLang[0];
    }

    console.log(`🌐 Language detection scores:`, langScores, `→ ${mapping.detectedLang}`);
    console.log('🧭 Final RA2025 auto-mapping:', mapping);

    return mapping;
}

// Setup drag and drop for Direct GOEHS upload
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('directGoehsDropZone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-orange-500', 'bg-orange-100');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-orange-500', 'bg-orange-100');
            }, false);
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    handleDirectGoehsUpload({ target: { files: [file] } });
                } else {
                    showDirectGoehsAlert('❌ Please drop an Excel file (.xlsx or .xls)', 'error');
                }
            }
        }, false);
    }
});

// ============ DATA STRUCTURES ============

// Organization > Location > Department/Workstation hierarchy
const GOEHS_LOCATION_DATA = {
    'Mfg - EMEA': {
        name: 'Mfg - EMEA',
        locations: {
            'Adapazari': {
                name: 'Adapazari',
                departments: ['Production', 'Maintenance', 'Quality', 'Logistics'],
                workstations: ['Line 1', 'Line 2', 'Maintenance', 'Quality Testing']
            },
            'Amiens': {
                name: 'Amiens',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production Line', 'Maintenance', 'Quality']
            },
            'Dębica': {
                name: 'Dębica',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Fulda': {
                name: 'Fulda',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Furstenwalde': {
                name: 'Furstenwalde',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Goodyear Mounting Solutions': {
                name: 'Goodyear Mounting Solutions',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Mounting', 'Assembly', 'QA']
            },
            'Hanau': {
                name: 'Hanau',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Izmit': {
                name: 'Izmit',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Kranj': {
                name: 'Kranj',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Kruševac': {
                name: 'Kruševac',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Luxembourg Tire Plant': {
                name: 'Luxembourg Tire Plant',
                departments: ['Production', 'Maintenance', 'Quality', 'Engineering'],
                workstations: ['Building', 'Curing', 'Finishing', 'Quality Testing']
            },
            'Lux-Mold Plant RCCE': {
                name: 'Lux-Mold Plant RCCE',
                departments: ['Production', 'Maintenance', 'Quality', 'Logistics', 'Engineering', 'Warehouse'],
                workstations: ['Assembly Line A', 'Assembly Line B', 'Tire Curing', 'Quality Testing', 'Extrusion', 'Mixing']
            },
            'Mercury Dudelange': {
                name: 'Mercury Dudelange',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Montlucon': {
                name: 'Montlucon',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Riesa': {
                name: 'Riesa',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Riom': {
                name: 'Riom',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Tilburg': {
                name: 'Tilburg',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Uitenhage': {
                name: 'Uitenhage',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            },
            'Wittlich': {
                name: 'Wittlich',
                departments: ['Production', 'Maintenance', 'Quality'],
                workstations: ['Production', 'Maintenance', 'Quality']
            }
        }
    },
    'Mfg - NA': {
        name: 'Mfg - NA',
        locations: {
            'Akron Plant': {
                name: 'Akron Plant',
                departments: ['Production', 'Maintenance', 'R&D', 'Logistics'],
                workstations: ['Test Lab', 'Development', 'Prototype Assembly']
            },
            'Fayetteville Plant': {
                name: 'Fayetteville Plant',
                departments: ['Production', 'Maintenance', 'Warehouse'],
                workstations: ['Extrusion', 'Building', 'Curing', 'Finishing']
            }
        }
    },
    'Mfg - APAC': {
        name: 'Mfg - APAC',
        locations: {
            'Shanghai Plant': {
                name: 'Shanghai Plant',
                departments: ['Production', 'Logistics'],
                workstations: ['Main Production', 'Distribution']
            }
        }
    }
};

// Global API Endpoint for GOEHS AI Assist (accessible outside IIFE)
const GOEHS_GLOBAL_API_ENDPOINT = 'https://risk-assessment-api-nine.vercel.app/api/ai';

// Condition Mode options
const CONDITION_MODES = ['Routine', 'Non-Routine', 'Emergency Situation'];

// Core Activity options (74 activities)
const CORE_ACTIVITIES = [
    'Acting/Performing', 'Asbestos Removal', 'Assembly Operations', 'Bladder Building', 'Blasting',
    'Blending', 'Brazing', 'Business Meetings/Event/Travel', 'Cafeteria Operations', 'Calendering',
    'Chemical Production Operations', 'Cleaning Operations', 'Component Prep', 'Compounding',
    'Confined Space Operations', 'Construction', 'Customer Assistance', 'Cutting Operations',
    'Demolition', 'Disassembly Operations', 'Engraving', 'Equipment De-installation',
    'Equipment Installation', 'Equipment Operation', 'Extrusion', 'Finishing', 'Flight Operations',
    'Forming', 'Foundry', 'Groundskeeping', 'Housekeeping', 'Inspecting', 'Laboratory Operations',
    'Lifting', 'Loading/Unloading', 'Machining', 'Maintenance', 'Material Handling', 'Mixing',
    'Modeling', 'Non-Specific Site Activity', 'Office Work', 'Open Road Testing', 'Packaging',
    'Plating', 'Press Operations', 'Repair', 'Resident Assistance', 'Roadside Fitment',
    'Security/Emergency Response Operations', 'Shipping/Receiving', 'Studio Operations',
    'Stunt Operation', 'Surface Cleaning', 'Surface Coating', 'Testing', 'Training',
    'Vehicle Operations', 'Waste Management', 'Welding', 'Woodworking'
].sort();

// Job Titles (72 titles)
const JOB_TITLES = [
    'Apprentice', 'Assembler', 'Bladder Builder', 'Broadcast Technician', 'Buyer',
    'Calender Operator', 'Chemical Process Operator', 'Compounder', 'Contractor',
    'Co-op or intern', 'Coordinator', 'Crane operator', 'Cribkeeper', 'Curing Technician',
    'Cutter Technician', 'Dispatcher', 'Doctor', 'Electrician', 'Emergency spill responder',
    'Engineer', 'Extruder Technician', 'Fabric Machine Operator', 'Fabricator', 'Facilities',
    'Final Finish Technician', 'Firefighter', 'Fork truck operator', 'Founder', 'Ground Crew',
    'Groundskeeper', 'Group Leader', 'Guard', 'Inspector', 'Janitor', 'Lab Technician',
    'Labor Trainer', 'Machinist', 'Maintenance', 'Manager', 'Material handler', 'Mechanic',
    'Mill Operator', 'Mixer Operator', 'Nurse', 'Office worker-other', 'Operator',
    'Pigment Weighing Operator', 'Pilot', 'Pipefitter', 'Plumber', 'Press operator',
    'Quality Technician', 'Repairman', 'Replacement Operator', 'Research Scientist',
    'Retread Technician', 'Sales person', 'Security', 'Service Tech', 'Shipping & Receiving',
    'Storeroom Clerk', 'Support Technician', 'Team Leader', 'Technician', 'Test Driver',
    'Tester', 'Tire Builder', 'Tire Fitment', 'Tool & die maker', 'Truck driver', 'Welder',
    'Wire Drawer'
].sort();

// ── Registry aliases ─────────────────────────────────────────────────────────
// All data now lives in ra-registry.js (loaded before this script).
// ra-registry.js declares these as top-level const AND exposes them on window.*
// Do NOT redeclare with const here — that causes SyntaxError: already declared.
// They are directly accessible by name from the global lexical environment.

// Returns the translated display label for a GOEHS dropdown value.
// value attribute stays English; only visible text is translated.
function normalizeGoehsTranslationKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(token => (token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token))
        .join(' ');
}

function goehsUiLabel(val) {
    if (!val) return val;
    const lang = localStorage.getItem('appLanguage') || 'en';
    if (lang === 'en') return val;
    if (GOEHS_LADDER_TRANSLATIONS[lang]?.[val]) return GOEHS_LADDER_TRANSLATIONS[lang][val];

    const langMap = window.TRANSLATIONS?.[lang];
    if (!langMap) return val;

    if (langMap[val]) return langMap[val];

    // Fallback 1: case-insensitive key lookup
    const valueLower = String(val).toLowerCase();
    for (const [key, translated] of Object.entries(langMap)) {
        if (key.toLowerCase() === valueLower) return translated;
    }

    // Fallback 2: normalized lookup (handles punctuation/plural/casing drift)
    const normalizedValue = normalizeGoehsTranslationKey(val);
    for (const [key, translated] of Object.entries(langMap)) {
        if (normalizeGoehsTranslationKey(key) === normalizedValue) return translated;
    }

    return val;
}

// ============================================================
// GOEHS hazard-category/sub-hazard dropdown language - deliberately independent from
// the appLanguage used by goehsUiLabel() above for everything else in this modal (ladder
// levels, outcomes, general chrome), since only Hazard Category/Sub-Hazard translations
// exist for the newer languages (es/pl/pt/sl/tr/zh/th). Defaults to whatever the main
// table's own hazard-dropdown language is already set to, since GOEHS hazards are
// populated FROM the main table and are usually already in that same language.
// ============================================================
let goehsHazardDropdownLang = localStorage.getItem('goehsHazardDropdownLang')
    || localStorage.getItem('hazardDropdownLang') || 'en';
// Once the user picks a language directly in this modal, stop auto-inheriting from the
// main table for the rest of the session - their explicit choice here should stick.
let goehsHazardDropdownLangManual = false;
function goehsHazardLabel(englishKey, lang) {
    if (!englishKey) return englishKey;
    const l = lang || goehsHazardDropdownLang;
    if (l === 'en') return englishKey;
    const langMap = window.TRANSLATIONS?.[l];
    if (!langMap) return englishKey;
    return langMap[englishKey] || englishKey;
}
function relabelGoehsHazardSelect(sel, lang) {
    if (!sel) return;
    Array.from(sel.options).forEach(opt => {
        if (opt.value) opt.textContent = goehsHazardLabel(opt.value, lang);
    });
}
function relabelGoehsHazardDropdownsInLanguage(lang) {
    document.querySelectorAll('#hazardTableBody .hazard-category').forEach(sel => relabelGoehsHazardSelect(sel, lang));
    document.querySelectorAll('#hazardTableBody .hazard-sub').forEach(sel => relabelGoehsHazardSelect(sel, lang));
}
window.relabelGoehsHazardDropdownsInLanguage = relabelGoehsHazardDropdownsInLanguage;
window.goehsHazardLabel = goehsHazardLabel;

const GOEHS_CONDITION_MODES = ['Routine', 'Non-Routine', 'Emergency Situation'];

function parseGoehsConditionMode(rawValue) {
    const value = (rawValue || '').toString().trim();
    if (!value) return 'Routine';
    const lower = value.toLowerCase();
    if (lower.includes('emergency')) return 'Emergency Situation';
    if (lower.includes('non-routine') || lower.includes('non routine')) return 'Non-Routine';
    if (lower.includes('routine')) return 'Routine';
    return 'Routine';
}

function formatDateForGoehsExport(inputValue) {
    const value = (inputValue || '').toString().trim();
    if (!value) return '';

    // If already in DD-MMM-YYYY, keep as-is.
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(value)) return value;

    // Date input format from browser is YYYY-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (month >= 1 && month <= 12) {
            return `${String(day).padStart(2, '0')}-${months[month - 1]}-${year}`;
        }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatGoehsDate(parsed);
}

function getGoehsTypeValue() {
    return document.getElementById('goehsType')?.value || 'Safety';
}

function buildGoehsTaskLookup() {
    const taskLookup = {};

    const addTask = (taskName, values = {}) => {
        const name = (taskName || '').toString().trim();
        if (!name) return;

        const existing = taskLookup[name] || {
            taskName: name,
            taskDescription: '',
            conditionMode: 'Routine',
            coreActivity: '',
            jobTitle: ''
        };

        if (!existing.taskDescription && values.taskDescription) existing.taskDescription = values.taskDescription;
        if ((!existing.conditionMode || existing.conditionMode === 'Routine') && values.conditionMode) {
            existing.conditionMode = values.conditionMode;
        }
        if (!existing.coreActivity && values.coreActivity) existing.coreActivity = values.coreActivity;
        if (!existing.jobTitle && values.jobTitle) existing.jobTitle = values.jobTitle;

        taskLookup[name] = existing;
    };

    if (window.goehsTableData && Array.isArray(window.goehsTableData.tasks)) {
        window.goehsTableData.tasks.forEach(task => {
            addTask(task?.name, {
                taskDescription: task?.description || task?.name || ''
            });
        });
    }

    if (window.goehsTableData && Array.isArray(window.goehsTableData.hazards)) {
        window.goehsTableData.hazards.forEach(hazard => {
            addTask(hazard?.stepName, {
                conditionMode: parseGoehsConditionMode(hazard?.routineType)
            });
        });
    }

    return taskLookup;
}

function getTaskMetaForName(taskName) {
    const taskLookup = buildGoehsTaskLookup();
    const name = (taskName || '').toString().trim();
    return taskLookup[name] || {
        taskName: name,
        taskDescription: name,
        conditionMode: 'Routine',
        coreActivity: '',
        jobTitle: ''
    };
}
// State Management
let goehsTasks = [];
let goehsHazards = [];
let taskIdCounter = 0;
let hazardIdCounter = 0;
const GOEHS_FINAL_REVIEW_STATE = {
    issueObserver: null,
    issueHooksBound: false,
    issueRefreshScheduled: false
};

const GOEHS_MODE_OPTIONS = ['Routine', 'Non-Routine', 'Emergency Situation'];

function normalizeGoehsConditionMode(mode) {
    const raw = (mode || '').toString().trim().toLowerCase();
    if (!raw) return 'Routine';
    if (raw.includes('non')) return 'Non-Routine';
    if (raw.includes('emerg')) return 'Emergency Situation';
    if (raw.includes('routine')) return 'Routine';
    return 'Routine';
}

function getGoehsOutcomeRegistry() {
    if (Array.isArray(window.CONSEQUENCE_REGISTRY) && window.CONSEQUENCE_REGISTRY.length > 0) {
        return window.CONSEQUENCE_REGISTRY;
    }
    return ['Laceration, Cut, Open wound'];
}

function renderGoehsOutcomeOptions(selectedOutcome = '') {
    const selected = window.reverseTranslate ? (window.reverseTranslate(selectedOutcome) || selectedOutcome) : selectedOutcome;
    return getGoehsOutcomeRegistry().map(outcome =>
        `<option value="${escapeHtml(outcome)}" ${outcome === selected ? 'selected' : ''}>${escapeHtml(goehsUiLabel(outcome))}</option>`
    ).join('');
}

function renderGoehsModeOptions(selectedMode = 'Routine') {
    const normalized = normalizeGoehsConditionMode(selectedMode);
    return GOEHS_MODE_OPTIONS.map(mode =>
        `<option value="${mode}" ${mode === normalized ? 'selected' : ''}>${goehsUiLabel(mode)}</option>`
    ).join('');
}

function toGoehsDateString(value) {
    const raw = (value || '').toString().trim();
    if (!raw) return '';
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-').map(Number);
        return formatGoehsDate(new Date(year, month - 1, day));
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return formatGoehsDate(parsed);
    }
    return raw;
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isHazardTableRowDeleted(row) {
    return !!row && row.dataset.deleted === 'true';
}

function getActiveHazardTableRows() {
    return Array.from(document.querySelectorAll('.hazard-table-row')).filter(row => !isHazardTableRowDeleted(row));
}

function getGoehsFinalReviewIssueStats() {
    const scope = document.getElementById('goehs-tool3');
    if (!scope) {
        return {
            total: 0,
            mismatch: 0,
            emptyRequired: 0
        };
    }

    const mismatchElements = new Set();
    const emptyRequiredElements = new Set();

    scope.querySelectorAll('.goehs-mismatch').forEach(el => {
        const row = el.closest('tr');
        if (row && row.dataset.deleted === 'true') return;
        mismatchElements.add(el);
    });

    scope.querySelectorAll('.goehs-empty-required').forEach(el => {
        const row = el.closest('tr');
        if (row && row.dataset.deleted === 'true') return;
        emptyRequiredElements.add(el);
    });

    const uniqueIssues = new Set([
        ...mismatchElements,
        ...emptyRequiredElements
    ]);

    return {
        total: uniqueIssues.size,
        mismatch: mismatchElements.size,
        emptyRequired: emptyRequiredElements.size
    };
}

function countGoehsFinalReviewIssues() {
    return getGoehsFinalReviewIssueStats().total;
}

function scheduleGoehsIssueCounterRefresh() {
    if (GOEHS_FINAL_REVIEW_STATE.issueRefreshScheduled) return;
    GOEHS_FINAL_REVIEW_STATE.issueRefreshScheduled = true;

    const flush = () => {
        GOEHS_FINAL_REVIEW_STATE.issueRefreshScheduled = false;
        updateGoehsIssueCounter();
    };

    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flush);
    } else {
        setTimeout(flush, 0);
    }
}

function updateGoehsIssueCounter() {
    const counterEl = document.getElementById('goehsIssueCounter');
    if (!counterEl) return;

    const issueStats = getGoehsFinalReviewIssueStats();
    counterEl.textContent = `Issues: ${issueStats.total}`;
    counterEl.classList.toggle('has-issues', issueStats.total > 0);

    if (issueStats.total > 0) {
        counterEl.title = `Final Review unresolved issues\nMissing required fields: ${issueStats.emptyRequired}\nValidation mismatches: ${issueStats.mismatch}\nDeleted rows are excluded.`;
        counterEl.setAttribute('aria-label', `Issues ${issueStats.total}. Missing required fields ${issueStats.emptyRequired}. Validation mismatches ${issueStats.mismatch}.`);
    } else {
        counterEl.title = 'No unresolved issues in Final Review. Deleted rows are excluded.';
        counterEl.setAttribute('aria-label', 'No unresolved issues in Final Review.');
    }

    const downloadBtn = document.getElementById('goehsDownloadXlsxBtn');
    if (downloadBtn) {
        const hasIssues = issueStats.total > 0;
        downloadBtn.disabled = hasIssues;
        if (hasIssues) {
            downloadBtn.title = `Fix ${issueStats.total} unresolved issue(s) before downloading GOEHS file.`;
            downloadBtn.classList.add('opacity-60', 'cursor-not-allowed');
            downloadBtn.setAttribute('aria-disabled', 'true');
        } else {
            downloadBtn.title = 'Download GOEHS Batch Upload XLSX';
            downloadBtn.classList.remove('opacity-60', 'cursor-not-allowed');
            downloadBtn.removeAttribute('aria-disabled');
        }
    }
}

function initGoehsIssueCounterHooks() {
    const scope = document.getElementById('goehs-tool3');
    if (!scope) return;

    if (!GOEHS_FINAL_REVIEW_STATE.issueHooksBound) {
        const refreshCounter = () => scheduleGoehsIssueCounterRefresh();
        scope.addEventListener('input', refreshCounter, true);
        scope.addEventListener('change', refreshCounter, true);
        scope.addEventListener('click', () => setTimeout(refreshCounter, 0), true);
        GOEHS_FINAL_REVIEW_STATE.issueHooksBound = true;
    }

    if (GOEHS_FINAL_REVIEW_STATE.issueObserver) {
        GOEHS_FINAL_REVIEW_STATE.issueObserver.disconnect();
    }

    GOEHS_FINAL_REVIEW_STATE.issueObserver = new MutationObserver(() => scheduleGoehsIssueCounterRefresh());
    GOEHS_FINAL_REVIEW_STATE.issueObserver.observe(scope, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'data-deleted']
    });

    scheduleGoehsIssueCounterRefresh();
}

function setMainTableRowDeletedState(sourceRowIndex, isDeleted) {
    const row = document.querySelector(`#table-container tr[data-row-index="${sourceRowIndex}"]`);
    if (!row) return;

    row.classList.toggle('deleted-row', !!isDeleted);
    row.dataset.deleted = isDeleted ? 'true' : 'false';

    const deleteBtn = row.querySelector('button[onclick*="toggleRowDelete"]');
    if (deleteBtn) {
        if (typeof window.applyTaskDeleteRestoreButtonState === 'function') {
            window.applyTaskDeleteRestoreButtonState(deleteBtn, !!isDeleted, { modal: false });
        } else {
            deleteBtn.textContent = isDeleted ? 'Restore' : '🗑';
            deleteBtn.className = isDeleted ? 'restore-btn' : 'delete-btn';
            deleteBtn.title = isDeleted ? 'Restore row' : 'Delete row';
        }
    }

    row.querySelectorAll('select, input, textarea, button').forEach(control => {
        if (control === deleteBtn) return;
        control.disabled = !!isDeleted;
        control.style.opacity = isDeleted ? '0.6' : '';
        control.style.pointerEvents = isDeleted ? 'none' : '';
    });
}

function syncMainTableRowStateToGoehs(sourceRowIndex, isDeleted) {
    if (sourceRowIndex === null || sourceRowIndex === undefined || Number.isNaN(Number(sourceRowIndex))) return;

    const selector = `#hazardTableBody tr[data-source-row-index="${sourceRowIndex}"]`;
    const matchedRows = document.querySelectorAll(selector);
    matchedRows.forEach(row => setHazardTableRowDeletedState(row, !!isDeleted));

    updateHazardCount();
    updateGoehsIssueCounter();
}

window.syncMainTableRowStateToGoehs = syncMainTableRowStateToGoehs;

function renderHazardTableRowActionIcon(isDeleted) {
    if (isDeleted) {
        return '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
}

function setHazardTableRowDeletedState(row, isDeleted, options = {}) {
    if (!row) return;

    row.dataset.deleted = isDeleted ? 'true' : 'false';
    row.classList.toggle('goehs-row-deleted', isDeleted);
    row.classList.toggle('hover:bg-slate-50', !isDeleted);

    const actionButton = row.querySelector('.goehs-row-delete-btn');

    if (actionButton) {
        actionButton.classList.toggle('goehs-btn-icon-danger', !isDeleted);
        actionButton.classList.toggle('goehs-btn-icon-restore', isDeleted);
        actionButton.title = isDeleted ? 'Restore row' : 'Delete row';
        actionButton.setAttribute('aria-label', isDeleted ? 'Restore row' : 'Delete row');
        actionButton.innerHTML = renderHazardTableRowActionIcon(isDeleted);
    }

    row.querySelectorAll('input, select, textarea, button').forEach(el => {
        if (el === actionButton) return;
        el.disabled = !!isDeleted;
    });

    if (!options.suppressCounterRefresh) {
        scheduleGoehsIssueCounterRefresh();
    }
}

function getTaskNamesForHazardDropdown() {
    const names = new Set();

    collectTaskData().forEach(task => {
        if ((task.taskName || '').trim()) names.add(task.taskName.trim());
    });

    if (names.size === 0 && window.goehsTableData && Array.isArray(window.goehsTableData.tasks)) {
        window.goehsTableData.tasks.forEach(task => {
            if ((task.name || '').trim()) names.add(task.name.trim());
        });
    }

    if (names.size === 0) {
        getActiveHazardTableRows().forEach(row => {
            const select = row.querySelector('.hazard-task');
            if (!select) return;
            if ((select.value || '').trim()) names.add(select.value.trim());
        });
    }

    return Array.from(names);
}

function getGoehsTaskMetadataMap(hazards = []) {
    const taskMap = {};

    // Read Task-section rows directly to avoid recursion with collectTaskData fallback.
    document.querySelectorAll('.task-row').forEach(row => {
        const key = (row.querySelector('.task-name')?.value || '').trim();
        if (!key) return;
        taskMap[key] = {
            taskDescription: (row.querySelector('.task-description')?.value || key).trim(),
            conditionMode: normalizeGoehsConditionMode(row.querySelector('.task-condition')?.value || 'Routine'),
            coreActivity: (row.querySelector('.task-activity')?.value || suggestCoreActivity(key) || '').trim(),
            jobTitle: (row.querySelector('.task-jobtitle')?.value || suggestJobTitle(key) || '').trim()
        };
    });

    if (Object.keys(taskMap).length === 0) {
        const tableData = window.goehsTableData || extractRiskTableData();

        if (tableData && Array.isArray(tableData.tasks)) {
            tableData.tasks.forEach(task => {
                const key = (task.name || '').trim();
                if (!key) return;
                taskMap[key] = {
                    taskDescription: task.description || key,
                    conditionMode: 'Routine',
                    coreActivity: suggestCoreActivity(key) || '',
                    jobTitle: suggestJobTitle(key) || ''
                };
            });
        }

        if (tableData && Array.isArray(tableData.hazards)) {
            tableData.hazards.forEach(hazard => {
                const key = (hazard.stepName || '').trim();
                if (!key) return;
                if (!taskMap[key]) {
                    taskMap[key] = {
                        taskDescription: key,
                        conditionMode: 'Routine',
                        coreActivity: suggestCoreActivity(key) || '',
                        jobTitle: suggestJobTitle(key) || ''
                    };
                }
                taskMap[key].conditionMode = normalizeGoehsConditionMode(hazard.routineType || taskMap[key].conditionMode);
            });
        }
    }

    if (Array.isArray(hazards)) {
        hazards.forEach(hazard => {
            const key = (hazard.taskName || '').trim();
            if (!key) return;
            if (!taskMap[key]) {
                taskMap[key] = {
                    taskDescription: key,
                    conditionMode: 'Routine',
                    coreActivity: suggestCoreActivity(key) || '',
                    jobTitle: suggestJobTitle(key) || ''
                };
            }
            taskMap[key].conditionMode = normalizeGoehsConditionMode(hazard.mode || taskMap[key].conditionMode);
        });
    }

    return taskMap;
}

// ============ RISK TABLE EXTRACTION FUNCTIONS ============

// Extract data from the main risk assessment table
function extractRiskTableData() {
    const tableData = {
        tasks: [],      // Unique tasks/steps
        hazards: [],    // All hazard rows with full details
        projectName: document.getElementById('projectNameInput')?.value || 'Risk Assessment'
    };
    
    // Try both possible selectors for compatibility
    let tableRows = document.querySelectorAll('#table-container tbody tr:not(.deleted-row)');
    if (tableRows.length === 0) {
        tableRows = document.querySelectorAll('#table-container table tbody tr:not(.deleted-row)');
    }
    
    const uniqueTasks = new Map(); // Use Map to track unique tasks by step name
    
    console.log(`📊 Found ${tableRows.length} table rows to process`);
    
    tableRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        // Lower the minimum cell requirement to catch more rows
        if (cells.length < 10) {
            return;
        }
        
        // Column mapping based on table headers:
        // 0: Picture, 1: AI, 2: Steps, 3: Hazard Group, 4: Hazard List, 5: Risk/Consequences,
        // 6: Frequency, 7: Severity, 8: Likelihood, 9: Risk Score, 10: Risk Category,
        // 11: Hazard Source, 12: Current Control, 13: Routine/Non-Routine, 14: Actions, 15: Delete
        
        const stepName = cells[2]?.textContent?.trim() || `Step ${index + 1}`;
        const hazardGroup = cells[3]?.querySelector('select')?.value || cells[3]?.textContent?.trim() || '';
        const hazardList = cells[4]?.querySelector('select')?.value || cells[4]?.textContent?.trim() || '';
        const consequence = cells[5]?.querySelector('select')?.value || cells[5]?.textContent?.trim() || '';
        
        // Get dropdown values for F/S/L
        const frequencySelect = cells[6]?.querySelector('select');
        const severitySelect = cells[7]?.querySelector('select');
        const likelihoodSelect = cells[8]?.querySelector('select');
        
        const frequency = frequencySelect?.value || cells[6]?.textContent?.trim() || '1';
        const severity = severitySelect?.value || cells[7]?.textContent?.trim() || '1';
        const likelihood = likelihoodSelect?.value || cells[8]?.textContent?.trim() || '1';
        const riskScore = cells[9]?.textContent?.trim() || '';
        const riskCategory = cells[10]?.textContent?.trim() || '';
        const hazardSource = cells[11]?.querySelector('input')?.value || cells[11]?.textContent?.trim() || '';
        const currentControl = cells[12]?.querySelector('input')?.value || cells[12]?.textContent?.trim() || '';
        const routineType = cells[13]?.querySelector('input')?.value || cells[13]?.textContent?.trim() || '';
        const sourceRowIndex = parseInt(row.dataset.rowIndex, 10);

        // Carry over the main table's "couldn't auto-detect this value" flags (see
        // .scale-value-unverified in index.html) so the GOEHS modal can flag them too.
        const frequencyUnverified = row.dataset.freqUnverified === 'true';
        const severityUnverified = row.dataset.sevUnverified === 'true';
        const likelihoodUnverified = row.dataset.likeUnverified === 'true';
        
        // Try to get Countermeasure_Ladder from stored data (if AI generated it)
        const rowData = row.dataset?.countermeasureLadder || '';
        
        // Track unique tasks
        if (!uniqueTasks.has(stepName)) {
            uniqueTasks.set(stepName, {
                name: stepName,
                description: '', // Task description should be empty - not pulled from outcome/consequence
                rowIndices: [index]
            });
        } else {
            uniqueTasks.get(stepName).rowIndices.push(index);
        }
        
        // Add to hazards list - include countermeasure ladder from AI if available
        tableData.hazards.push({
            rowIndex: index,
            sourceRowIndex: Number.isNaN(sourceRowIndex) ? index : sourceRowIndex,
            stepName: stepName,
            hazardGroup: hazardGroup,
            hazardList: hazardList,
            consequence: consequence,
            frequency: frequency,
            severity: severity,
            likelihood: likelihood,
            riskScore: riskScore,
            riskCategory: riskCategory,
            hazardSource: hazardSource,
            currentControl: currentControl,
            routineType: routineType,
            countermeasureLadder: rowData, // Pass AI-tagged countermeasure ladder to GOEHS
            frequencyUnverified: frequencyUnverified,
            severityUnverified: severityUnverified,
            likelihoodUnverified: likelihoodUnverified
        });
    });
    
    // Convert unique tasks to array
    uniqueTasks.forEach((value, key) => {
        tableData.tasks.push({
            name: key,
            description: value.description,
            hazardCount: value.rowIndices.length
        });
    });
    
    console.log('📊 Extracted Risk Table Data:', tableData);
    return tableData;
}

// Map app hazard group to GOEHS hazard category
function mapHazardGroupToGOEHS(hazardGroup) {
    const mapping = {
        'Physical': 'Physical',
        'Chemical': 'Chemical',
        'Biological': 'Biological',
        'Ergonomic': 'Ergonomic',
        'Psychosocial': 'Psychosocial',
        'Electrical': 'Physical', // Map to Physical
        'Mechanical': 'Physical', // Map to Physical
        'Fire': 'Physical', // Map to Physical
        'Environmental': 'Environmental',
        'Safety': 'Safety'
    };
    
    // Try exact match first
    if (mapping[hazardGroup]) return mapping[hazardGroup];
    
    // Try partial match
    for (const [key, value] of Object.entries(mapping)) {
        if (hazardGroup?.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return 'Physical'; // Default fallback
}

// Case-insensitive matching for hazard category (GOEHS supersedes)
function findMatchingGoehsCategory(parentCategory) {
    if (!parentCategory) return '';
    
    // First, try to reverse-translate if it's in French/German
    const normalizedCategory = window.reverseTranslate ? window.reverseTranslate(parentCategory) : parentCategory;
    const parentLower = normalizedCategory.toLowerCase().trim();
    
    // Find matching GOEHS category (case-insensitive)
    for (const goehsCat of Object.keys(HAZARD_CATEGORIES)) {
        if (goehsCat.toLowerCase() === parentLower) {
            return goehsCat; // Return GOEHS version with correct casing
        }
    }
    
    // Partial match fallback
    for (const goehsCat of Object.keys(HAZARD_CATEGORIES)) {
        const goehsLower = goehsCat.toLowerCase();
        // Check if main words match (e.g., "mechanical" in both)
        const parentWords = parentLower.split(/[\s\/]+/);
        const goehsWords = goehsLower.split(/[\s\/]+/);
        const ignoredWords = new Set([
            'hazard', 'hazards', 'danger', 'dangers', 'risk', 'risks',
            'group', 'groups', 'category', 'categories', 'and', 'the'
        ]);
        const meaningfulParentWords = parentWords.filter(pw => pw.length > 3 && !ignoredWords.has(pw));
        
        // If any significant word matches (excluding common words)
        const significantMatch = meaningfulParentWords.some(pw => 
            goehsWords.some(gw => !ignoredWords.has(gw) && (gw.includes(pw) || pw.includes(gw)))
        );
        if (significantMatch) {
            return goehsCat;
        }
    }
    
    return ''; // No match found
}

// Case-insensitive matching for sub-hazard (GOEHS supersedes)
function findMatchingGoehsSubHazard(goehsCategory, parentSubHazard) {
    if (!goehsCategory || !parentSubHazard) return '';
    
    // First, try to reverse-translate if it's in French/German
    const normalizedSubHazard = window.reverseTranslate ? window.reverseTranslate(parentSubHazard) : parentSubHazard;
    
    const subHazards = HAZARD_CATEGORIES[goehsCategory] || [];
    const parentLower = normalizedSubHazard.toLowerCase().trim();
    
    // Exact match (case-insensitive)
    for (const sub of subHazards) {
        if (sub.toLowerCase() === parentLower) {
            return sub; // Return GOEHS version with correct casing
        }
    }
    
    // Normalize special characters for comparison
    const normalizeForComparison = (str) => {
        return str.toLowerCase()
            .replace(/[≥≤<>]/g, '')
            .replace(/\s*\/\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[()]/g, '')
            .trim();
    };
    
    const parentNorm = normalizeForComparison(parentSubHazard);
    
    // Partial match - key phrase matching
    for (const sub of subHazards) {
        const subNorm = normalizeForComparison(sub);
        
        // Check if main descriptive words match
        if (subNorm.includes(parentNorm) || parentNorm.includes(subNorm)) {
            return sub;
        }
        
        // Special handling for "work at height" variants
        if (parentLower.includes('work at height') && sub.toLowerCase().includes('work at height')) {
            // Match based on height threshold
            if ((parentLower.includes('≥') || parentLower.includes('1.2m') || parentLower.includes('4 feet or more')) 
                && sub.includes('1.2m / 4 feet or more')) {
                return sub;
            }
            if ((parentLower.includes('<') || parentLower.includes('less than')) 
                && sub.includes('less than 1.2m')) {
                return sub;
            }
        }
    }
    
    // Word-based partial match
    const parentWords = parentLower.split(/[\s\/]+/).filter(w => w.length > 3);
    for (const sub of subHazards) {
        const subWords = sub.toLowerCase().split(/[\s\/]+/);
        const matchCount = parentWords.filter(pw => subWords.some(sw => sw.includes(pw) || pw.includes(sw))).length;
        if (matchCount >= 2 || (parentWords.length === 1 && matchCount === 1)) {
            return sub;
        }
    }
    
    return ''; // No match found
}

// Map app hazard list to GOEHS sub-hazard
function mapHazardListToSubHazard(hazardGroup, hazardList) {
    const goehsCategory = mapHazardGroupToGOEHS(hazardGroup);
    const subHazards = HAZARD_CATEGORIES[goehsCategory] || [];
    
    // Try exact match
    if (subHazards.includes(hazardList)) return hazardList;
    
    // Try partial match
    const lowerHazard = hazardList?.toLowerCase() || '';
    for (const sub of subHazards) {
        if (lowerHazard.includes(sub.toLowerCase()) || sub.toLowerCase().includes(lowerHazard)) {
            return sub;
        }
    }
    
    // Return first sub-hazard if no match
    return subHazards[0] || '';
}

// Convert app frequency (1, 1.25, 1.5, 1.75, 2) to GOEHS format (must be exact)
function mapFrequencyToGOEHS(freq) {
    const validFreqs = ['1', '1.25', '1.5', '1.75', '2'];
    const numFreq = parseFloat(freq);
    
    // Find closest valid frequency
    if (numFreq <= 1) return '1';
    if (numFreq <= 1.125) return '1';
    if (numFreq <= 1.375) return '1.25';
    if (numFreq <= 1.625) return '1.5';
    if (numFreq <= 1.875) return '1.75';
    return '2';
}

// Convert app severity to GOEHS format
function mapSeverityToGOEHS(sev) {
    const validSevs = ['1', '3', '5', '7', '9', '10'];
    const numSev = parseFloat(sev);
    
    // Find closest valid severity
    if (numSev <= 2) return '1';
    if (numSev <= 4) return '3';
    if (numSev <= 6) return '5';
    if (numSev <= 8) return '7';
    if (numSev <= 9.5) return '9';
    return '10';
}

// Convert app likelihood to GOEHS format
function mapLikelihoodToGOEHS(like) {
    const validLikes = ['1', '3', '5', '8', '10'];
    const numLike = parseFloat(like);
    
    // Find closest valid likelihood
    if (numLike <= 2) return '1';
    if (numLike <= 4) return '3';
    if (numLike <= 6.5) return '5';
    if (numLike <= 9) return '8';
    return '10';
}

// Intelligent Core Activity suggestion based on task name
function suggestCoreActivity(taskName) {
    const task = (taskName || '').toLowerCase();
    
    // Keyword to Core Activity mapping - expanded for better coverage
    const activityMap = {
        // Vehicle & Transport operations
        'drive': 'Vehicle Operations', 'driving': 'Vehicle Operations', 'drives': 'Vehicle Operations',
        'vehicle': 'Vehicle Operations', 'truck': 'Vehicle Operations', 'car': 'Vehicle Operations',
        'forklift': 'Material Handling', 'fork lift': 'Material Handling', 'pallet': 'Material Handling',
        'transport': 'Material Handling', 'transfer': 'Material Handling', 'move': 'Material Handling',
        'maneuver': 'Vehicle Operations', 'maneuvering': 'Vehicle Operations',
        'yard': 'Vehicle Operations', 'corner': 'Vehicle Operations',
        'reach': 'Material Handling', 'reaching': 'Material Handling',
        // Production operations
        'mix': 'Mixing', 'mixing': 'Mixing', 'blend': 'Blending', 'compound': 'Compounding',
        'extrusion': 'Extrusion', 'extrud': 'Extrusion', 'extruder': 'Extrusion',
        'cure': 'Equipment Operation', 'curing': 'Equipment Operation',
        'build': 'Assembly Operations', 'building': 'Assembly Operations', 'assembly': 'Assembly Operations',
        'finish': 'Finishing', 'final': 'Finishing',
        'inspect': 'Inspecting', 'inspection': 'Inspecting', 'check': 'Inspecting', 'quality': 'Inspecting',
        'test': 'Testing', 'testing': 'Testing',
        'clean': 'Cleaning Operations', 'cleaning': 'Cleaning Operations',
        'maintain': 'Maintenance', 'maintenance': 'Maintenance', 'repair': 'Repair',
        'load': 'Loading/Unloading', 'unload': 'Loading/Unloading', 'loading': 'Loading/Unloading',
        'lift': 'Lifting', 'lifting': 'Lifting',
        'handle': 'Material Handling', 'handling': 'Material Handling', 'material': 'Material Handling',
        'cut': 'Cutting Operations', 'cutting': 'Cutting Operations',
        'weld': 'Welding', 'welding': 'Welding',
        'machine': 'Machining', 'machining': 'Machining',
        'pack': 'Packaging', 'packaging': 'Packaging',
        'ship': 'Shipping/Receiving', 'receiving': 'Shipping/Receiving',
        'warehouse': 'Material Handling', 'storage': 'Material Handling',
        'calender': 'Calendering', 'press': 'Press Operations',
        'office': 'Office Work', 'admin': 'Office Work',
        'train': 'Training', 'training': 'Training',
        'bladder': 'Bladder Building', 'tire': 'Assembly Operations',
        'associate': 'Equipment Operation', 'operator': 'Equipment Operation', 'operate': 'Equipment Operation',
        // Additional keywords for better coverage
        'rubber': 'Compounding', 'stock': 'Material Handling', 'store': 'Material Handling',
        'grind': 'Machining', 'grinding': 'Machining', 'buff': 'Finishing', 'buffing': 'Finishing',
        'coat': 'Surface Coating', 'coating': 'Surface Coating', 'spray': 'Surface Coating', 'paint': 'Surface Coating',
        'form': 'Forming', 'forming': 'Forming', 'mold': 'Press Operations', 'molding': 'Press Operations',
        'setup': 'Equipment Installation', 'set up': 'Equipment Installation', 'install': 'Equipment Installation',
        'remove': 'Equipment De-installation', 'dismantle': 'Disassembly Operations',
        'lab': 'Laboratory Operations', 'laboratory': 'Laboratory Operations', 'sample': 'Laboratory Operations',
        'weigh': 'Chemical Production Operations', 'weighing': 'Chemical Production Operations',
        'chemical': 'Chemical Production Operations', 'hazmat': 'Chemical Production Operations',
        'confined': 'Confined Space Operations', 'tank': 'Confined Space Operations',
        'construct': 'Construction', 'demolish': 'Demolition',
        'security': 'Security/Emergency Response Operations', 'emergency': 'Security/Emergency Response Operations',
        'waste': 'Waste Management', 'dispose': 'Waste Management', 'disposal': 'Waste Management',
        'fabric': 'Component Prep', 'textile': 'Component Prep', 'cord': 'Component Prep',
        'housekeep': 'Housekeeping', 'ground': 'Groundskeeping', 'landscape': 'Groundskeeping',
        'engrav': 'Engraving', 'braze': 'Brazing', 'solder': 'Brazing',
        'foundry': 'Foundry', 'cast': 'Foundry', 'melt': 'Foundry',
        'wood': 'Woodworking', 'carpenter': 'Woodworking',
        'plate': 'Plating', 'plating': 'Plating',
        'disassembl': 'Disassembly Operations', 'takedown': 'Disassembly Operations'
    };
    
    for (const [keyword, activity] of Object.entries(activityMap)) {
        if (task.includes(keyword)) {
            return activity;
        }
    }
    
    return ''; // No match found
}

// Intelligent Job Title suggestion based on task name
function suggestJobTitle(taskName) {
    const task = (taskName || '').toLowerCase();
    
    // Keyword to Job Title mapping - expanded for better coverage
    const jobMap = {
        // Vehicle & Transport
        'drive': 'Fork truck operator', 'driving': 'Fork truck operator', 'drives': 'Fork truck operator',
        'forklift': 'Fork truck operator', 'fork lift': 'Fork truck operator',
        'truck': 'Fork truck operator', 'vehicle': 'Fork truck operator',
        'pallet': 'Material handler', 'transfer': 'Material handler', 'transport': 'Material handler',
        'maneuver': 'Fork truck operator', 'yard': 'Fork truck operator',
        'associate': 'Operator', 'operator': 'Operator',
        // Production
        'mix': 'Mixer Operator', 'mixing': 'Mixer Operator',
        'extrusion': 'Extruder Technician', 'extrud': 'Extruder Technician',
        'cure': 'Curing Technician', 'curing': 'Curing Technician',
        'build': 'Tire Builder', 'building': 'Tire Builder', 'assembly': 'Assembler',
        'finish': 'Final Finish Technician', 'final': 'Final Finish Technician',
        'inspect': 'Inspector', 'inspection': 'Inspector', 'quality': 'Quality Technician',
        'test': 'Tester', 'testing': 'Tester', 'lab': 'Lab Technician',
        'maintain': 'Maintenance', 'maintenance': 'Maintenance', 'repair': 'Repairman',
        'load': 'Material handler', 'unload': 'Material handler',
        'handle': 'Material handler', 'material': 'Material handler', 'handling': 'Material handler',
        'cut': 'Cutter Technician', 'cutting': 'Cutter Technician',
        'weld': 'Welder', 'welding': 'Welder',
        'machine': 'Machinist', 'machining': 'Machinist',
        'ship': 'Shipping & Receiving', 'receiving': 'Shipping & Receiving',
        'calender': 'Calender Operator', 'press': 'Press operator',
        'electric': 'Electrician', 'electrical': 'Electrician',
        'compound': 'Compounder', 'bladder': 'Bladder Builder',
        'office': 'Office worker-other', 'admin': 'Office worker-other',
        'supervise': 'Team Leader', 'leader': 'Team Leader', 'manage': 'Manager',
        // Additional keywords for better coverage
        'rubber': 'Compounder', 'stock': 'Material handler', 'store': 'Storeroom Clerk',
        'grind': 'Machinist', 'grinding': 'Machinist', 'buff': 'Final Finish Technician',
        'mill': 'Mill Operator', 'crane': 'Crane operator', 'hoist': 'Crane operator',
        'fabric': 'Fabric Machine Operator', 'textile': 'Fabric Machine Operator',
        'security': 'Security', 'guard': 'Guard', 'safety': 'Coordinator',
        'engineer': 'Engineer', 'design': 'Engineer',
        'research': 'Research Scientist', 'scientist': 'Research Scientist',
        'janitor': 'Janitor', 'custodian': 'Janitor', 'housekeep': 'Janitor',
        'plumb': 'Plumber', 'pipe': 'Pipefitter',
        'mechanic': 'Mechanic', 'tool': 'Tool & die maker', 'die': 'Tool & die maker',
        'wire': 'Wire Drawer', 'draw': 'Wire Drawer',
        'retread': 'Retread Technician', 'chemical': 'Chemical Process Operator',
        'pigment': 'Pigment Weighing Operator', 'weigh': 'Pigment Weighing Operator',
        'dispatch': 'Dispatcher', 'coordinator': 'Coordinator',
        'train': 'Labor Trainer', 'trainer': 'Labor Trainer',
        'ground': 'Groundskeeper', 'landscape': 'Groundskeeper'
    };
    
    for (const [keyword, job] of Object.entries(jobMap)) {
        if (task.includes(keyword)) {
            return job;
        }
    }
    
    return ''; // No match found
}

// Auto-populate GOEHS tasks from risk table
function populateGoehsTasksFromTable(tableData) {
    window.__goehsTasksSyncedSig = computeGoehsTasksSignature(tableData);
    // Clear existing tasks
    goehsTasks = [];
    taskIdCounter = 0;
    const container = document.getElementById('taskRowsContainer');
    if (container) container.innerHTML = '';
    
    if (tableData.tasks.length === 0) {
        addTaskRow(); // Add empty row if no tasks
        return;
    }
    
    // Add a row for each unique task
    tableData.tasks.forEach((task, index) => {
        taskIdCounter++;
        const taskId = `task-${taskIdCounter}`;
        goehsTasks.push({ id: taskId, data: task });
        
        const row = document.createElement('div');
        row.id = taskId;
        row.className = 'task-row grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg';
        
        // Intelligently suggest Core Activity and Job Title based on task name
        const suggestedActivity = suggestCoreActivity(task.name);
        const suggestedJob = suggestJobTitle(task.name);
        
        // Don't apply AI class to default values - only apply when AI actually fills empty fields
        const activityClass = 'goehs-empty-required';
        const jobClass = 'goehs-empty-required';
        
        // Generate Core Activity options with intelligent pre-selection
        const coreActivityOptions = CORE_ACTIVITIES.map(ca => 
            `<option value="${ca}" ${ca === suggestedActivity ? 'selected' : ''}>${ca}</option>`
        ).join('');
        
        // Generate Job Title options with intelligent pre-selection
        const jobTitleOptions = JOB_TITLES.map(jt => 
            `<option value="${jt}" ${jt === suggestedJob ? 'selected' : ''}>${jt}</option>`
        ).join('');
        
        row.innerHTML = `
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Task Name <span class="text-red-500">*</span></label>
                <input type="text" class="task-name w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value="${escapeHtml(task.name)}" placeholder="Task name">
                <span class="text-xs text-slate-500">${task.hazardCount} hazard(s)</span>
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Task Description</label>
                <input type="text" class="task-description w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value="${escapeHtml(task.name)}" placeholder="Description">
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Condition Mode <span class="text-red-500">*</span></label>
                <select class="task-condition w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    <option value="">-- Select --</option>
                    <option value="Routine" selected>Routine</option>
                    <option value="Non-Routine">Non-Routine</option>
                    <option value="Emergency Situation">Emergency Situation</option>
                </select>
            </div>
            <div class="goehs-field-wrapper">
                <label class="block text-xs font-medium text-slate-600 mb-1">Core Activity <span class="text-red-500">*</span></label>
                <select class="task-activity w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white ${activityClass}" onchange="this.classList.remove('goehs-empty-required', 'goehs-ai-prefilled')">
                    <option value="">-- Select --</option>
                    ${coreActivityOptions}
                </select>
            </div>
            <div class="goehs-field-wrapper">
                <label class="block text-xs font-medium text-slate-600 mb-1">Job Title <span class="text-red-500">*</span></label>
                <div class="flex gap-2">
                    <select class="task-jobtitle flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white ${jobClass}" onchange="this.classList.remove('goehs-empty-required', 'goehs-ai-prefilled')">
                        <option value="">-- Select --</option>
                        ${jobTitleOptions}
                    </select>
                    <button type="button" onclick="removeTaskRow('${taskId}')" class="px-2 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(row);
    });
    
    console.log(`✅ Populated ${tableData.tasks.length} tasks from risk table`);
}

// Auto-populate GOEHS hazards from risk table - TABLE FORMAT
function populateGoehsHazardsFromTable(tableData) {
    window.__goehsHazardsSyncedSig = computeGoehsHazardsSignature(tableData);
    // Clear existing hazards
    goehsHazards = [];
    hazardIdCounter = 0;
    const tbody = document.getElementById('hazardTableBody');
    if (tbody) tbody.innerHTML = '';
    
    // Update count display
    const countDisplay = document.getElementById('hazardCountDisplay');
    if (countDisplay) countDisplay.textContent = tableData.hazards.length;
    
    if (tableData.hazards.length === 0) {
        addHazardTableRow(); // Add empty row if no hazards
        return;
    }
    
    // Add a table row for each hazard
    tableData.hazards.forEach((hazard, index) => {
        hazardIdCounter++;
        const hazardId = `hazard-${hazardIdCounter}`;
        goehsHazards.push({ id: hazardId, data: hazard });
        
        // Map to GOEHS format with case-insensitive matching (GOEHS casing supersedes)
        const sourceCategory = (hazard.hazardGroup || '').toString().trim();
        const sourceSubHazard = (hazard.hazardList || '').toString().trim();
        const sourceOutcome = (hazard.consequence || '').toString().trim();

        const goehsCategory = findMatchingGoehsCategory(sourceCategory) || '';
        const goehsSubHazard = goehsCategory ? findMatchingGoehsSubHazard(goehsCategory, sourceSubHazard) : '';

        // Potential Outcome is confirmed free text in the GOEHS vendor template (no fixed
        // whitelist) - unlike Hazard/Sub-Hazard, it's never validated against a registry.
        const categoryMismatch = !!sourceCategory && !goehsCategory;
        const subHazardMismatch = !!sourceSubHazard && !goehsSubHazard;

        const goehsFreq = mapFrequencyToGOEHS(hazard.frequency);
        const goehsSev = mapSeverityToGOEHS(hazard.severity);
        const goehsLike = mapLikelihoodToGOEHS(hazard.likelihood);
        
        // Calculate initial risk score
        const initScore = (parseFloat(goehsFreq) * parseFloat(goehsSev) * parseFloat(goehsLike)).toFixed(2);
        const initRating = getRiskRating(parseFloat(initScore));
        
        // Get task names for dropdown
        const taskOptions = tableData.tasks.length > 0 
            ? tableData.tasks.map(t => `<option value="${escapeHtml(t.name)}" ${t.name === hazard.stepName ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')
            : `<option value="${escapeHtml(hazard.stepName)}" selected>${escapeHtml(hazard.stepName)}</option>`;

        const modeOptions = GOEHS_CONDITION_MODES.map(mode => {
            const selected = mode === parseGoehsConditionMode(hazard.routineType);
            return `<option value="${mode}" ${selected ? 'selected' : ''}>${goehsUiLabel(mode)}</option>`;
        }).join('');
        
        // Generate hazard category options - with case-insensitive selection
        const categoryOptions = Object.keys(HAZARD_CATEGORIES).map(cat => 
            `<option value="${cat}" ${cat === goehsCategory ? 'selected' : ''}>${goehsUiLabel(cat)}</option>`
        ).join('');
        
        // Generate sub-hazard options for selected category with proper matching
        const subHazards = HAZARD_CATEGORIES[goehsCategory] || [];
        const subHazardOptions = subHazards.map(sub => 
            `<option value="${sub}" ${sub === goehsSubHazard ? 'selected' : ''}>${goehsUiLabel(sub)}</option>`
        ).join('');
        
        // Generate frequency/severity/likelihood options
        const freqOpts = (vals, selected) => vals.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('');
        const freqValues = ['1', '1.25', '1.5', '1.75', '2'];
        const sevValues = ['1', '3', '5', '7', '9', '10'];
        const likeValues = ['1', '3', '5', '8', '10'];
        
        // Countermeasure ladder options - with preselection from parent table data
        // Parse pre-tagged ladder levels from parent table (can be comma-separated string or array)
        const preTaggedLadder = hazard.countermeasureLadder || '';
        const preSelectedLadders = Array.isArray(preTaggedLadder) 
            ? preTaggedLadder 
            : preTaggedLadder.split(',').map(s => s.trim()).filter(s => s);
        
        const ladderOptions = COUNTERMEASURE_LADDER.map(l => {
            const isSelected = preSelectedLadders.some(
                presel => presel.toLowerCase() === l.toLowerCase()
            );
            return `<option value="${l}" ${isSelected ? 'selected' : ''}>${goehsUiLabel(l)}</option>`;
        }).join('');
        
        const row = document.createElement('tr');
        row.id = hazardId;
        row.className = 'hazard-table-row border-b border-slate-200 hover:bg-slate-50';
        row.dataset.hazardIndex = index;
        row.dataset.deleted = 'false';
        if (!Number.isNaN(Number(hazard.sourceRowIndex))) {
            row.dataset.sourceRowIndex = String(hazard.sourceRowIndex);
        }
        
        row.innerHTML = `
            <td class="p-1 border-r border-slate-200 text-center bg-white">
                <div class="goehs-row-delete-wrap">
                    <button type="button" onclick="removeHazardTableRow('${hazardId}')" class="goehs-row-delete-btn goehs-btn goehs-btn-icon-danger" title="Delete row" aria-label="Delete row">
                        ${renderHazardTableRowActionIcon(false)}
                    </button>
                </div>
            </td>
            <td class="p-1 border-r border-slate-200 text-center font-medium text-slate-600">${index + 1}</td>
            <td class="p-1 border-r border-slate-200">
                <select class="hazard-task w-full p-1 border border-slate-300 rounded text-xs bg-white">
                    <option value="">--</option>
                    ${taskOptions}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200">
                <select class="hazard-mode w-full p-1 border border-slate-300 rounded text-xs bg-white">
                    ${modeOptions}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-orange-50">
                <select class="hazard-category w-full p-1 border border-slate-300 rounded text-xs bg-white${categoryMismatch ? ' goehs-mismatch' : ''}"${categoryMismatch && sourceCategory ? ` data-raw-value="${escapeHtml(sourceCategory)}" title="No exact GOEHS match - imported value was: ${escapeHtml(sourceCategory)}"` : ''} onchange="this.classList.remove('goehs-mismatch');updateTableSubHazards(this, '${hazardId}')">
                    <option value="">${categoryMismatch && sourceCategory ? escapeHtml(sourceCategory) + ' (unmatched)' : '--'}</option>
                    ${categoryOptions}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-orange-50">
                <select class="hazard-sub w-full p-1 border border-slate-300 rounded text-xs bg-white${subHazardMismatch ? ' goehs-mismatch' : ''}"${subHazardMismatch && sourceSubHazard ? ` data-raw-value="${escapeHtml(sourceSubHazard)}" title="No exact GOEHS match - imported value was: ${escapeHtml(sourceSubHazard)}"` : ''} onchange="this.classList.remove('goehs-mismatch')">
                    <option value="">${subHazardMismatch && sourceSubHazard ? escapeHtml(sourceSubHazard) + ' (unmatched)' : '--'}</option>
                    ${subHazardOptions}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200">
                <input type="text" class="hazard-outcome w-full p-1 border border-slate-300 rounded text-xs bg-white" value="${escapeHtml(goehsUiLabel(sourceOutcome))}" placeholder="Potential Outcome" title="Free text - GOEHS accepts any wording here">
            </td>
            <td class="p-1 border-r border-slate-200">
                <input type="text" class="hazard-desc w-full p-1 border border-slate-300 rounded text-xs" value="${escapeHtml(goehsUiLabel(hazard.hazardSource || hazard.hazardList))}" placeholder="Description">
            </td>
            <td class="p-1 border-r border-slate-200 bg-amber-50">
                <select class="hazard-init-freq w-full p-1 border border-slate-300 rounded text-xs bg-white text-center${hazard.frequencyUnverified ? ' modal-scale-value-unverified' : ''}"${hazard.frequencyUnverified ? ' title="Frequency could not be auto-detected from the Excel file — this is a default, please verify."' : ''} onchange="calcTableInitRisk('${hazardId}')">
                    ${freqOpts(freqValues, goehsFreq)}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-amber-50">
                <select class="hazard-init-sev w-full p-1 border border-slate-300 rounded text-xs bg-white text-center${hazard.severityUnverified ? ' modal-scale-value-unverified' : ''}"${hazard.severityUnverified ? ' title="Severity could not be auto-detected from the Excel file — this is a default, please verify."' : ''} onchange="calcTableInitRisk('${hazardId}')">
                    ${freqOpts(sevValues, goehsSev)}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-amber-50">
                <select class="hazard-init-like w-full p-1 border border-slate-300 rounded text-xs bg-white text-center${hazard.likelihoodUnverified ? ' modal-scale-value-unverified' : ''}"${hazard.likelihoodUnverified ? ' title="Likelihood could not be auto-detected from the Excel file — this is a default, please verify."' : ''} onchange="calcTableInitRisk('${hazardId}')">
                    ${freqOpts(likeValues, goehsLike)}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-amber-50">
                <input type="text" class="hazard-init-score w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center font-semibold" value="${initScore}" readonly>
            </td>
            <td class="p-1 border-r border-slate-200 bg-amber-50">
                <input type="text" class="hazard-init-rating w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center font-semibold" value="${initRating}" readonly>
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <input type="text" class="hazard-counter-desc w-full p-1 border border-slate-300 rounded text-xs" value="${escapeHtml(hazard.currentControl)}" placeholder="Controls">
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <select class="hazard-counter-ladder w-full p-1 border border-slate-300 rounded text-xs bg-white" multiple size="4" style="min-height: 70px;" title="Hold Ctrl/Cmd to select multiple">
                    ${ladderOptions}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <select class="hazard-res-freq w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableResRisk('${hazardId}')">
                    ${freqOpts(freqValues, goehsFreq)}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <select class="hazard-res-sev w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableResRisk('${hazardId}')">
                    ${freqOpts(sevValues, goehsSev)}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <select class="hazard-res-like w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableResRisk('${hazardId}')">
                    ${freqOpts(likeValues, goehsLike)}
                </select>
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <input type="text" class="hazard-res-score w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center" value="${initScore}" readonly>
            </td>
            <td class="p-1 border-r border-slate-200 bg-blue-50">
                <input type="text" class="hazard-res-rating w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center" value="${initRating}" readonly>
            </td>
        `;

        setHazardTableRowDeletedState(row, false, { suppressCounterRefresh: true });
        
        tbody.appendChild(row);
    });
    
    // Update count display
    if (countDisplay) countDisplay.textContent = tableData.hazards.length;
    
    // Auto-apply countermeasure ladder suggestions based on control descriptions
    setTimeout(() => autoApplyCountermeasureSuggestions(), 100);

    // Inherit the main table's hazard-dropdown language rather than re-detecting: the
    // hazard/category values pulled in above (h.hazardGroup / h.hazardList) are always the
    // canonical English registry key (that's what the main table's <select> value holds,
    // by design, regardless of what language it's currently displayed in), so there is
    // nothing non-English left to detect from by the time data reaches this modal. The
    // main table already did the real detection when the Excel sheet was imported: reuse
    // that result here, unless the user has explicitly picked a different language in this
    // modal's own dropdown, which then sticks for the rest of the session.
    if (!goehsHazardDropdownLangManual && window.hazardDropdownLang && window.hazardDropdownLang !== goehsHazardDropdownLang) {
        goehsHazardDropdownLang = window.hazardDropdownLang;
        localStorage.setItem('goehsHazardDropdownLang', goehsHazardDropdownLang);
        const sel = document.getElementById('goehsHazardLangSelect');
        if (sel) sel.value = goehsHazardDropdownLang;
    }
    relabelGoehsHazardDropdownsInLanguage(goehsHazardDropdownLang);

    scheduleGoehsIssueCounterRefresh();

    console.log(`✅ Populated ${tableData.hazards.length} hazards in table format from risk table`);
}

// Auto-apply countermeasure ladder suggestions on data load
// Only applies keyword-based suggestions if NO pre-tagged ladder was set from parent table
function autoApplyCountermeasureSuggestions() {
    const hazardRows = getActiveHazardTableRows();
    let appliedCount = 0;
    let skippedPreTagged = 0;
    
    hazardRows.forEach(row => {
        const counterDesc = row.querySelector('.hazard-counter-desc')?.value || '';
        const counterLadderSelect = row.querySelector('.hazard-counter-ladder');
        
        if (counterLadderSelect) {
            // Check if already has pre-selected values (from parent table AI tagging)
            const hasPreSelection = Array.from(counterLadderSelect.selectedOptions).length > 0;
            
            if (hasPreSelection) {
                // Already has pre-tagged values from parent table - just add visual indicator
                counterLadderSelect.classList.add('goehs-ai-prefilled');
                skippedPreTagged++;
            } else if (counterDesc) {
                // No pre-selection, use keyword-based suggestion
                const suggestions = suggestCountermeasureLadder(counterDesc);
                if (suggestions.length > 0) {
                    // Select suggested options
                    suggestions.forEach(s => {
                        const opt = Array.from(counterLadderSelect.options).find(o => o.value === s);
                        if (opt) {
                            opt.selected = true;
                            appliedCount++;
                        }
                    });
                    // Add visual indicator for AI-suggested
                    counterLadderSelect.classList.add('goehs-ai-prefilled');
                }
            }
        }
    });
    
    if (appliedCount > 0 || skippedPreTagged > 0) {
        console.log(`✅ Countermeasure ladder: ${skippedPreTagged} pre-tagged from parent, ${appliedCount} auto-suggested from keywords`);
    }
}

// Add empty hazard table row
function addHazardTableRow() {
    hazardIdCounter++;
    const hazardId = `hazard-${hazardIdCounter}`;
    goehsHazards.push({ id: hazardId, data: {} });

    const tbody = document.getElementById('hazardTableBody');
    if (!tbody) return;

    const index = goehsHazards.length;

    const tasks = getTaskNamesForHazardDropdown();
    const taskOptions = tasks.length > 0
        ? tasks.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')
        : '';

    const modeOptions = GOEHS_CONDITION_MODES.map(mode =>
        `<option value="${mode}" ${mode === 'Routine' ? 'selected' : ''}>${goehsUiLabel(mode)}</option>`
    ).join('');

    const categoryOptions = Object.keys(HAZARD_CATEGORIES).map(cat =>
        `<option value="${cat}">${goehsHazardLabel(cat)}</option>`
    ).join('');

    const freqOpts = (vals) => vals.map(v => `<option value="${v}">${v}</option>`).join('');
    const freqValues = ['1', '1.25', '1.5', '1.75', '2'];
    const sevValues = ['1', '3', '5', '7', '9', '10'];
    const likeValues = ['1', '3', '5', '8', '10'];
    const ladderOptions = ['', ...COUNTERMEASURE_LADDER].map(l => `<option value="${l}">${l ? goehsUiLabel(l) : '--'}</option>`).join('');

    const row = document.createElement('tr');
    row.id = hazardId;
    row.className = 'hazard-table-row border-b border-slate-200 hover:bg-slate-50';
    row.dataset.hazardIndex = index - 1;
    row.dataset.deleted = 'false';

    row.innerHTML = `
        <td class="p-1 border-r border-slate-200 text-center bg-white">
            <div class="goehs-row-delete-wrap">
                <button type="button" onclick="removeHazardTableRow('${hazardId}')" class="goehs-row-delete-btn goehs-btn goehs-btn-icon-danger" title="Delete row" aria-label="Delete row">
                    ${renderHazardTableRowActionIcon(false)}
                </button>
            </div>
        </td>
        <td class="p-1 border-r border-slate-200 text-center font-medium text-slate-600">${index}</td>
        <td class="p-1 border-r border-slate-200">
            <select class="hazard-task w-full p-1 border border-slate-300 rounded text-xs bg-white">
                <option value="">--</option>
                ${taskOptions}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200">
            <select class="hazard-mode w-full p-1 border border-slate-300 rounded text-xs bg-white">
                ${modeOptions}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-orange-50">
            <select class="hazard-category w-full p-1 border border-slate-300 rounded text-xs bg-white" onchange="this.classList.remove('goehs-mismatch');updateTableSubHazards(this, '${hazardId}')">
                <option value="">--</option>
                ${categoryOptions}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-orange-50">
            <select class="hazard-sub w-full p-1 border border-slate-300 rounded text-xs bg-white" onchange="this.classList.remove('goehs-mismatch')">
                <option value="">--</option>
            </select>
        </td>
        <td class="p-1 border-r border-slate-200">
            <input type="text" class="hazard-outcome w-full p-1 border border-slate-300 rounded text-xs bg-white" placeholder="Potential Outcome" title="Free text - GOEHS accepts any wording here">
        </td>
        <td class="p-1 border-r border-slate-200">
            <input type="text" class="hazard-desc w-full p-1 border border-slate-300 rounded text-xs" placeholder="Description">
        </td>
        <td class="p-1 border-r border-slate-200 bg-amber-50">
            <select class="hazard-init-freq w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableInitRisk('${hazardId}')">
                ${freqOpts(freqValues)}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-amber-50">
            <select class="hazard-init-sev w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableInitRisk('${hazardId}')">
                ${freqOpts(sevValues)}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-amber-50">
            <select class="hazard-init-like w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableInitRisk('${hazardId}')">
                ${freqOpts(likeValues)}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-amber-50">
            <input type="text" class="hazard-init-score w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center font-semibold" value="" readonly placeholder="--">
        </td>
        <td class="p-1 border-r border-slate-200 bg-amber-50">
            <input type="text" class="hazard-init-rating w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center font-semibold" value="" readonly placeholder="--">
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <input type="text" class="hazard-counter-desc w-full p-1 border border-slate-300 rounded text-xs" placeholder="Controls">
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <select class="hazard-counter-ladder w-full p-1 border border-slate-300 rounded text-xs bg-white" multiple size="4" style="min-height: 70px;" title="Hold Ctrl/Cmd to select multiple">
                ${ladderOptions}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <select class="hazard-res-freq w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableResRisk('${hazardId}')">
                <option value="">--</option>
                ${freqOpts(freqValues)}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <select class="hazard-res-sev w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableResRisk('${hazardId}')">
                <option value="">--</option>
                ${freqOpts(sevValues)}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <select class="hazard-res-like w-full p-1 border border-slate-300 rounded text-xs bg-white text-center" onchange="calcTableResRisk('${hazardId}')">
                <option value="">--</option>
                ${freqOpts(likeValues)}
            </select>
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <input type="text" class="hazard-res-score w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center" value="" readonly placeholder="--">
        </td>
        <td class="p-1 border-r border-slate-200 bg-blue-50">
            <input type="text" class="hazard-res-rating w-full p-1 border border-slate-300 rounded text-xs bg-slate-100 text-center" value="" readonly placeholder="--">
        </td>
    `;

    setHazardTableRowDeletedState(row, false);
    tbody.appendChild(row);
    updateHazardCount();
}

// Remove hazard table row
function removeHazardTableRow(hazardId) {
    const row = document.getElementById(hazardId);
    if (!row) return;

    setHazardTableRowDeletedState(row, !isHazardTableRowDeleted(row));
    const sourceRowIndex = parseInt(row.dataset.sourceRowIndex, 10);
    if (!Number.isNaN(sourceRowIndex)) {
        setMainTableRowDeletedState(sourceRowIndex, isHazardTableRowDeleted(row));
    }
    updateHazardCount();
}

// Renumber hazard table rows
function renumberHazardTableRows() {
    document.querySelectorAll('.hazard-table-row').forEach((row, index) => {
        const numberCell = row.querySelector('td:nth-child(2)');
        if (numberCell) numberCell.textContent = index + 1;
        row.dataset.hazardIndex = index;
    });
}

// Update hazard count display
function updateHazardCount() {
    const countDisplay = document.getElementById('hazardCountDisplay');
    if (countDisplay) {
        countDisplay.textContent = getActiveHazardTableRows().length;
    }
    scheduleGoehsIssueCounterRefresh();
}

// Update sub-hazards dropdown in table format
function updateTableSubHazards(selectElement, hazardId) {
    const hazardCategory = selectElement.value;
    const row = document.getElementById(hazardId);
    if (!row) return;

    const subSelect = row.querySelector('.hazard-sub');
    if (!subSelect) return;

    subSelect.classList.remove('goehs-mismatch');
    subSelect.innerHTML = '<option value="">--</option>';

    if (hazardCategory && HAZARD_CATEGORIES[hazardCategory]) {
        HAZARD_CATEGORIES[hazardCategory].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = goehsHazardLabel(sub);
            subSelect.appendChild(opt);
        });
    }
}

// Calculate initial risk in table format
function calcTableInitRisk(hazardId) {
    const row = document.getElementById(hazardId);
    const freq = row.querySelector('.hazard-init-freq').value;
    const sev = row.querySelector('.hazard-init-sev').value;
    const like = row.querySelector('.hazard-init-like').value;
    
    if (freq && sev && like) {
        const score = (parseFloat(freq) * parseFloat(sev) * parseFloat(like)).toFixed(2);
        const rating = getRiskRating(parseFloat(score));
        row.querySelector('.hazard-init-score').value = score;
        row.querySelector('.hazard-init-rating').value = rating;
    }
}

// Calculate residual risk in table format
function calcTableResRisk(hazardId) {
    const row = document.getElementById(hazardId);
    const freq = row.querySelector('.hazard-res-freq').value;
    const sev = row.querySelector('.hazard-res-sev').value;
    const like = row.querySelector('.hazard-res-like').value;
    
    if (freq && sev && like) {
        const score = (parseFloat(freq) * parseFloat(sev) * parseFloat(like)).toFixed(2);
        const rating = getRiskRating(parseFloat(score));
        row.querySelector('.hazard-res-score').value = score;
        row.querySelector('.hazard-res-rating').value = rating;
    } else {
        row.querySelector('.hazard-res-score').value = '';
        row.querySelector('.hazard-res-rating').value = '';
    }
}

// Calculate predictive risk in table format
function calcTablePredRisk(hazardId) {
    const row = document.getElementById(hazardId);
    if (!row) return;

    const freqEl = row.querySelector('.hazard-pred-freq');
    const sevEl = row.querySelector('.hazard-pred-sev');
    const likeEl = row.querySelector('.hazard-pred-like');
    const scoreEl = row.querySelector('.hazard-pred-score');
    const ratingEl = row.querySelector('.hazard-pred-rating');

    // Predictive columns are removed in simplified review mode.
    if (!freqEl || !sevEl || !likeEl || !scoreEl || !ratingEl) {
        return;
    }

    const freq = freqEl.value;
    const sev = sevEl.value;
    const like = likeEl.value;
    
    if (freq && sev && like) {
        const score = (parseFloat(freq) * parseFloat(sev) * parseFloat(like)).toFixed(2);
        const rating = getRiskRating(parseFloat(score));
        scoreEl.value = score;
        ratingEl.value = rating;
    } else {
        scoreEl.value = '';
        ratingEl.value = '';
    }
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============ MODAL FUNCTIONS ============

const GOEHS_REQUIRED_HEADER_FIELDS = [
    { id: 'goehsOrgName', label: 'OrgName' },
    { id: 'goehsLocation', label: 'Location' }
];

function getGoehsRequiredFieldElements() {
    return GOEHS_REQUIRED_HEADER_FIELDS
        .map(field => ({ ...field, element: document.getElementById(field.id) }))
        .filter(field => !!field.element);
}

function bindGoehsRequiredFieldListeners() {
    getGoehsRequiredFieldElements().forEach(({ element }) => {
        if (element.dataset.goehsRequiredBound === '1') return;
        const clearHighlight = () => {
            if ((element.value || '').trim()) {
                element.classList.remove('goehs-empty-required');
            }
        };
        element.addEventListener('input', clearHighlight);
        element.addEventListener('change', clearHighlight);
        element.dataset.goehsRequiredBound = '1';
    });
}

function validateGoehsRequiredHeaderFields(options = {}) {
    const {
        showAlert = true,
        focusFirst = true
    } = options;

    const missing = [];
    getGoehsRequiredFieldElements().forEach(({ label, element }) => {
        const value = (element.value || '').trim();
        if (!value) {
            element.classList.add('goehs-empty-required');
            missing.push({ label, element });
        } else {
            element.classList.remove('goehs-empty-required');
        }
    });

    if (missing.length === 0) return true;

    if (showAlert) {
        const labels = missing.map(item => item.label).join(', ');
        showGoehsAlert(`Please complete required header fields: ${labels}.`, 'error');
    }

    if (focusFirst && missing[0] && missing[0].element) {
        missing[0].element.focus();
        missing[0].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return false;
}

function syncGoehsAssessmentTitleDisplays() {
    const title = (document.getElementById('goehsAssessmentTitle')?.value || '').trim() || '-';
    const tool3Title = document.getElementById('tool3AssessmentTitle');
    if (tool3Title) tool3Title.textContent = title;
}

function isGoehsSingleScreenMode() {
    return !!document.getElementById('goehsSingleScreenBanner');
}

function ensureGoehsSectionDataLoaded(toolNum) {
    const taskContainer = document.getElementById('taskRowsContainer');
    if (toolNum >= 2 && taskContainer && goehsTasks.length === 0) {
        if (window.goehsTableData && window.goehsTableData.tasks.length > 0) {
            populateGoehsTasksFromTable(window.goehsTableData);
            setTimeout(() => {
                aiPopulateTaskFields();
            }, 300);
        } else {
            addTaskRow();
        }
    }

    if (toolNum >= 3 && goehsHazards.length === 0) {
        if (window.goehsTableData && window.goehsTableData.hazards.length > 0) {
            populateGoehsHazardsFromTable(window.goehsTableData);
            setTimeout(() => {
                aiPopulateHazardFields();
            }, 300);
        } else {
            if (document.getElementById('hazardTableBody')) {
                addHazardTableRow();
            } else {
                addHazardRow();
            }
        }
    }
}

function openGoehsModal() {
    const modal = document.getElementById('goehsModal');
    if (modal) {
        modal.style.display = 'flex';
        initializeGoehsForm();
        bindGoehsRequiredFieldListeners();
        
        // Auto-extract and populate from risk table
        autoPopulateFromRiskTable();
        syncGoehsAssessmentTitleDisplays();

        if (isGoehsSingleScreenMode()) {
            ensureGoehsSectionDataLoaded(3);
        }

        initGoehsIssueCounterHooks();
        scheduleGoehsIssueCounterRefresh();
    }
}

// Auto-populate GOEHS tools from existing risk table
// Cheap equality signature for "has the main risk table changed since GOEHS last
// pulled from it" - deliberately only the fields that actually feed the GOEHS
// tasks/hazards panes, not the full row objects.
function computeGoehsTasksSignature(tableData) {
    return JSON.stringify((tableData.tasks || []).map(t => [t.name, t.description]));
}
function computeGoehsHazardsSignature(tableData) {
    return JSON.stringify((tableData.hazards || []).map(h => [
        h.stepName, h.hazardGroup, h.hazardList, h.consequence, h.frequency, h.severity,
        h.likelihood, h.hazardSource, h.currentControl, h.routineType, h.countermeasureLadder
    ]));
}

function autoPopulateFromRiskTable() {
    const tableData = extractRiskTableData();
    const banner = document.getElementById('goehsAutoPopulateBanner');

    if (tableData.hazards.length === 0) {
        // Update banner to show no data
        if (banner) {
            banner.className = 'mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg';
            banner.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                        <h4 class="font-semibold text-yellow-800">No Risk Table Data Found</h4>
                        <p class="text-yellow-700 text-sm mt-1">No risk assessment data was detected. Please generate a risk assessment first using the main app, or enter data manually in the final review pane.</p>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Show success info
    const count = tableData.hazards.length;
    const taskCount = tableData.tasks.length;

    // Detect drift: the main risk table is re-extracted fresh every time this modal opens,
    // but Tasks/Hazards only auto-populate from it ONCE (ensureGoehsSectionDataLoaded guards
    // on the panes still being empty) - so editing rows in the main table after the first
    // GOEHS visit silently had no effect. Category/Sub-Hazard/Outcome/Hazard Source/Current
    // Control/Countermeasure Ladder all write back to the main table as they're edited (see
    // syncGoehsHazardFieldToMainTable/syncGoehsLadderToMainTable), so a rebuild from the main
    // table can't lose those - it's now safe to auto-refresh here instead of requiring a
    // manual click. Fields with no main-table counterpart (Job Title, Condition Mode, manual
    // F/S/L overrides, Predictive/Residual values) are GOEHS-only and still reset on refresh.
    const hazardsChanged = goehsHazards.length > 0
        && window.__goehsHazardsSyncedSig !== undefined
        && window.__goehsHazardsSyncedSig !== computeGoehsHazardsSignature(tableData);
    const tasksChanged = goehsTasks.length > 0
        && window.__goehsTasksSyncedSig !== undefined
        && window.__goehsTasksSyncedSig !== computeGoehsTasksSignature(tableData);

    if (tasksChanged) populateGoehsTasksFromTable(tableData);
    if (hazardsChanged) populateGoehsHazardsFromTable(tableData);

    // Update banner to show data found
    if (banner) {
        if (hazardsChanged || tasksChanged) {
            const what = [tasksChanged ? 'tasks' : null, hazardsChanged ? 'hazards' : null].filter(Boolean).join(' and ');
            banner.className = 'mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg';
            banner.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div class="flex-1">
                        <h4 class="font-semibold text-amber-800">🔄 Refreshed ${what} from the main risk table</h4>
                        <p class="text-amber-700 text-sm mt-1">Your main table had changed since this was last loaded here, so the ${what} pane was automatically updated to match. Hazard/Sub-Hazard/Outcome/Source/Current Control/Countermeasure Ladder carried over - Job Title, Condition Mode, and any manual F/S/L or Predictive/Residual edits for the affected rows were reset since those only exist here.</p>
                    </div>
                </div>
            `;
        } else {
            banner.className = 'mb-6 p-4 bg-green-50 border border-green-200 rounded-lg';
            banner.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <h4 class="font-semibold text-green-800">✓ Risk Table Data Detected: ${taskCount} Task(s), ${count} Hazard(s)</h4>
                        <p class="text-green-700 text-sm mt-1">Your risk assessment data will automatically populate the final review pane.</p>
                        <p class="text-green-700 text-sm mt-2"><strong>Next:</strong> Complete the assessment header below, then review final rows and download GOEHS batch upload file.</p>
                    </div>
                </div>
            `;
        }
    }

    // Store for later use
    window.goehsTableData = tableData;

    // Populate tasks (Tool 2) - will be called when user navigates to Tool 2
    // Populate hazards (Tool 3) - will be called when user navigates to Tool 3
}
// Re-sync tasks from risk table (user-triggered)
function resyncTasksFromTable() {
    if (!confirm('This will replace all current tasks with data from the risk table. Continue?')) {
        return;
    }
    
    const tableData = extractRiskTableData();
    window.goehsTableData = tableData;
    
    if (tableData.tasks.length === 0) {
        showGoehsAlert('No tasks found in the risk table. Please generate a risk assessment first.', 'warning');
        return;
    }
    
    populateGoehsTasksFromTable(tableData);
    showGoehsAlert(`Re-synced ${tableData.tasks.length} task(s) from risk table.`, 'success');
}

// Push a single GOEHS hazard-row field edit (manual or AI Assist) back to the linked
// main-table row. GOEHS's own category/sub-hazard vocabulary (HAZARD_CATEGORIES in
// ra-registry.js) and the main table's (HAZARD_REGISTRY) both match the same vendor
// whitelist, so this is a direct value copy rather than a lossy re-mapping - if a value
// somehow doesn't line up with the main table's registry it just shows red there, same as
// any other mismatch, and can be cleaned up with AI Fix / Suggest Closest Match.
function syncGoehsHazardFieldToMainTable(sourceRowIndex, field, value) {
    const mainRow = document.querySelector(`#table-container tr[data-row-index="${sourceRowIndex}"]`);
    if (!mainRow) return;
    const v = String(value || '').trim();

    const syncSelect = (selector) => {
        const sel = mainRow.querySelector(selector);
        if (!sel || !v || sel.value === v) return;
        if (!Array.from(sel.options).some(o => o.value === v)) {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            sel.insertBefore(opt, sel.firstChild);
        }
        sel.value = v;
        // Bubbles so the main table's own change handling (score/category recalculation,
        // the live issue pill, hazard-group cascade) runs exactly as if the user had
        // picked this value directly in the main table.
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (field === 'category') {
        syncSelect('.group select');
    } else if (field === 'subHazard') {
        syncSelect('.hazard-list-cell select');
    } else if (field === 'outcome') {
        syncSelect('.consequence-cell select');
    } else if (field === 'hazardSource') {
        const input = mainRow.children[11]?.querySelector('input');
        if (input && input.value !== value) input.value = value;
    } else if (field === 'currentControl') {
        const input = mainRow.children[12]?.querySelector('input');
        if (input && input.value !== value) input.value = value;
    }
}
window.syncGoehsHazardFieldToMainTable = syncGoehsHazardFieldToMainTable;

// Re-sync hazards from risk table (user-triggered)
function resyncHazardsFromTable() {
    if (!confirm('This will replace all current hazards with data from the risk table. Continue?')) {
        return;
    }
    
    const tableData = extractRiskTableData();
    window.goehsTableData = tableData;
    
    if (tableData.hazards.length === 0) {
        showGoehsAlert('No hazards found in the risk table. Please generate a risk assessment first.', 'warning');
        return;
    }
    
    populateGoehsHazardsFromTable(tableData);
    showGoehsAlert(`Re-synced ${tableData.hazards.length} hazard(s) from risk table.`, 'success');
}

function closeGoehsModal() {
    const modal = document.getElementById('goehsModal');
    if (modal) {
        modal.style.display = 'none';
    }

    if (GOEHS_FINAL_REVIEW_STATE.issueObserver) {
        GOEHS_FINAL_REVIEW_STATE.issueObserver.disconnect();
        GOEHS_FINAL_REVIEW_STATE.issueObserver = null;
    }

    GOEHS_FINAL_REVIEW_STATE.issueRefreshScheduled = false;
}

function goToTool(toolNum) {
    if (toolNum > 1 && !validateGoehsRequiredHeaderFields()) {
        return;
    }

    syncGoehsAssessmentTitleDisplays();

    if (isGoehsSingleScreenMode()) {
        ensureGoehsSectionDataLoaded(toolNum);
        const section = document.getElementById(`goehs-tool${toolNum}`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }
    
    // Hide all tabs
    document.querySelectorAll('.goehs-tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.goehs-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-orange-600', 'border-orange-600', 'bg-white');
        btn.classList.add('text-slate-600', 'border-transparent');
        btn.querySelector('span span').classList.remove('bg-orange-600');
        btn.querySelector('span span').classList.add('bg-slate-400');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`goehs-tool${toolNum}`);
    const selectedBtn = document.querySelector(`.goehs-tab-btn[data-tab="tool${toolNum}"]`);
    
    if (selectedTab) selectedTab.classList.remove('hidden');
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'text-orange-600', 'border-orange-600', 'bg-white');
        selectedBtn.classList.remove('text-slate-600', 'border-transparent');
        selectedBtn.querySelector('span span').classList.add('bg-orange-600');
        selectedBtn.querySelector('span span').classList.remove('bg-slate-400');
    }
    
    ensureGoehsSectionDataLoaded(toolNum);
}

// ============ INITIALIZATION ============

function initializeGoehsForm() {
    // Populate OrgName dropdown with vendor org names
    const orgSelect = document.getElementById('goehsOrgName');
    orgSelect.innerHTML = '<option value="">-- Select Organization --</option>';
    
    // Add vendor org names directly
    const vendorOrgs = [
        'Demonstration', 'Global Remediation', 'Global Technology', 'Mfg - Americas', 
        'Mfg - Asia Pacific', 'Mfg - Chemical', 'Mfg - EMEA', 'SAG - AP NM', 'SAG - CTSC',
        'SAG - EMEA NM', 'SAG - EMEA Offices', 'SAG - LA NM', 'SAG - NA NM', 
        'SAG - NA Tire Retail', 'Yokohama'
    ];
    
    vendorOrgs.forEach(org => {
        const opt = document.createElement('option');
        opt.value = org;
        opt.textContent = org;
        orgSelect.appendChild(opt);
    });
    
    // Also add locations from GOEHS_LOCATION_DATA as fallback
    Object.keys(GOEHS_LOCATION_DATA).forEach(orgKey => {
        if (!vendorOrgs.includes(orgKey)) {
            const opt = document.createElement('option');
            opt.value = orgKey;
            opt.textContent = GOEHS_LOCATION_DATA[orgKey].name;
            orgSelect.appendChild(opt);
        }
    });
    
    // Pre-populate date
    const dateInput = document.getElementById('goehsAssessmentDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = formatDateForInput(new Date());
    }
    
    // Pre-populate assessment title from project name if available
    const titleInput = document.getElementById('goehsAssessmentTitle');
    const projectName = document.getElementById('projectNameInput')?.value;
    if (titleInput && !titleInput.value && projectName) {
        titleInput.value = projectName;
    }
    
    // Load saved assessment data from localStorage (except Assessment Title)
    loadGoehsAssessmentData();
}

// Save assessment data to localStorage (except Assessment Title)
function saveGoehsAssessmentData() {
    const data = {
        orgName: document.getElementById('goehsOrgName')?.value || '',
        location: document.getElementById('goehsLocation')?.value || '',
        department: document.getElementById('goehsDepartment')?.value || '',
        workstation: document.getElementById('goehsWorkstation')?.value || ''
    };
    localStorage.setItem('goehsAssessmentData', JSON.stringify(data));
    console.log('✅ GOEHS assessment data saved to localStorage');
}

// Load assessment data from localStorage
function loadGoehsAssessmentData() {
    try {
        const saved = localStorage.getItem('goehsAssessmentData');
        if (!saved) return;
        
        const data = JSON.parse(saved);
        console.log('📋 Loading saved GOEHS assessment data:', data);
        
        // Load organization and trigger cascade
        if (data.orgName) {
            const orgSelect = document.getElementById('goehsOrgName');
            if (orgSelect) {
                orgSelect.value = data.orgName;
                orgSelect.dispatchEvent(new Event('change'));
                
                // Load location after a brief delay to allow cascade
                setTimeout(() => {
                    if (data.location) {
                        const locSelect = document.getElementById('goehsLocation');
                        if (locSelect) {
                            locSelect.value = data.location;
                            locSelect.dispatchEvent(new Event('change'));
                            
                            // Load department and workstation after cascade
                            setTimeout(() => {
                                if (data.department) {
                                    const deptSelect = document.getElementById('goehsDepartment');
                                    if (deptSelect) deptSelect.value = data.department;
                                }
                                if (data.workstation) {
                                    const wsSelect = document.getElementById('goehsWorkstation');
                                    if (wsSelect) wsSelect.value = data.workstation;
                                }
                            }, 100);
                        }
                    }
                }, 100);
            }
        }
    } catch (e) {
        console.error('Error loading GOEHS assessment data:', e);
    }
}

function formatGoehsDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// ============ CASCADING DROPDOWNS ============

document.addEventListener('DOMContentLoaded', function() {
    // OrgName change handler
    document.getElementById('goehsOrgName')?.addEventListener('change', function() {
        const selectedOrg = this.value;
        const locationSelect = document.getElementById('goehsLocation');
        
        // Reset downstream
        locationSelect.innerHTML = '<option value="">-- Select Location --</option>';
        
        if (selectedOrg && VENDOR_LOCATIONS[selectedOrg]) {
            const locations = VENDOR_LOCATIONS[selectedOrg];
            locations.forEach(locName => {
                const opt = document.createElement('option');
                opt.value = locName;
                opt.textContent = locName;
                locationSelect.appendChild(opt);
            });
            locationSelect.disabled = false;
        } else {
            locationSelect.disabled = true;
        }
        
        // Save to localStorage
        saveGoehsAssessmentData();
    });
    
    // Location change handler
    document.getElementById('goehsLocation')?.addEventListener('change', saveGoehsAssessmentData);
    
    // Department change handler - save to localStorage
    document.getElementById('goehsDepartment')?.addEventListener('input', saveGoehsAssessmentData);
    document.getElementById('goehsDepartment')?.addEventListener('change', saveGoehsAssessmentData);
    
    // Workstation change handler - save to localStorage
    document.getElementById('goehsWorkstation')?.addEventListener('input', saveGoehsAssessmentData);
    document.getElementById('goehsWorkstation')?.addEventListener('change', saveGoehsAssessmentData);

    // Assessment title must be provided before XLSX download.
    document.getElementById('goehsAssessmentTitle')?.addEventListener('input', function() {
        if ((this.value || '').trim()) {
            this.classList.remove('goehs-empty-required');
        }
        syncGoehsAssessmentTitleDisplays();
    });
    document.getElementById('goehsAssessmentTitle')?.addEventListener('change', function() {
        if ((this.value || '').trim()) {
            this.classList.remove('goehs-empty-required');
        }
        syncGoehsAssessmentTitleDisplays();
    });
    
    // Tab switching
    document.querySelectorAll('.goehs-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabNum = this.dataset.tab.replace('tool', '');
            goToTool(parseInt(tabNum));
        });
    });
    
    // GOEHS Integration button
    document.getElementById('goehsIntegrationBtn')?.addEventListener('click', openGoehsModal);

    // ============ REVERSE SYNC: GOEHS hazard-row edits -> main risk table ============
    // The main table -> GOEHS direction already existed (extractRiskTableData / re-sync);
    // this covers the other direction so a correction made inside GOEHS Integration
    // (AI Assist or a manual dropdown/text change) doesn't get silently lost the next time
    // the main table happens to re-render. Each GOEHS hazard row carries the linked main
    // row's index in data-source-row-index (set in populateGoehsHazardsFromTable).
    document.getElementById('hazardTableBody')?.addEventListener('change', (e) => {
        const row = e.target.closest('tr[data-source-row-index]');
        if (!row) return;
        const sourceRowIndex = Number(row.dataset.sourceRowIndex);
        if (Number.isNaN(sourceRowIndex)) return;
        if (e.target.classList.contains('hazard-category')) {
            syncGoehsHazardFieldToMainTable(sourceRowIndex, 'category', e.target.value);
        } else if (e.target.classList.contains('hazard-sub')) {
            syncGoehsHazardFieldToMainTable(sourceRowIndex, 'subHazard', e.target.value);
        } else if (e.target.classList.contains('hazard-outcome')) {
            syncGoehsHazardFieldToMainTable(sourceRowIndex, 'outcome', e.target.value);
        } else if (e.target.classList.contains('hazard-counter-ladder')) {
            syncGoehsLadderToMainTable(e.target);
        }
    });
    document.getElementById('hazardTableBody')?.addEventListener('input', (e) => {
        const row = e.target.closest('tr[data-source-row-index]');
        if (!row) return;
        const sourceRowIndex = Number(row.dataset.sourceRowIndex);
        if (Number.isNaN(sourceRowIndex)) return;
        if (e.target.classList.contains('hazard-desc')) {
            syncGoehsHazardFieldToMainTable(sourceRowIndex, 'hazardSource', e.target.value);
        } else if (e.target.classList.contains('hazard-counter-desc')) {
            syncGoehsHazardFieldToMainTable(sourceRowIndex, 'currentControl', e.target.value);
        }
    });

    const goehsHazardLangSelect = document.getElementById('goehsHazardLangSelect');
    if (goehsHazardLangSelect) {
        goehsHazardLangSelect.value = goehsHazardDropdownLang;
        goehsHazardLangSelect.addEventListener('change', (e) => {
            goehsHazardDropdownLang = e.target.value;
            goehsHazardDropdownLangManual = true;
            localStorage.setItem('goehsHazardDropdownLang', goehsHazardDropdownLang);
            relabelGoehsHazardDropdownsInLanguage(goehsHazardDropdownLang);
        });
    }

    // AI Assist button in Final Review header - Hazard / Sub-Hazard correction only
    // (Countermeasure Ladder and Outcome each have their own dedicated controls - see below
    // and populateGoehsHazardsFromTable respectively).
    const goehsAiAssistBtn = document.getElementById('goehsAiAssistBtn');
    if (goehsAiAssistBtn && goehsAiAssistBtn.dataset.goehsBound !== '1') {
        goehsAiAssistBtn.addEventListener('click', aiAssistHazardFields);
        goehsAiAssistBtn.dataset.goehsBound = '1';
    }

    // Fix Countermeasure Ladder flyout - AI (network call, for text the local keyword
    // engine can't classify) and Intelligent (local keyword matching only, free/instant).
    // Reuses the main table's proven flyout mechanism (see window.initRabDropdown).
    const goehsFixLadderBtn = document.getElementById('goehsFixLadderBtn');
    const goehsFixLadderPanel = document.getElementById('goehsFixLadderPanel');
    if (goehsFixLadderBtn && goehsFixLadderPanel && goehsFixLadderBtn.dataset.goehsBound !== '1') {
        if (typeof window.initRabDropdown === 'function') {
            window.initRabDropdown(goehsFixLadderBtn, goehsFixLadderPanel);
        }
        document.getElementById('goehsFixLadderAiBtn')?.addEventListener('click', aiFixCountermeasureLadder);
        document.getElementById('goehsFixLadderIntelligentBtn')?.addEventListener('click', aiPopulateHazardFields);
        goehsFixLadderBtn.dataset.goehsBound = '1';
    }

    // Remap Columns button - opens manual column mapper with existing file
    document.getElementById('remapColumnsBtn')?.addEventListener('click', function() {
        if (window.ra2025LoadedFile) {
            // Re-open the column mapper with the stored file and sheet index
            window.ra2025PendingFile = window.ra2025LoadedFile;
            window.openRA2025ColumnMapper(window.ra2025LoadedFile, window.ra2025SelectedSheetIndex || null);
        } else {
            alert('No RA 2025 file loaded. Please upload an Excel file first using the GOEHS Integration upload.');
        }
    });
    
    // Close on overlay click
    document.getElementById('goehsModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeGoehsModal();
    });
});

// ============ TASK MANAGEMENT (Tool 2) ============

function addTaskRow() {
    taskIdCounter++;
    const taskId = `task-${taskIdCounter}`;
    
    const taskData = {
        id: taskId,
        taskName: '',
        taskDescription: '',
        conditionMode: '',
        coreActivity: '',
        jobTitle: ''
    };
    goehsTasks.push(taskData);
    
    const container = document.getElementById('taskRowsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.id = taskId;
    row.className = 'task-row bg-slate-50 border border-slate-200 rounded-lg p-4';
    
    row.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h4 class="font-semibold text-slate-800">Task #${goehsTasks.length}</h4>
            <button type="button" onclick="removeTaskRow('${taskId}')" class="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Remove
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div class="lg:col-span-1">
                <label class="block text-sm font-medium text-slate-700 mb-1">Task Name <span class="text-red-500">*</span></label>
                <input type="text" class="task-name w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="Enter task name" required>
            </div>
            <div class="lg:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Task Description</label>
                <input type="text" class="task-description w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="Describe the task">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Condition Mode <span class="text-red-500">*</span></label>
                <select class="task-condition w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Select --</option>
                    <option value="Routine" selected>Routine</option>
                    <option value="Non-Routine">Non-Routine</option>
                    <option value="Emergency Situation">Emergency Situation</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Core Activity</label>
                <select class="task-activity w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Select --</option>
                    ${CORE_ACTIVITIES.map(a => `<option value="${a}">${a}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <select class="task-jobtitle w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Select --</option>
                    ${JOB_TITLES.map(j => `<option value="${j}">${j}</option>`).join('')}
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(row);
}

function removeTaskRow(taskId) {
    if (goehsTasks.length <= 1) {
        showGoehsAlert('You must have at least one task.', 'warning');
        return;
    }
    goehsTasks = goehsTasks.filter(t => t.id !== taskId);
    document.getElementById(taskId)?.remove();
    renumberTasks();
}

function renumberTasks() {
    document.querySelectorAll('.task-row').forEach((row, index) => {
        row.querySelector('h4').textContent = `Task #${index + 1}`;
    });
}

function collectTaskData() {
    const tasks = [];

    document.querySelectorAll('.task-row').forEach(row => {
        const taskName = (row.querySelector('.task-name')?.value || '').trim();
        if (!taskName) return;

        tasks.push({
            taskName,
            taskDescription: (row.querySelector('.task-description')?.value || taskName).trim(),
            conditionMode: normalizeGoehsConditionMode(row.querySelector('.task-condition')?.value || 'Routine'),
            coreActivity: (row.querySelector('.task-activity')?.value || suggestCoreActivity(taskName) || '').trim(),
            jobTitle: (row.querySelector('.task-jobtitle')?.value || suggestJobTitle(taskName) || '').trim()
        });
    });

    if (tasks.length > 0) {
        return tasks;
    }

    // In single-pane mode (no Task section), infer task metadata from the risk table and hazard rows.
    const map = {};
    const taskMetaFromTable = getGoehsTaskMetadataMap();
    Object.keys(taskMetaFromTable).forEach(name => {
        map[name] = {
            taskName: name,
            taskDescription: taskMetaFromTable[name].taskDescription || name,
            conditionMode: normalizeGoehsConditionMode(taskMetaFromTable[name].conditionMode || 'Routine'),
            coreActivity: taskMetaFromTable[name].coreActivity || suggestCoreActivity(name) || '',
            jobTitle: taskMetaFromTable[name].jobTitle || suggestJobTitle(name) || ''
        };
    });

    getActiveHazardTableRows().forEach(row => {
        const taskName = (row.querySelector('.hazard-task')?.value || '').trim();
        if (!taskName) return;

        if (!map[taskName]) {
            map[taskName] = {
                taskName,
                taskDescription: taskName,
                conditionMode: 'Routine',
                coreActivity: suggestCoreActivity(taskName) || '',
                jobTitle: suggestJobTitle(taskName) || ''
            };
        }

        const mode = normalizeGoehsConditionMode(row.querySelector('.hazard-mode')?.value || map[taskName].conditionMode);
        map[taskName].conditionMode = mode;
    });

    return Object.values(map);
}

// ============ INTELLIGENT FILL FUNCTIONS ============

// AI populate task fields (Core Activity and Job Title)
async function aiPopulateTaskFields() {
    const taskRows = document.querySelectorAll('.task-row');
    if (taskRows.length === 0) {
        showGoehsAlert('Task section is disabled in single-pane mode. Task metadata is inferred from risk-table and row selections.', 'info');
        return;
    }
    
    let updated = 0;
    let couldNotMatch = 0;
    
    taskRows.forEach(row => {
        const taskName = row.querySelector('.task-name')?.value || '';
        const activitySelect = row.querySelector('.task-activity');
        const jobSelect = row.querySelector('.task-jobtitle');
        
        // Use intelligent suggestion functions
        const suggestedActivity = suggestCoreActivity(taskName);
        const suggestedJob = suggestJobTitle(taskName);
        
        // Update Core Activity - even if already has value (force update)
        if (suggestedActivity && activitySelect) {
            activitySelect.value = suggestedActivity;
            // Add AI-filled visual indicator
            activitySelect.classList.add('goehs-ai-prefilled');
            activitySelect.classList.remove('goehs-empty-required');
            updated++;
        } else if (activitySelect && !activitySelect.value) {
            // Mark as needing attention if no suggestion and empty
            activitySelect.classList.add('goehs-empty-required');
            activitySelect.classList.remove('goehs-ai-prefilled');
            couldNotMatch++;
        }
        
        // Update Job Title - even if already has value (force update)
        if (suggestedJob && jobSelect) {
            jobSelect.value = suggestedJob;
            // Add AI-filled visual indicator
            jobSelect.classList.add('goehs-ai-prefilled');
            jobSelect.classList.remove('goehs-empty-required');
            updated++;
        } else if (jobSelect && !jobSelect.value) {
            // Mark as needing attention if no suggestion and empty
            jobSelect.classList.add('goehs-empty-required');
            jobSelect.classList.remove('goehs-ai-prefilled');
            couldNotMatch++;
        }
    });
    
    if (updated > 0) {
        showGoehsAlert(`✅ Intelligent Fill: Updated ${updated} field(s) based on task name keywords.${couldNotMatch > 0 ? ` ${couldNotMatch} field(s) need manual selection (highlighted in red).` : ''}`, 'success');
    } else {
        showGoehsAlert('� ️ Could not find matching suggestions for any task names. Fields that need attention are highlighted in red.', 'warning');
        // Highlight all empty fields
        highlightEmptyTaskFields();
    }
}

// Highlight empty Core Activity and Job Title fields
function highlightEmptyTaskFields() {
    document.querySelectorAll('.task-row').forEach(row => {
        const activitySelect = row.querySelector('.task-activity');
        const jobSelect = row.querySelector('.task-jobtitle');
        
        if (activitySelect && !activitySelect.value) {
            activitySelect.classList.add('goehs-empty-required');
        }
        if (jobSelect && !jobSelect.value) {
            jobSelect.classList.add('goehs-empty-required');
        }
    });
}

// AI populate hazard fields (Countermeasure Ladder based on control description)
async function aiPopulateHazardFields() {
    const hazardRows = getActiveHazardTableRows();
    if (hazardRows.length === 0) {
        showGoehsAlert('No hazards to populate. Add hazards first.', 'warning');
        return;
    }
    
    let updated = 0;
    // Tracked separately from `updated` so the end message can tell "nothing to read" apart
    // from "read plenty of text, none of it matched a recognized keyword" - the latter is
    // common for non-English or site-specific control text (e.g. internal policy codes)
    // that this local keyword engine was never going to recognize.
    let hadUnmatchedText = false;
    hazardRows.forEach(row => {
        const counterDesc = row.querySelector('.hazard-counter-desc')?.value || '';
        const hazardDesc = row.querySelector('.hazard-desc')?.value || '';
        const outcomeText = row.querySelector('.hazard-outcome')?.value || '';
        const counterLadderSelect = row.querySelector('.hazard-counter-ladder');
        const predDesc = row.querySelector('.hazard-pred-desc')?.value || '';
        const predLadderSelect = row.querySelector('.hazard-pred-ladder');

        const hasSelectedLadder = (selectEl) => !!selectEl && Array.from(selectEl.selectedOptions || []).length > 0;
        const ladderSourceText = [counterDesc, hazardDesc, outcomeText].map(v => String(v || '').trim()).filter(Boolean).join(' | ');

        // Suggest countermeasure ladder based on description
        if (ladderSourceText && counterLadderSelect && !hasSelectedLadder(counterLadderSelect)) {
            const suggestions = suggestCountermeasureLadder(ladderSourceText);
            if (suggestions.length > 0) {
                // Clear existing selections
                Array.from(counterLadderSelect.options).forEach(opt => opt.selected = false);
                // Select suggested options
                suggestions.forEach(s => {
                    const opt = Array.from(counterLadderSelect.options).find(o => o.value === s);
                    if (opt) opt.selected = true;
                });
                // Add visual indicator
                counterLadderSelect.classList.add('goehs-ai-prefilled');
                updated++;
            } else {
                hadUnmatchedText = true;
            }
        } else if (counterLadderSelect && hasSelectedLadder(counterLadderSelect)) {
            counterLadderSelect.classList.add('goehs-ai-prefilled');
        }

        if (predDesc && predLadderSelect) {
            const suggestions = suggestCountermeasureLadder(predDesc);
            if (suggestions.length > 0) {
                Array.from(predLadderSelect.options).forEach(opt => opt.selected = false);
                suggestions.forEach(s => {
                    const opt = Array.from(predLadderSelect.options).find(o => o.value === s);
                    if (opt) opt.selected = true;
                });
                // Add visual indicator
                predLadderSelect.classList.add('goehs-ai-prefilled');
                updated++;
            } else if (predDesc.trim()) {
                hadUnmatchedText = true;
            }
        }
    });

    if (updated > 0) {
        showGoehsAlert(`✅ Intelligent Fill: Updated ${updated} countermeasure ladder field(s) based on control description keywords.`, 'success');
    } else if (hadUnmatchedText) {
        showGoehsAlert('ℹ️ Control descriptions were found, but none matched a recognized keyword (e.g. "guard", "training", "eliminate", "PPE"). This is common for non-English or site-specific text (policy codes, internal program names, etc.) - try 🤖 AI instead, which reads the description\'s meaning rather than matching fixed keywords.', 'info');
    } else {
        showGoehsAlert('ℹ️ No control descriptions found to analyze. Enter control descriptions first.', 'info');
    }
}

// Applies a list of Countermeasure Ladder level values to a (multi-select) ladder <select>,
// clearing any prior selection first. Shared by the local and AI passes below.
function applyLadderSelection(selectEl, levels) {
    if (!selectEl || !levels || levels.length === 0) return false;
    Array.from(selectEl.options).forEach(opt => { opt.selected = false; });
    let matched = 0;
    levels.forEach(level => {
        const opt = Array.from(selectEl.options).find(o => o.value === level);
        if (opt) { opt.selected = true; matched++; }
    });
    if (matched > 0) {
        selectEl.classList.add('goehs-ai-prefilled');
        // Write the AI-assigned ladder straight back to the main table row this hazard
        // came from - otherwise it only ever exists in this <select>'s in-memory state,
        // and a later "Refresh Hazards" resync (which rebuilds this table from the main
        // table) silently wipes it out since the main table never learned about it.
        syncGoehsLadderToMainTable(selectEl);
    }
    return matched > 0;
}

// Push the current selection of a hazard row's Countermeasure Ladder <select> (Current or
// Predictive) back onto the linked main-table row's data-countermeasure-ladder attribute -
// the single source of truth that populateGoehsHazardsFromTable/resyncHazardsFromTable reads
// from. Called on manual selection (onchange) and after any AI/Intelligent ladder fill.
function syncGoehsLadderToMainTable(selectEl) {
    const hazardRow = selectEl && selectEl.closest('tr[data-source-row-index]');
    if (!hazardRow) return;
    const mainRow = document.querySelector(`#table-container tr[data-row-index="${hazardRow.dataset.sourceRowIndex}"]`);
    if (!mainRow) return;

    const selected = Array.from(selectEl.selectedOptions).map(o => o.value).filter(Boolean);
    if (selected.length > 0) {
        mainRow.setAttribute('data-countermeasure-ladder', selected.join(', '));
    } else {
        mainRow.removeAttribute('data-countermeasure-ladder');
    }
}
window.syncGoehsLadderToMainTable = syncGoehsLadderToMainTable;

// AI Fix Countermeasure Ladder - the "AI" option in the Fix Countermeasure Ladder flyout.
// Covers BOTH Current and Predictive ladder fields, same scope as Intelligent Fill
// (aiPopulateHazardFields above). Runs the same free local keyword pass first (so nothing
// costs an API call unless it has to), then sends only the rows the keyword engine
// couldn't classify - e.g. "L1", "(2)", or phrasing with no recognized synonym - to the
// AI, batched to avoid payload-too-large errors on large tables.
async function aiFixCountermeasureLadder() {
    const hazardRows = getActiveHazardTableRows();
    if (hazardRows.length === 0) {
        showGoehsAlert('No hazards to fix. Add hazards first.', 'warning');
        return;
    }

    const btn = document.getElementById('goehsFixLadderAiBtn');
    const originalText = btn ? btn.innerHTML : '';
    // Same spinner SVG + animate-spin utility already used elsewhere in this app (e.g. the
    // main loading overlay) - inline via currentColor so it matches the button's text color.
    const spinnerSVG = `<svg class="animate-spin h-3.5 w-3.5 inline-block align-middle" style="margin-right:4px" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle style="opacity:.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity:.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    const setBtnLabel = (label) => { if (btn) btn.innerHTML = `${spinnerSVG}${label}`; };
    if (btn) { setBtnLabel('AI…'); btn.disabled = true; }

    try {
        const hasSelectedLadder = (selectEl) => !!selectEl && Array.from(selectEl.selectedOptions || []).length > 0;

        // PASS 1: local keyword engine (free), for any ladder field not already selected.
        let localFixed = 0;
        let alreadySelected = 0;
        let noTextFound = 0;
        const needsAi = []; // { select, text }

        hazardRows.forEach(row => {
            const counterDesc = row.querySelector('.hazard-counter-desc')?.value || '';
            const hazardDesc = row.querySelector('.hazard-desc')?.value || '';
            const outcomeText = row.querySelector('.hazard-outcome')?.value || '';
            const counterLadderSelect = row.querySelector('.hazard-counter-ladder');
            const predDesc = row.querySelector('.hazard-pred-desc')?.value || '';
            const predLadderSelect = row.querySelector('.hazard-pred-ladder');

            const currentText = [counterDesc, hazardDesc, outcomeText].map(v => String(v || '').trim()).filter(Boolean).join(' | ');
            if (counterLadderSelect) {
                if (hasSelectedLadder(counterLadderSelect)) {
                    alreadySelected++;
                } else if (currentText) {
                    if (applyLadderSelection(counterLadderSelect, suggestCountermeasureLadder(currentText))) {
                        localFixed++;
                    } else {
                        needsAi.push({ select: counterLadderSelect, text: currentText });
                    }
                } else {
                    noTextFound++;
                }
            }

            const predText = String(predDesc || '').trim();
            if (predLadderSelect) {
                if (hasSelectedLadder(predLadderSelect)) {
                    alreadySelected++;
                } else if (predText) {
                    if (applyLadderSelection(predLadderSelect, suggestCountermeasureLadder(predText))) {
                        localFixed++;
                    } else {
                        needsAi.push({ select: predLadderSelect, text: predText });
                    }
                } else {
                    noTextFound++;
                }
            }
        });

        if (needsAi.length === 0) {
            let message;
            let type;
            if (localFixed > 0) {
                message = `✅ AI Fix: ${localFixed} field(s) matched via local keyword engine. No AI call needed.`;
                type = 'success';
            } else if (alreadySelected > 0 && noTextFound === 0) {
                message = `ℹ️ All ${alreadySelected} ladder field(s) already have a selection - nothing left to fix. Clear a selection first if you want it re-classified.`;
                type = 'info';
            } else {
                message = 'ℹ️ No control descriptions found to analyze. Enter control descriptions first.';
                type = 'info';
            }
            showGoehsAlert(message, type);
            return;
        }

        // PASS 2: AI for whatever the local pass couldn't classify, batched.
        const BATCH_SIZE = 20;
        let aiFixed = 0;
        let batchErrors = 0;
        const totalBatches = Math.ceil(needsAi.length / BATCH_SIZE);

        for (let start = 0; start < needsAi.length; start += BATCH_SIZE) {
            const batchNum = Math.floor(start / BATCH_SIZE) + 1;
            setBtnLabel(totalBatches > 1 ? `AI… (${batchNum}/${totalBatches})` : 'AI…');
            const batch = needsAi.slice(start, start + BATCH_SIZE);
            const prompt = `You are a workplace safety expert classifying control measures onto a Countermeasure Ladder.

COUNTERMEASURE LADDER LEVELS:
- "Level 6 - Elimination" - Completely removing the hazard
- "Level 5 - Substitution" - Replacing with something safer
- "Level 4 - Engineering Controls" - Physical changes (guards, barriers, interlocks, ventilation)
- "Level 3 - Visual Controls" - Visual warnings (signs, labels, floor markings, mirrors)
- "Level 2 - Administrative Controls" - Procedures (training, SOPs, permits, inspections)
- "Level 1 - Individual Target" - PPE (gloves, goggles, helmets, safety shoes)

CONTROL DESCRIPTIONS TO CLASSIFY (0-based index) - some may use shorthand like "L1", "(2)", or a level number alone; infer the intended level(s):
${batch.map((c, i) => `${i}. "${c.text}"`).join('\n')}

IMPORTANT:
1. Each description can match MULTIPLE levels.
2. Use EXACT level names from the list above.
3. "index" in your response MUST match the 0-based index shown above exactly.

Return ONLY a valid JSON array (no explanation, no markdown):
[{"index": 0, "levels": ["Level X - Name", "Level Y - Name"]}, ...]`;

            try {
                const response = await fetch(GOEHS_GLOBAL_API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'openai/gpt-4o-mini', prompt })
                });
                if (!response.ok) throw new Error(`API request failed: ${response.status}`);

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (!jsonMatch) throw new Error('AI did not return valid JSON array');

                const suggestions = JSON.parse(jsonMatch[0]);
                suggestions.forEach(s => {
                    const item = batch[Number(s.index)];
                    if (!item) return;
                    const validatedLevels = (s.levels || [])
                        .map(l => COUNTERMEASURE_LADDER.find(v => v.toLowerCase() === String(l).toLowerCase()))
                        .filter(Boolean);
                    if (applyLadderSelection(item.select, validatedLevels)) {
                        aiFixed++;
                    }
                });
            } catch (batchError) {
                console.error('AI Fix Countermeasure Ladder batch failed:', batchError);
                batchErrors++;
            }
        }

        const total = localFixed + aiFixed;
        scheduleGoehsIssueCounterRefresh();
        showGoehsAlert(
            `✅ AI Fix Countermeasure Ladder: ${total} field(s) fixed (${localFixed} local + ${aiFixed} AI).${batchErrors > 0 ? ` ${batchErrors} batch(es) failed - try again.` : ''}`,
            total > 0 ? 'success' : 'info'
        );
    } catch (err) {
        console.error('AI Fix Countermeasure Ladder error:', err);
        showGoehsAlert(`❌ AI Fix Countermeasure Ladder failed: ${err.message}. Try Intelligent instead.`, 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

// Intelligent countermeasure ladder suggestion based on control description
// Uses comprehensive keyword matching for hierarchy of controls
// Also handles multiple countermeasures in single input and extracts numeric codes
function suggestCountermeasureLadder(description) {
    const desc = (description || '').toLowerCase().trim();
    const suggestions = [];
    // Also collect structured suggestion metadata (code + translations + matchedSynonym)
    const suggestionsMeta = [];
    
    // HELPER: Extract all countermeasures with optional embedded numeric codes
    // Examples:
    //   "Code de la route(2)Panneaux de signalisation(3)Ceinture de securité(1)"
    //   "training(5), guards(3)"
    const extractCountermeasures = (text) => {
        const result = [];
        if (text.includes('(')) {
            // Structured format with embedded numeric codes, e.g.
            // "training(5), guards(3)" or "Code de la route(2)Panneaux de signalisation(3)"
            const regex = /([^()]+)(?:\((\d)\))?/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const itemText = (match[1] || '').trim();
                const embeddedCode = match[2] ? parseInt(match[2]) : null;
                if (itemText && itemText.length > 1) {
                    result.push({ text: itemText, code: embeddedCode });
                }
            }
            return result;
        }

        // No parentheses: split on list delimiters so plain-text inputs like
        // "1,2,3" or "guard 2, ppe 1" resolve to multiple independent countermeasures.
        const segments = text.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        if (segments.length > 1) {
            segments.forEach(seg => result.push({ text: seg, code: null }));
        } else if (text.trim()) {
            result.push({ text: text.trim(), code: null });
        }
        return result;
    };
    
    // HELPER: Map numeric code (1-6) to English level label
    const codeToLabel = {
        6: 'Level 6 - Elimination',
        5: 'Level 5 - Substitution',
        4: 'Level 4 - Engineering Controls',
        3: 'Level 3 - Visual Controls',
        2: 'Level 2 - Administrative Controls',
        1: 'Level 1 - Individual Target'
    };

    // COUNTERMEASURE_INFO maps the canonical English label to:
    // - code: numeric (1 = Elimination, 2 = Substitution, ...)
    // - fr: French translation
    // - de: German translation
    // - synonyms: array of regexes or strings used for matching
    const COUNTERMEASURE_INFO = {
        'Level 6 - Elimination': {
            code: 6,
            fr: 'Niveau 6 - Élimination',
            de: 'Ebene 6 - Beseitigung',
            synonyms: [
                /\beliminat/i,
                /\bremove\b/i,
                /phase\s*out/i,
                /supprimer/i,
                /beseitigen/i,
                /decom?mission/i,
                /shut\s*down/i,
                /stop\s*using/i,
                /no\s*longer/i,
                /discontinue/i,
                /close\s*(down)?/i,
                /take\s*out\s*of\s*service/i,
                /mise\s*hors\s*service/i,
                /außer\s*betrieb/i,
                /stillleg(en|ung)/i,
                /deinstallier/i
            ]
        },
        'Level 5 - Substitution': {
            code: 5,
            fr: 'Niveau 5 - Substitution',
            de: 'Ebene 5 - Substitution',
            synonyms: [
                /\bsubstitut/i,
                /\breplac(e|ement|ing)\b/i,
                /\bswitch\s*(to|over)\b/i,
                /\bswap\s*(to|with)?\b/i,
                /alternative/i,
                /safer\s*/i,
                /less\s*hazardous/i,
                /remplac(er|ement)/i,
                /ersatz|ersetzen|statt/i
            ]
        },
        'Level 4 - Engineering Controls': {
            code: 4,
            fr: "Niveau 4 - Contrôles d'ingénierie",
            de: 'Ebene 4 - Technische Schutzmaßnahmen',
            synonyms: [
                /guard(s?)\b/i,
                /barrier(s?)\b/i,
                /enclosur(e|es)?\b/i,
                /ventilat/i,
                /interlock/i,
                /machine\s*guard/i,
                /safety\s*device/i,
                /exhaust/i,
                /isolat/i,
                /shield/i,
                /hood\b/i,
                /fume\s*hood/i,
                /local\s*exhaust/i,
                /dust\s*collector/i,
                /noise\s*enclos/i,
                /bau|retrofit|redesign/i,
                /schutzvorrichtung|schutz/i,
                /absaug/i,
                /abluft|lüftung/i
            ]
        },
        'Level 3 - Visual Controls': {
            code: 3,
            fr: 'Niveau 3 - Contrôles visuels',
            de: 'Ebene 3 - Sichtbare Kontrollen',
            synonyms: [
                /\bsign(s?)\b/i,
                /label(s?)\b/i,
                /mark(ing|ed|er)s?\b/i,
                /color\s*cod(e)?/i,
                /floor\s*mark(ing|ings)?/i,
                /beacon|strobe|flash/i,
                /poster|placard|banner/i,
                /tape|striping|reflective/i,
                /mirror(s?)\b/i,
                /pancarte|marquage|étiquette/i,
                /schild|kennzeichnung|markierung/i
            ]
        },
        'Level 2 - Administrative Controls': {
            code: 2,
            fr: 'Niveau 2 - Contrôles administratifs',
            de: 'Ebene 2 - Administrative Maßnahmen',
            synonyms: [
                /procedure(s?)\b/i,
                /training|formation|schulung/i,
                /sop|work\s*instruction/i,
                /permit\s*to\s*work|permit\b/i,
                /inspection|audit|checklist/i,
                /rotation|job\s*rotation/i,
                /schedule|policy|guideline/i,
                /supervision|monitoring/i,
                /method\s*statement|risk\s*assessment/i,
                /procédure|verfahren|anweisung/i
            ]
        },
        'Level 1 - Individual Target': {
            code: 1,
            fr: 'Niveau 1 - Objectif individuel (EPI)',
            de: 'Ebene 1 - Individuelles Ziel (PSA)',
            synonyms: [
                /\bppe\b|personal\s*protective/i,
                /glove(s?)|handschutz|handschuh/i,
                /goggle(s?)|safety\s*glass(es)?|schutzbrille/i,
                /helmet|hard\s*hat|helm/i,
                /respirator|mask|masque|atemschutz/i,
                /safety\s*shoe(s?)|boot(s?)|sicherheitschuh/i,
                /vest|high\s*vis|hi[- ]?vis/i,
                /harness|fall\s*arrest|lanyard/i,
                /apron|coverall|overall|schutzkleidung/i,
                /protective\s*equipment|équipement\s*personnel|schutzausrüstung/i
            ]
        }
    };
    
    // Skip empty or explicit "not applicable" placeholder values.
    // No blanket minimum-length cutoff: short-but-meaningful input like a bare
    // level number ("1", "2") or code ("L2") must still reach the matching logic below.
    if (!desc || desc === 'n/a' || desc === 'na' || desc === '-' || desc === 'none') {
        return suggestions;
    }
    
    // HELPER: Check a single item (text) against countermeasure info
    // Returns matched label if found, null otherwise
    const checkCountermeasureItem = (itemText) => {
        // 1. Check direct level references (e.g., "Level 1", "L1")
        if (itemText.match(/\blevel\s*6\b|\bl6\b|\beliminat/i)) return 'Level 6 - Elimination';
        if (itemText.match(/\blevel\s*5\b|\bl5\b|substitut/i)) return 'Level 5 - Substitution';
        if (itemText.match(/\blevel\s*4\b|\bl4\b|engineering\s*control/i)) return 'Level 4 - Engineering Controls';
        if (itemText.match(/\blevel\s*3\b|\bl3\b|visual\s*control/i)) return 'Level 3 - Visual Controls';
        if (itemText.match(/\blevel\s*2\b|\bl2\b|\badmin\b|administrative\s*control/i)) return 'Level 2 - Administrative Controls';
        if (itemText.match(/\blevel\s*1\b|\bl1\b|individual\s*target|ppe/i)) return 'Level 1 - Individual Target';
        
        // 2. Check synonyms for all levels
        for (const [label, info] of Object.entries(COUNTERMEASURE_INFO)) {
            if (info.synonyms.some(syn => (typeof syn === 'string' ? itemText.includes(syn) : syn.test(itemText)))) {
                return label;
            }
        }

        // 3. Fallback: bare trailing level number (e.g. "guad 2", "simple 3")
        // Catches typo'd or unrecognized keywords when the user still typed an explicit 1-6 code.
        const trailingCode = itemText.match(/(?:^|\s)([1-6])\s*$/);
        if (trailingCode && codeToLabel[parseInt(trailingCode[1], 10)]) {
            return codeToLabel[parseInt(trailingCode[1], 10)];
        }

        return null;
    };
    
    // EXTRACT and PROCESS: Multiple countermeasures with embedded codes
    // Example: "Code de la route(2)Panneaux de signalisation(3)Ceinture de securité(1)"
    const countermeasures = extractCountermeasures(desc);
    
    if (countermeasures.length > 0) {
        // Multi-item mode: process each extracted countermeasure
        for (const item of countermeasures) {
            let matchedLabel = null;
            
            // Priority 1: Use embedded numeric code (if present)
            if (item.code && codeToLabel[item.code]) {
                matchedLabel = codeToLabel[item.code];
                if (!suggestions.includes(matchedLabel)) {
                    suggestions.push(matchedLabel);
                    suggestionsMeta.push({ 
                        label: matchedLabel, 
                        ...COUNTERMEASURE_INFO[matchedLabel], 
                        matchedSynonym: `embedded-code-${item.code}`,
                        source: item.text
                    });
                }
            }
            
            // Priority 2: Fall back to synonym matching on item text
            if (!matchedLabel) {
                matchedLabel = checkCountermeasureItem(item.text.toLowerCase());
                if (matchedLabel && !suggestions.includes(matchedLabel)) {
                    suggestions.push(matchedLabel);
                    suggestionsMeta.push({ 
                        label: matchedLabel, 
                        ...COUNTERMEASURE_INFO[matchedLabel], 
                        matchedSynonym: 'text-synonym-match',
                        source: item.text
                    });
                }
            }
        }
    } else {
        // Single-item mode: process entire description as one countermeasure
        const matchedLabel = checkCountermeasureItem(desc);
        if (matchedLabel && !suggestions.includes(matchedLabel)) {
            suggestions.push(matchedLabel);
            suggestionsMeta.push({ 
                label: matchedLabel, 
                ...COUNTERMEASURE_INFO[matchedLabel], 
                matchedSynonym: 'text-synonym-match',
                source: desc
            });
        }
    }
    
    // Expose structured suggestion metadata for UI use (codes + translations)
    window.lastCountermeasureSuggestionsMeta = suggestionsMeta;
    return suggestions;
}

// ============ AI ASSIST FUNCTIONS (OpenRouter) ============

// AI Assist for Task Fields - calls external AI to suggest Core Activity and Job Title
async function aiAssistTaskFields() {
    const taskRows = document.querySelectorAll('.task-row');
    if (taskRows.length === 0) {
        showGoehsAlert('No tasks to analyze. Add tasks first.', 'warning');
        return;
    }
    
    // Collect task names for AI analysis
    const taskData = [];
    taskRows.forEach((row, index) => {
        const taskName = row.querySelector('.task-name')?.value || '';
        if (taskName.trim()) {
            taskData.push({ index, taskName, row });
        }
    });
    
    if (taskData.length === 0) {
        showGoehsAlert('No task names entered. Enter task names first.', 'warning');
        return;
    }
    
    // Show loading state
    const aiBtn = document.querySelector('button[onclick="aiAssistTaskFields()"]');
    const originalText = aiBtn?.innerHTML;
    if (aiBtn) {
        aiBtn.innerHTML = '⏳ AI Processing...';
        aiBtn.disabled = true;
    }
    
    try {
        // Build prompt for AI
        const prompt = `You are a workplace safety expert helping categorize industrial tasks.

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
]`;

        // Call the API - use global endpoint constant
        let response;
        try {
            response = await fetch(GOEHS_GLOBAL_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',  // Use same paid model as main app
                    prompt: prompt
                })
            });
        } catch (networkError) {
            throw new Error('Network error - API server may be unavailable. Use Intelligent Fill instead.');
        }
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            if (response.status === 404) {
                throw new Error('API endpoint not found (404). The AI service may be temporarily unavailable. Use Intelligent Fill instead.');
            }
            throw new Error(`API request failed: ${response.status} - ${errorText}. Use Intelligent Fill instead.`);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Parse the AI response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI did not return valid JSON array');
        }
        
        const suggestions = JSON.parse(jsonMatch[0]);
        
        // Apply suggestions to task rows
        let updated = 0;
        suggestions.forEach(suggestion => {
            const taskItem = taskData[suggestion.taskIndex];
            if (!taskItem) return;
            
            const activitySelect = taskItem.row.querySelector('.task-activity');
            const jobSelect = taskItem.row.querySelector('.task-jobtitle');
            
            // Update Core Activity if valid
            if (suggestion.coreActivity && activitySelect) {
                const validOption = Array.from(activitySelect.options).find(
                    opt => opt.value.toLowerCase() === suggestion.coreActivity.toLowerCase()
                );
                if (validOption) {
                    activitySelect.value = validOption.value;
                    activitySelect.classList.add('goehs-ai-prefilled');
                    activitySelect.classList.remove('goehs-empty-required');
                    updated++;
                }
            }
            
            // Update Job Title if valid
            if (suggestion.jobTitle && jobSelect) {
                const validOption = Array.from(jobSelect.options).find(
                    opt => opt.value.toLowerCase() === suggestion.jobTitle.toLowerCase()
                );
                if (validOption) {
                    jobSelect.value = validOption.value;
                    jobSelect.classList.add('goehs-ai-prefilled');
                    jobSelect.classList.remove('goehs-empty-required');
                    updated++;
                }
            }
        });
        
        if (updated > 0) {
            showGoehsAlert(`🤖 AI Assist: Updated ${updated} field(s) using external AI analysis.`, 'success');
        } else {
            showGoehsAlert('� ️ AI could not match any tasks. Try Intelligent Fill instead.', 'warning');
        }
        
    } catch (error) {
        console.error('AI Assist error:', error);
        showGoehsAlert(`❌ AI Assist failed: ${error.message}. Try Intelligent Fill instead.`, 'error');
    } finally {
        // Restore button state
        if (aiBtn) {
            aiBtn.innerHTML = originalText;
            aiBtn.disabled = false;
        }
    }
}

// AI Assist for Hazard Fields
// - Preserves user-entered Current Control text
// - Uses Current Control to suggest ladder levels
// - Sends ONLY rows with missing/mismatch dropdowns to AI for correction
async function aiAssistHazardFields() {
    const hazardRows = getActiveHazardTableRows();
    if (hazardRows.length === 0) {
        showGoehsAlert('No hazards to analyze. Add hazards first.', 'warning');
        return;
    }

    // Show loading state
    const aiBtn = document.getElementById('goehsAiAssistBtn') || document.querySelector('button[onclick="aiAssistHazardFields()"]');
    const originalText = aiBtn?.innerHTML;
    if (aiBtn) {
        aiBtn.innerHTML = '⏳ AI Processing...';
        aiBtn.disabled = true;
    }

    try {
        const toOptionValues = (selectEl) => {
            if (!selectEl) return [];
            return Array.from(selectEl.options)
                .map(opt => (opt.value || '').trim())
                .filter(value => value);
        };

        const matchSelectOption = (selectEl, rawValue) => {
            if (!selectEl || !rawValue) return null;
            const value = String(rawValue).trim();
            if (!value) return null;

            const reversed = window.reverseTranslate ? (window.reverseTranslate(value) || value) : value;
            const candidates = [value, reversed].map(v => v.toLowerCase());

            return Array.from(selectEl.options).find(opt => {
                const optValue = (opt.value || '').trim().toLowerCase();
                const optLabel = (opt.textContent || '').trim().toLowerCase();
                return candidates.includes(optValue) || candidates.includes(optLabel);
            }) || null;
        };

        // 1) Local ladder suggestion pass from user-entered Current Control.
        let ladderUpdatedRows = 0;
        const rowsNeedingDropdownAssist = [];

        hazardRows.forEach(row => {
            const taskName = row.querySelector('.hazard-task')?.value?.trim() || '';
            const hazardSelect = row.querySelector('.hazard-category');
            const subHazardSelect = row.querySelector('.hazard-sub');
            const outcomeSelect = row.querySelector('.hazard-outcome');
            const hazardSource = row.querySelector('.hazard-desc')?.value?.trim() || '';
            const currentControl = row.querySelector('.hazard-counter-desc')?.value?.trim() || '';
            const counterLadderSelect = row.querySelector('.hazard-counter-ladder');
            const hasExistingLadderSelection = !!counterLadderSelect && Array.from(counterLadderSelect.selectedOptions || []).length > 0;

            // Preserve Current Control text; use it only for ladder classification.
            if (!hasExistingLadderSelection && counterLadderSelect) {
                const ladderInput = [currentControl, hazardSource, outcomeSelect?.value || '']
                    .map(v => String(v || '').trim())
                    .filter(Boolean)
                    .join(' | ');
                const ladderLevels = suggestCountermeasureLadder(ladderInput);
                if (ladderLevels.length > 0) {
                    Array.from(counterLadderSelect.options).forEach(opt => {
                        opt.selected = false;
                    });

                    let selectedCount = 0;
                    ladderLevels.forEach(level => {
                        const normalizedLevel = String(level || '').trim().toLowerCase();
                        if (!normalizedLevel) return;
                        const matchingOpt = Array.from(counterLadderSelect.options).find(opt =>
                            (opt.value || '').trim().toLowerCase() === normalizedLevel
                        );
                        if (matchingOpt) {
                            matchingOpt.selected = true;
                            selectedCount++;
                        }
                    });

                    if (selectedCount > 0) {
                        counterLadderSelect.classList.add('goehs-ai-prefilled');
                        ladderUpdatedRows++;
                    }
                }
            } else if (hasExistingLadderSelection && counterLadderSelect) {
                counterLadderSelect.classList.add('goehs-ai-prefilled');
            }

            const hazardNeedsFix = !!hazardSelect && (!hazardSelect.value || hazardSelect.classList.contains('goehs-mismatch'));
            const subHazardNeedsFix = !!subHazardSelect && (!subHazardSelect.value || subHazardSelect.classList.contains('goehs-mismatch'));
            // Outcome is free text (no GOEHS whitelist) so it never "needs fixing" - see
            // populateGoehsHazardsFromTable.

            if (!hazardNeedsFix && !subHazardNeedsFix) {
                return;
            }

            rowsNeedingDropdownAssist.push({
                row,
                taskName,
                hazardSource,
                currentControl,
                hazardSelect,
                subHazardSelect,
                hazardNeedsFix,
                subHazardNeedsFix,
                // When a select has no matching option its value is '' - fall back to the
                // dataset.rawValue captured at populate time (see populateGoehsHazardsFromTable)
                // so the AI still gets the originally imported text to work from, instead of
                // an empty string that gives it nothing to base a suggestion on.
                currentHazard: hazardSelect?.value?.trim() || hazardSelect?.dataset?.rawValue || '',
                currentSubHazard: subHazardSelect?.value?.trim() || subHazardSelect?.dataset?.rawValue || '',
                // Sub-hazard options cascade off the selected Hazard Group so they can
                // legitimately differ row to row - kept per-row. Hazard Group and Outcome
                // are the SAME static list on every row; sending them per-row multiplied
                // the payload size by the row count and was the cause of 413 "Payload Too
                // Large" errors on tables with more than a handful of mismatched rows -
                // now sent once at the top level of the prompt instead.
                subHazardOptions: toOptionValues(subHazardSelect)
            });
        });

        // Nothing to send to AI: only ladder updates were needed.
        if (rowsNeedingDropdownAssist.length === 0) {
            if (ladderUpdatedRows > 0) {
                showGoehsAlert(`🤖 AI Assist: Updated ladder selections on ${ladderUpdatedRows} row(s). No dropdown corrections were needed.`, 'success');
            } else {
                showGoehsAlert('ℹ️ No dropdown mismatches/missing fields found and no ladder updates were needed.', 'info');
            }
            scheduleGoehsIssueCounterRefresh();
            return;
        }

        // 2) AI pass only for rows with missing/mismatched dropdown fields.
        // Hazard Group is the same static dropdown on every row, so grab it once instead
        // of repeating a full copy inside each row's JSON below. Outcome is free text and
        // is not part of this AI-fix pass at all - see populateGoehsHazardsFromTable.
        const sharedHazardOptions = toOptionValues(rowsNeedingDropdownAssist[0].hazardSelect);

        // Batch in chunks of 20 rows per call - even with the shared-lists fix above, a
        // single call covering hundreds of rows (each still carrying its own cascaded
        // allowedSubHazards list) could still hit the API's payload limit. Batching keeps
        // each request small regardless of how large the hazard table grows, and one
        // batch failing (e.g. malformed AI response) doesn't lose the others' fixes.
        const BATCH_SIZE = 20;
        let dropdownUpdatedRows = 0;
        let batchErrors = 0;

        for (let batchStart = 0; batchStart < rowsNeedingDropdownAssist.length; batchStart += BATCH_SIZE) {
            const batchItems = rowsNeedingDropdownAssist.slice(batchStart, batchStart + BATCH_SIZE);
            const promptRows = batchItems.map((item, i) => ({
                assistIndex: i,
                taskName: item.taskName,
                hazardSource: item.hazardSource,
                currentControl: item.currentControl,
                needsHazard: item.hazardNeedsFix,
                needsSubHazard: item.subHazardNeedsFix,
                currentHazard: item.currentHazard,
                currentSubHazard: item.currentSubHazard,
                allowedSubHazards: item.subHazardOptions
            }));

            const prompt = `You are a workplace safety risk expert.

Task:
Fix ONLY missing or mismatched dropdown fields for the listed rows.
Do NOT propose or rewrite control text.

Rules:
- "hazard" must come from the allowedHazards list below (used for every row that needs it).
- "subHazard" must come from that row's own allowedSubHazards list.
- Return values exactly from the relevant allowed option list - do not invent new text.
- Only fill fields flagged as needed.
- If unsure, choose the best closest allowed option.

allowedHazards (for every row's "hazard"): ${JSON.stringify(sharedHazardOptions)}

ROWS:
${JSON.stringify(promptRows, null, 2)}

Return ONLY valid JSON array:
[
  {
    "assistIndex": 0,
    "hazard": "exact allowed option or empty string",
    "subHazard": "exact allowed option or empty string"
  }
]`;

            try {
                const response = await fetch(GOEHS_GLOBAL_API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'openai/gpt-4o-mini',  // Use same paid model as main app
                        prompt: prompt
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => '');
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';

                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    throw new Error('AI did not return valid JSON array');
                }

                const suggestions = JSON.parse(jsonMatch[0]);

                // Apply dropdown correction suggestions for this batch.
                suggestions.forEach(suggestion => {
                    const localIndex = Number(suggestion.assistIndex);
                    if (Number.isNaN(localIndex)) return;

                    const controlItem = batchItems[localIndex];
                    if (!controlItem || !controlItem.row) return;

                    let rowUpdated = false;
                    const sourceRowIndex = Number(controlItem.row.dataset.sourceRowIndex);

                    const suggestedHazard = (suggestion.hazard || '').toString().trim();
                    const suggestedSubHazard = (suggestion.subHazard || '').toString().trim();

                    if (controlItem.hazardNeedsFix && suggestedHazard && controlItem.hazardSelect) {
                        const matchedHazard = matchSelectOption(controlItem.hazardSelect, suggestedHazard);
                        if (matchedHazard) {
                            controlItem.hazardSelect.value = matchedHazard.value;
                            controlItem.hazardSelect.classList.remove('goehs-mismatch');
                            controlItem.hazardSelect.classList.add('goehs-ai-prefilled');

                            if (controlItem.row.id) {
                                updateTableSubHazards(controlItem.hazardSelect, controlItem.row.id);
                                controlItem.subHazardSelect = controlItem.row.querySelector('.hazard-sub');
                            }
                            if (!Number.isNaN(sourceRowIndex)) syncGoehsHazardFieldToMainTable(sourceRowIndex, 'category', matchedHazard.value);
                            rowUpdated = true;
                        }
                    }

                    if (controlItem.subHazardNeedsFix && suggestedSubHazard && controlItem.subHazardSelect) {
                        const matchedSubHazard = matchSelectOption(controlItem.subHazardSelect, suggestedSubHazard);
                        if (matchedSubHazard) {
                            controlItem.subHazardSelect.value = matchedSubHazard.value;
                            controlItem.subHazardSelect.classList.remove('goehs-mismatch');
                            controlItem.subHazardSelect.classList.add('goehs-ai-prefilled');
                            if (!Number.isNaN(sourceRowIndex)) syncGoehsHazardFieldToMainTable(sourceRowIndex, 'subHazard', matchedSubHazard.value);
                            rowUpdated = true;
                        }
                    }

                    if (rowUpdated) {
                        dropdownUpdatedRows++;
                    }
                });
            } catch (batchError) {
                console.error('AI Assist batch failed:', batchError);
                batchErrors++;
            }
        }

        if (batchErrors > 0 && dropdownUpdatedRows === 0 && ladderUpdatedRows === 0) {
            throw new Error(`All ${batchErrors} AI batch(es) failed. Use Intelligent Fill instead.`);
        }

        if (dropdownUpdatedRows > 0 || ladderUpdatedRows > 0) {
            const parts = [];
            if (dropdownUpdatedRows > 0) parts.push(`corrected dropdowns on ${dropdownUpdatedRows} row(s)`);
            if (ladderUpdatedRows > 0) parts.push(`updated ladder selections on ${ladderUpdatedRows} row(s)`);
            const batchNote = batchErrors > 0 ? ` (${batchErrors} batch(es) failed - re-run AI Assist to retry those rows)` : '';
            showGoehsAlert(`🤖 AI Assist: ${parts.join(' and ')}${batchNote}.`, batchErrors > 0 ? 'warning' : 'success');
        } else {
            showGoehsAlert('⚠ AI did not return usable dropdown corrections and no ladder updates were made.', 'warning');
        }

        scheduleGoehsIssueCounterRefresh();
    } catch (error) {
        console.error('AI Assist error:', error);
        showGoehsAlert(`❌ AI Assist failed: ${error.message}. Try Intelligent Fill instead.`, 'error');
    } finally {
        // Restore button state
        if (aiBtn) {
            aiBtn.innerHTML = originalText;
            aiBtn.disabled = false;
        }
    }
}

// ============ HAZARD MANAGEMENT (Tool 3) ============

function addHazardRow() {
    // Primary path for current UI.
    if (document.getElementById('hazardTableBody')) {
        addHazardTableRow();
        return;
    }

    // Legacy card fallback (kept minimal for backward compatibility).
    const container = document.getElementById('hazardRowsContainer');
    if (!container) {
        showGoehsAlert('Hazard container not found. Please use the table-based review pane.', 'error');
        return;
    }

    hazardIdCounter++;
    const hazardId = `hazard-${hazardIdCounter}`;
    goehsHazards.push({ id: hazardId });

    const row = document.createElement('div');
    row.id = hazardId;
    row.className = 'hazard-row bg-slate-50 border border-slate-200 rounded-lg p-4';
    row.innerHTML = `
        <div class="flex justify-between items-center">
            <h4 class="font-semibold text-slate-800">Hazard #${goehsHazards.length}</h4>
            <button type="button" onclick="removeHazardRow('${hazardId}')" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
        </div>
        <p class="text-xs text-slate-500 mt-2">Legacy hazard card mode is limited. Use the table-based Final Review pane for full GOEHS export support.</p>
    `;

    container.appendChild(row);
}

function removeHazardRow(hazardId) {
    if (goehsHazards.length <= 1) {
        showGoehsAlert('You must have at least one hazard.', 'warning');
        return;
    }
    goehsHazards = goehsHazards.filter(h => h.id !== hazardId);
    document.getElementById(hazardId)?.remove();
    renumberHazards();
}

function renumberHazards() {
    document.querySelectorAll('.hazard-row').forEach((row, index) => {
        row.querySelector('h4').textContent = `Hazard #${index + 1}`;
    });
}

function updateSubHazards(selectElement, hazardId) {
    const hazardCategory = selectElement.value;
    const row = document.getElementById(hazardId);
    const subSelect = row.querySelector('.hazard-sub');
    
    subSelect.innerHTML = '<option value="">-- Select --</option>';
    
    if (hazardCategory && HAZARD_CATEGORIES[hazardCategory]) {
        HAZARD_CATEGORIES[hazardCategory].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            subSelect.appendChild(opt);
        });
        subSelect.disabled = false;
    } else {
        subSelect.disabled = true;
    }
}

// ============ RISK CALCULATIONS ============

function calculateRiskScore(freq, sev, like) {
    if (!freq || !sev || !like) return { score: '', rating: '' };
    const score = parseFloat(freq) * parseFloat(sev) * parseFloat(like);
    const rating = getRiskRating(score);
    return { score: score.toFixed(2), rating };
}

function getRiskRating(score) {
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore)) return '';
    if (numericScore < 20) return 'Low';
    if (numericScore < 50) return 'Medium';
    if (numericScore < 72) return 'High';
    return 'Critical';
}

function calculateInitialRisk(hazardId) {
    const row = document.getElementById(hazardId);
    const freq = row.querySelector('.hazard-init-freq').value;
    const sev = row.querySelector('.hazard-init-sev').value;
    const like = row.querySelector('.hazard-init-like').value;
    const { score, rating } = calculateRiskScore(freq, sev, like);
    row.querySelector('.hazard-init-score').value = score;
    row.querySelector('.hazard-init-rating').value = rating;
}

function calculateResidualRisk(hazardId) {
    const row = document.getElementById(hazardId);
    const freq = row.querySelector('.hazard-res-freq').value;
    const sev = row.querySelector('.hazard-res-sev').value;
    const like = row.querySelector('.hazard-res-like').value;
    const { score, rating } = calculateRiskScore(freq, sev, like);
    row.querySelector('.hazard-res-score').value = score;
    row.querySelector('.hazard-res-rating').value = rating;
}

function calculatePredictiveRisk(hazardId) {
    const row = document.getElementById(hazardId);
    const freq = row.querySelector('.hazard-pred-freq').value;
    const sev = row.querySelector('.hazard-pred-sev').value;
    const like = row.querySelector('.hazard-pred-like').value;
    const { score, rating } = calculateRiskScore(freq, sev, like);
    row.querySelector('.hazard-pred-score').value = score;
    row.querySelector('.hazard-pred-rating').value = rating;
}

// ============ CSV GENERATION ============

/**
 * SECURITY: Escape CSV field and prevent formula injection
 * Protects against CSV injection attacks where fields starting with =, +, -, @ 
 * could be interpreted as formulas in spreadsheet applications
 */
function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str).trim();
    
    // SECURITY: Prevent CSV formula injection
    // Fields starting with =, +, -, @, tab, or carriage return can be interpreted as formulas
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str; // Prefix with single quote to prevent formula execution
    }
    
    // Standard CSV escaping
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes("'")) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function generateAssessmentCSV() {
    if (!validateGoehsRequiredHeaderFields()) {
        return;
    }

    const orgName = document.getElementById('goehsOrgName').value;
    const location = document.getElementById('goehsLocation').value;
    const department = document.getElementById('goehsDepartment').value;
    const workstation = document.getElementById('goehsWorkstation').value;
    const title = (document.getElementById('goehsAssessmentTitle')?.value || '').trim() || 'Untitled Assessment';
    const date = formatDateForGoehsExport(document.getElementById('goehsAssessmentDate')?.value || '');
    const type = getGoehsTypeValue();
    const approver = document.getElementById('goehsApprover').value || 'Site Admin';
    
    // CSV Headers - these are still needed for GOEHS import format
    const headers = ['OrgName', 'Location', 'Department', 'Workstation', 'Assessment Title', 'Assessment Date', 'Equipment', 'Type', 'Assessment Approver', 'Name of Risk Assessment Team Members', 'Completed By'];
    
    // CSV Row - empty values for removed fields (Equipment, Team Members, Completed By)
    const row = [orgName, location, department, workstation, title, date, '', type, approver, '', ''];
    
    const csvContent = headers.map(escapeCSV).join(',') + '\n' + row.map(escapeCSV).join(',');
    
    downloadCSV(csvContent, 'GOEHS_Assessment_Batch.csv');
    showGoehsAlert('Assessment CSV generated successfully!', 'success');
}

function generateTaskCSV() {
    if (!validateGoehsRequiredHeaderFields()) {
        return;
    }

    const orgName = document.getElementById('goehsOrgName').value;
    const location = document.getElementById('goehsLocation').value;
    const assessmentTitle = document.getElementById('goehsAssessmentTitle').value;
    
    const tasks = collectTaskData();
    
    // Validate tasks
    const invalidTasks = tasks.filter(t => !t.taskName || !t.conditionMode || !t.coreActivity);
    if (invalidTasks.length > 0) {
        showGoehsAlert('Please fill in all required task fields (Task Name, Condition Mode, Core Activity).', 'error');
        return;
    }
    
    // CSV Headers
    const headers = ['OrgName', 'Location', 'Assessment Title', 'Task Name', 'Task Description', 'Condition Mode', 'Core Activity', 'Job Title / Occupation Field'];
    
    // CSV Rows
    const rows = tasks.map(t => [
        orgName, location, assessmentTitle, t.taskName, t.taskDescription, t.conditionMode, t.coreActivity, t.jobTitle
    ]);
    
    const csvContent = headers.map(escapeCSV).join(',') + '\n' + rows.map(r => r.map(escapeCSV).join(',')).join('\n');
    
    downloadCSV(csvContent, 'GOEHS_Task_Batch.csv');
    showGoehsAlert(`Task CSV generated with ${tasks.length} task(s)!`, 'success');
}

function generateHazardCSV() {
    if (!validateGoehsRequiredHeaderFields()) {
        return;
    }

    const orgName = document.getElementById('goehsOrgName').value;
    const location = document.getElementById('goehsLocation').value;
    const assessmentTitle = document.getElementById('goehsAssessmentTitle').value;
    
    const hazards = collectHazardData();
    
    // Validate hazards
    const invalidHazards = hazards.filter(h => !h.taskName || !h.hazardCategory || !h.subHazard);
    if (invalidHazards.length > 0) {
        showGoehsAlert('Please fill in all required hazard fields (Task Name, Hazard, Sub-Hazard).', 'error');
        return;
    }
    
    // CSV Headers (matching vendor format)
    const headers = [
        'OrgName', 'Location', 'Assessment Title', 'Task Name', 'Hazard', 'Sub-Hazard', 'Potential Outcome', 'Hazard Description',
        'Initial Frequency', 'Initial Severity', 'Initial Likelihood', 'Initial Risk Score', 'Initial Risk Rating',
        'Description of Countermeasures', 'Countermeasure Ladder', 'Residual Frequency', 'Residual Severity', 'Residual Likelihood', 'Residual Risk Score', 'Residual Risk Rating',
        'Description of Countermeasures Predictive', 'Countermeasure Ladder Predictive', 'Predictive Frequency', 'Predictive Severity', 'Predictive Likelihood', 'Predictive Risk Score', 'Predictive Risk Rating'
    ];
    
    // CSV Rows
    const rows = hazards.map(h => [
        orgName, location, assessmentTitle, h.taskName, h.hazardCategory, h.subHazard, h.outcome, h.description,
        h.initFreq, h.initSev, h.initLike, h.initScore, h.initRating,
        h.counterDesc, h.counterLadder, h.resFreq, h.resSev, h.resLike, h.resScore, h.resRating,
        h.predDesc, h.predLadder, h.predFreq, h.predSev, h.predLike, h.predScore, h.predRating
    ]);
    
    const csvContent = headers.map(escapeCSV).join(',') + '\n' + rows.map(r => r.map(escapeCSV).join(',')).join('\n');
    
    downloadCSV(csvContent, 'GOEHS_Hazard_Batch.csv');
    showGoehsAlert(`Hazard CSV generated with ${hazards.length} hazard(s)!`, 'success');
}

// Generate a single unified CSV that merges Assessment + Task + Hazard data (one row per hazard)
// Also copies the data to clipboard for easy pasting
function generateUnifiedCSV() {
    showGoehsAlert('Unified CSV path is disabled in simplified GOEHS flow. Generating vendor XLSX instead.', 'info');
    generateExcelWithSheets();
}

function collectHazardData() {
    const hazards = [];
    // Collect only active table rows; soft-deleted rows are excluded from export.
    const rows = getActiveHazardTableRows();
    
    rows.forEach(row => {
        // Get multi-select values for ladder fields
        const counterLadderSelect = row.querySelector('.hazard-counter-ladder');
        const predLadderSelect = row.querySelector('.hazard-pred-ladder');
        
        // Join multiple selections with ", " separator (comma, not semicolon - vendor database requirement)
        const counterLadderValues = counterLadderSelect ? 
            Array.from(counterLadderSelect.selectedOptions).map(o => o.value).join(', ') : '';
        const predLadderValues = predLadderSelect ? 
            Array.from(predLadderSelect.selectedOptions).map(o => o.value).join(', ') : '';
        
        hazards.push({
            taskName: row.querySelector('.hazard-task')?.value || '',
            mode: normalizeGoehsConditionMode(row.querySelector('.hazard-mode')?.value || 'Routine'),
            hazardCategory: row.querySelector('.hazard-category')?.value || '',
            subHazard: row.querySelector('.hazard-sub')?.value || '',
            outcome: row.querySelector('.hazard-outcome')?.value || '',
            description: row.querySelector('.hazard-desc')?.value || '',
            initFreq: row.querySelector('.hazard-init-freq')?.value || '',
            initSev: row.querySelector('.hazard-init-sev')?.value || '',
            initLike: row.querySelector('.hazard-init-like')?.value || '',
            initScore: row.querySelector('.hazard-init-score')?.value || '',
            initRating: row.querySelector('.hazard-init-rating')?.value || '',
            counterDesc: row.querySelector('.hazard-counter-desc')?.value || '',
            counterLadder: counterLadderValues,
            resFreq: row.querySelector('.hazard-res-freq')?.value || '',
            resSev: row.querySelector('.hazard-res-sev')?.value || '',
            resLike: row.querySelector('.hazard-res-like')?.value || '',
            resScore: row.querySelector('.hazard-res-score')?.value || '',
            resRating: row.querySelector('.hazard-res-rating')?.value || '',
            predDesc: row.querySelector('.hazard-pred-desc')?.value || '',
            predLadder: predLadderValues,
            predFreq: row.querySelector('.hazard-pred-freq')?.value || '',
            predSev: row.querySelector('.hazard-pred-sev')?.value || '',
            predLike: row.querySelector('.hazard-pred-like')?.value || '',
            predScore: row.querySelector('.hazard-pred-score')?.value || '',
            predRating: row.querySelector('.hazard-pred-rating')?.value || ''
        });
    });
    return hazards;
}



// ============ VENDOR DATABASE MAPPING ============

// Vendor OrgName values
const VENDOR_ORG_NAMES = [
    'Demonstration', 'Global Remediation', 'Global Technology', 'Mfg - Americas', 
    'Mfg - Asia Pacific', 'Mfg - Chemical', 'Mfg - EMEA', 'SAG - AP NM', 'SAG - CTSC',
    'SAG - EMEA NM', 'SAG - EMEA Offices', 'SAG - LA NM', 'SAG - NA NM', 
    'SAG - NA Tire Retail', 'Yokohama'
];

// Vendor Location values (for Mfg - EMEA)
const VENDOR_LOCATIONS = {
    'Demonstration': ['Demonstration','Demonstration - Global'],
    'Global Remediation': [],
    'Global Technology': [],
    'Mfg - Americas': [],
    'Mfg - Asia Pacific': [],
    'Mfg - Chemical': [],
    'Mfg - EMEA': [
        'Adapazari', 'Amiens', 'Dębica', 'Fulda', 'Furstenwalde', 'Goodyear Mounting Solutions',
        'Hanau', 'Izmit', 'Kranj', 'Kruševac', 'Luxembourg Tire Plant', 'Lux-Mold Plant RCCE',
        'Mercury Dudelange', 'Montlucon', 'Riesa', 'Riom', 'Tilburg', 'Uitenhage', 'Wittlich'
    ],
    'SAG - AP NM': [],
    'SAG - CTSC': [],
    'SAG - EMEA NM': [],
    'SAG - EMEA Offices': [],
    'SAG - LA NM': [],
    'SAG - NA NM': [],
    'SAG - NA Tire Retail': [],
    'Yokohama': []
};

// Vendor Hazard Category mapping
const HAZARD_MAPPING = {
    'Biological Hazards': 'Biological Hazards',
    'Chemical Hazards': 'Chemical Hazards',
    'Ergonomic Hazards': 'Ergonomic Hazards',
    'Fire and Explosion': 'Fire / Explosion Hazards',
    'Hazardous Energy (Electrical, Potential, Kinetic, Pressure)': 'Hazardous Energy',
    'Mechanical / Machinery Hazards': 'Mechanical / Machinery Hazards',
    'Organizational / Psychosocial Hazards': 'Organizational / Psychosocial Hazards',
    'Physical Health Hazards': 'Physical Health Hazards',
    'Transportation Hazards': 'Transportation Hazards',
    'Workplace / Infrastructure Design': 'Workplace / Infrastructure Design'
};

// Function to map hazard categories from app to vendor format
function mapHazardToVendor(appHazard) {
    return HAZARD_MAPPING[appHazard] || appHazard;
}

// ============ COPY CSV FUNCTIONS ============

// Copy Assessment CSV to clipboard
function copyAssessmentCSV() {
    showGoehsAlert('Copy Assessment CSV is disabled in simplified GOEHS flow. Use the XLSX download button.', 'info');
}

// Copy Task CSV to clipboard
function copyTaskCSV() {
    showGoehsAlert('Copy Task CSV is disabled in simplified GOEHS flow. Use the XLSX download button.', 'info');
}

// Copy Hazard CSV to clipboard
function copyHazardCSV() {
    showGoehsAlert('Copy Hazard CSV is disabled in simplified GOEHS flow. Use the XLSX download button.', 'info');
}

// Generate Excel file with 3 sheets (Assessment, Task, Hazard)
// Builds a GOEHS-vendor-template-matching workbook (flat 40-column "Batch Upload Template"
// sheet, matching Risk_Registry_Batch_Upload_Template.xlsx) from a plain hazards array + header
// metadata. Pure - does not read the DOM and does not write a file, so it can be reused by both
// the GOEHS assessment modal (generateExcelWithSheets, below) and the Excel Import wizard's
// per-sheet/batch GOEHS export, which previously had no shared "what does a GOEHS export look
// like" implementation at all.
function buildGoehsBatchWorkbook(hazards, meta, exportLang) {
    if (typeof XLSX === 'undefined') return null;

    const m = meta || {};
    const lang = exportLang || 'en';
    const T = (lang !== 'en' && window.TRANSLATIONS?.[lang]) ? window.TRANSLATIONS[lang] : null;

    function xlate(val) {
        if (!val || !T) return val;
        return T[val] || val;
    }

    function xlateCondition(val) {
        if (!val || lang === 'en') return val;
        return GOEHS_CONDITION_TRANSLATIONS[lang]?.[val] || xlate(val) || val;
    }

    function normalizeLadder(ladderStr) {
        if (!ladderStr) return '';
        const parts = ladderStr.split(',').map(s => s.trim()).filter(Boolean);
        const valid = parts.filter(p => COUNTERMEASURE_LADDER.includes(p));
        if (lang === 'en' || !GOEHS_LADDER_TRANSLATIONS[lang]) {
            return valid.join(', ');
        }
        const lmap = GOEHS_LADDER_TRANSLATIONS[lang];
        return valid.map(p => lmap[p] || p).join(', ');
    }

    // Build task lookup map from available task rows (if any) and risk-table-derived metadata fallback.
    const taskMap = getGoehsTaskMetadataMap(hazards);

    // -- Flat 40-column header matching Risk_Registry_Batch_Upload_Template.xlsx --
    const headers = [
        'Row*',
        'Organization*', 'Site*', 'Department', 'Workstation',
        'Assessment Title*', 'Assessment Date', 'Equipment', 'Type', 'Assessment Approver*',
        'Name of Risk Assessment Team Members', 'Completed By',
        'Task Name *', 'Task Description *', 'Condition Mode *', 'Core Activity',
        'Job Title / Occupation Field',
        'Hazard *', 'Sub-Hazard *', 'Potential Outcome *', 'Hazard Description',
        'Initial Frequency', 'Initial Severity', 'Initial Likelihood',
        'Initial Risk Score', 'Initial Risk Rating',
        'Description of Countermeasures', 'Countermeasure Ladder',
        'Residual Frequency *', 'Residual Severity *', 'Residual Likelihood *',
        'Residual Risk Score', 'Residual Risk Rating',
        'Description of Countermeasures Predictive', 'Countermeasure Ladder Predictive',
        'Predictive Frequency', 'Predictive Severity', 'Predictive Likelihood',
        'Predictive Risk Score', 'Predictive Risk Rating'
    ];

    // -- One flat data row per hazard (denormalised) --
    const dataRows = hazards.map((h, idx) => {
        const taskName = (h.taskName || '').trim() || 'Unspecified Task';
        const task = taskMap[taskName] || {
            taskDescription: taskName,
            conditionMode: 'Routine',
            coreActivity: suggestCoreActivity(taskName) || '',
            jobTitle: suggestJobTitle(taskName) || ''
        };
        const conditionMode = normalizeGoehsConditionMode(h.mode || task.conditionMode || 'Routine');

        return [
            idx + 1,                                      // Row
            m.orgName || '',                              // OrgName*
            m.location || '',                             // Location*
            m.department || '',                           // Department
            m.workstation || '',                           // Workstation
            m.assessmentTitle || '',                       // Assessment Title*
            m.date || '',                                  // Assessment Date
            m.equipment || '',                              // Equipment
            m.type || '',                                   // Type
            m.approver || '(Site Admin)',                   // Assessment Approver*
            m.teamMembers || '',                            // Name of Risk Assessment Team Members
            m.completedBy || '',                            // Completed By
            taskName,                                      // Task Name *
            task.taskDescription || taskName,              // Task Description *
            xlateCondition(conditionMode),                 // Condition Mode *
            task.coreActivity || suggestCoreActivity(taskName) || '',
            task.jobTitle || suggestJobTitle(taskName) || '',
            xlate(h.hazardCategory),                               // Hazard *
            xlate(h.subHazard),                                    // Sub-Hazard *
            h.outcome,                                             // Potential Outcome * (pre-translated in UI)
            h.description,                                         // Hazard Description (pre-translated in UI)
            h.initFreq,                                   // Initial Frequency
            h.initSev,                                    // Initial Severity
            h.initLike,                                   // Initial Likelihood
            h.initScore,                                  // Initial Risk Score
            h.initRating,                                 // Initial Risk Rating
            h.counterDesc,                                // Description of Countermeasures
            normalizeLadder(h.counterLadder),             // Countermeasure Ladder (whitelisted EN/FR/DE)
            h.resFreq,                                    // Residual Frequency *
            h.resSev,                                     // Residual Severity *
            h.resLike,                                    // Residual Likelihood *
            h.resScore,                                   // Residual Risk Score
            h.resRating,                                  // Residual Risk Rating
            h.predDesc || '',                             // Description of Countermeasures Predictive
            normalizeLadder(h.predLadder || ''),          // Countermeasure Ladder Predictive (whitelisted)
            h.predFreq || '',                             // Predictive Frequency
            h.predSev || '',                              // Predictive Severity
            h.predLike || '',                             // Predictive Likelihood
            h.predScore || '',                            // Predictive Risk Score
            h.predRating || ''                            // Predictive Risk Rating
        ];
    });

    // -- Create workbook — single sheet named "Batch Upload Template" --
    // The vendor template (Risk_Registry_Batch_Upload_Template.xlsx) repeats the header row
    // verbatim on row 2 before data starts on row 3 - confirmed by inspecting the actual file.
    const wb = XLSX.utils.book_new();
    const wsData = [headers, headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size column widths
    const colWidths = headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...dataRows.map(r => String(r[i] ?? '').length));
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Batch Upload Template');
    return wb;
}
window.buildGoehsBatchWorkbook = buildGoehsBatchWorkbook;

async function generateExcelWithSheets() {
    if (!validateGoehsRequiredHeaderFields()) {
        return;
    }

    const assessmentTitleField = document.getElementById('goehsAssessmentTitle');
    const titleInput = (assessmentTitleField?.value || '').trim();

    if (!titleInput) {
        if (assessmentTitleField) {
            assessmentTitleField.classList.add('goehs-empty-required');
            assessmentTitleField.focus();
            assessmentTitleField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showGoehsAlert('Assessment Title is mandatory before download. Please enter it to continue.', 'error');
        return;
    }

    if (assessmentTitleField) {
        assessmentTitleField.classList.remove('goehs-empty-required');
    }

    const assessmentTitle = titleInput;

    if (typeof XLSX === 'undefined') {
        showGoehsAlert('Excel library not loaded. Please try the CSV download instead.', 'error');
        return;
    }

    // Collect hazard rows — values already validated against GOEHS whitelists in the UI
    const hazards = collectHazardData();

    if (hazards.length === 0) {
        showGoehsAlert('No hazards found. Please add hazards in Tool 3 first.', 'error');
        return;
    }

    // ── Language ──
    // Uses the modal's own Hazard dropdown language (goehsHazardDropdownLang), not the
    // global appLanguage UI toggle - that only covers en/fr/de and is a different control
    // from the one the user actually sees next to the Hazard/Sub-Hazard dropdowns here.
    const exportLang = goehsHazardDropdownLang || 'en';

    const meta = {
        orgName: document.getElementById('goehsOrgName').value,
        location: document.getElementById('goehsLocation').value,
        department: document.getElementById('goehsDepartment').value,
        workstation: document.getElementById('goehsWorkstation').value,
        assessmentTitle,
        date: formatDateForGoehsExport(document.getElementById('goehsAssessmentDate')?.value || ''),
        equipment: document.getElementById('goehsEquipment')?.value || '',
        type: getGoehsTypeValue(),
        approver: document.getElementById('goehsApprover').value || '(Site Admin)',
        teamMembers: document.getElementById('goehsTeamMembers')?.value || '',
        completedBy: document.getElementById('goehsCompletedBy')?.value || ''
    };

    const wb = buildGoehsBatchWorkbook(hazards, meta, exportLang);
    if (!wb) {
        showGoehsAlert('Excel library not loaded. Please try the CSV download instead.', 'error');
        return;
    }

    const langLabel = exportLang !== 'en' ? `_${exportLang.toUpperCase()}` : '';
    const safeTitle = assessmentTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `GOEHS_Batch_Upload_${safeTitle}${langLabel}.xlsx`;
    XLSX.writeFile(wb, filename);

    // Also save the full project JSON alongside the GOEHS Excel, named from the same
    // Assessment Title (falling back to the main app's Plant/Process-based naming if for
    // some reason the project save itself has nothing to save) - so a downloaded GOEHS
    // batch file always has a matching project save to reopen and keep editing from.
    let jsonSaved = false;
    if (typeof window.saveProject === 'function') {
        try {
            await window.saveProject(`${safeTitle}.json`, true);
            jsonSaved = true;
        } catch (jsonSaveError) {
            console.warn('Could not save project JSON alongside GOEHS export:', jsonSaveError);
        }
    }

    const langNote = exportLang !== 'en' ? ` (language: ${exportLang.toUpperCase()})` : '';
    const jsonNote = jsonSaved ? ` Project JSON ("${safeTitle}.json") also downloaded.` : '';
    showGoehsAlert(`✅ GOEHS Batch Upload Excel downloaded${langNote} — ${hazards.length} hazard row(s) in "Batch Upload Template" sheet.${jsonNote}`, 'success');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showGoehsAlert(message, type = 'info') {
    // Use existing alert function or create simple alert
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(message, type);
    } else {
        alert(message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form when modal opens
    const goehsBtn = document.getElementById('goehsIntegrationBtn');
    if (goehsBtn) {
        goehsBtn.addEventListener('click', openGoehsModal);
    }
    
    // Direct GOEHS Upload handler
    const directGoehsInput = document.getElementById('directGoehsUpload');
    if (directGoehsInput) {
        directGoehsInput.addEventListener('change', function(e) {
            handleDirectGoehsUpload(e);
        });
    }
    
    // Collapsible AI Recommendations section
    const toggleBtn = document.getElementById('toggleRecommendationsBtn');
    const content = document.getElementById('recommendationsContent');
    const chevron = document.getElementById('recommendationsChevron');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            content.classList.toggle('hidden');
            chevron.classList.toggle('rotate-180');
        });
    }
});
