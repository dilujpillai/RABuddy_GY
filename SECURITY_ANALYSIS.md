# Security Analysis: Risk Assessment Buddy Smart 3.0

**Date:** February 6, 2026  
**Status:** Security Review Completed

---

## Executive Summary

The application has **7 HIGH-PRIORITY security vulnerabilities** that require immediate remediation, particularly around XSS risks, API endpoint exposure, and sensitive data handling. Below are the findings organized by severity.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **Cross-Site Scripting (XSS) via innerHTML** ⚠️ CRITICAL
**Severity:** HIGH  
**Location:** Multiple locations (lines 3627, 3630, 3678, 3689, 3738, 3842, 4014, 4021, 4029, 4119, 4125, 4402)

**Issue:**
The application uses `innerHTML` to inject unsanitized or user-controlled content into the DOM:
```javascript
// VULNERABLE - line 3630
tableContainer.innerHTML = "<p class='text-center p-8 text-slate-600 italic'>Generating task breakdown...</p>";

// VULNERABLE - line 3678
tableContainer.innerHTML = `<p class="text-center p-8 text-red-600 font-medium">Error: ${error.message}...</p>`;

// VULNERABLE - line 4402
document.getElementById('highestCard').innerHTML = 'N/A';
```

**Risk:** If error messages, user input, or AI responses contain malicious scripts, they will execute in the user's browser context, potentially stealing session data, cookies, or sensitive information.

**Remediation:**
```javascript
// SECURE - Use textContent for plain text
const para = document.createElement('p');
para.className = 'text-center p-8 text-slate-600 italic';
para.textContent = 'Generating task breakdown...';
tableContainer.innerHTML = '';
tableContainer.appendChild(para);

// For dynamic content, sanitize before innerHTML
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// THEN use innerHTML safely
tableContainer.innerHTML = `<p class="error">${sanitizeHTML(error.message)}</p>`;
```

**Priority:** Implement immediately across all 12+ locations using `innerHTML`.

---

### 2. **Hardcoded API Endpoint Exposure** ⚠️ CRITICAL
**Severity:** HIGH  
**Location:** Line 12930

**Issue:**
```javascript
const GOEHS_GLOBAL_API_ENDPOINT = 'https://risk-assessment-api-nine.vercel.app/api/ai';
```

The endpoint is hardcoded in client-side JavaScript and visible to anyone inspecting the source code.

**Risk:**
- **No authentication/authorization:** Anyone can call this endpoint
- **API key exposure:** If the backend uses an API key, it may be exposed in request headers or logs
- **Potential abuse:** Attackers can spam the endpoint, causing DOS or excessive billing (if OpenAI calls are charged)
- **No rate limiting visible:** No client-side or server-side protection against abuse

**Evidence of Exposure:**
- Lines 15018 & 15175: Fetch calls to the endpoint with user input in the prompt
- Model hardcoded as `openai/gpt-4o-mini` (suggests third-party API key handling)

**Remediation:**
```javascript
// DO NOT expose the endpoint client-side
// Instead, create a backend proxy:

// Client-side: Call YOUR backend
async function callAIAssist(prompt) {
    const response = await fetch('/api/ai-assist', { // Your own backend endpoint
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken() // Add CSRF protection
        },
        body: JSON.stringify({ prompt })
    });
    return response.json();
}

// Backend (Node.js example):
// - Keep OPENAI_API_KEY in environment variables (never client-side)
// - Add authentication (verify user session)
// - Add rate limiting
// - Validate input length
// - Log API usage for audit
```

**Priority:** Move API calls through a Goodyear-controlled backend within the next sprint.

---

### 3. **Insecure File Upload - No Type/Size Validation** ⚠️ HIGH
**Severity:** HIGH  
**Location:** Lines 12215-12280 (handleDirectGoehsUpload)

**Issue:**
```javascript
const file = event.target.files?.[0];
if (!file) {
    console.log('No file selected');
    return;
}

// No validation of:
// - File type (could be .exe, .zip, malware)
// - File size (could be 1GB, DOS attack)
// - MIME type (could be spoofed)
```

**Risk:**
- **Malware upload:** User could upload executable files disguised as Excel
- **Memory exhaustion:** Large files could crash the browser or server
- **XXE attacks:** Malicious Excel XML could contain XXE payloads
- **ZIP bombs:** Specially crafted Excel files could expand to huge sizes

**Remediation:**
```javascript
async function handleDirectGoehsUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validate file type
    const validMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                        'application/vnd.ms-excel']; // .xls
    if (!validMimes.includes(file.type)) {
        showDirectGoehsAlert('❌ Only Excel files (.xlsx, .xls) are allowed.', 'error');
        return;
    }

    // 2. Validate file extension (defense in depth)
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
        showDirectGoehsAlert('❌ Invalid file extension. Use .xlsx or .xls', 'error');
        return;
    }

    // 3. Validate file size (e.g., max 10MB for Excel)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
        showDirectGoehsAlert(`❌ File size exceeds 10MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`, 'error');
        return;
    }

    try {
        showDirectGoehsAlert('📂 Processing RA 2025 Template...', 'info');
        const data = await parseRA2025Template(file);
        // ... rest of handler
    } catch (error) {
        console.error('Upload error:', error);
        showDirectGoehsAlert('❌ Error processing file: ' + error.message, 'error');
    }
}
```

**Priority:** Implement file validation before parsing Excel files.

---

## 🟠 HIGH-PRIORITY VULNERABILITIES

### 4. **Sensitive Data in localStorage** ⚠️ HIGH
**Severity:** MEDIUM-HIGH  
**Location:** Lines 14319-14370, 3073

**Issue:**
```javascript
// Line 3073: Load language preference (low risk)
let currentLang = localStorage.getItem('appLanguage') || 'en';

// Line 14319-14323: Save assessment data to localStorage
function saveGoehsAssessmentData() {
    const data = {
        orgName: document.getElementById('goehsOrgName').value,
        location: document.getElementById('goehsLocation').value,
        department: document.getElementById('goehsDepartment').value,
        workstation: document.getElementById('goehsWorkstation').value,
        assessmentDate: document.getElementById('goehsAssessmentDate').value
    };
    localStorage.setItem('goehsAssessmentData', JSON.stringify(data));
}
```

**Risk:**
- **Data exposure on shared computers:** Anyone with access to the browser can view stored data
- **No encryption:** localStorage data is plaintext; not suitable for sensitive info
- **XSS attack vector:** Compromised scripts can read all localStorage data
- **Organizational/location data:** Exposes workplace structure and assessment contexts

**What's stored:** Assessment title, organization name, location, department, workstation, assessment date.

**Remediation:**
```javascript
// For non-sensitive data only (e.g., UI preferences):
// Keep language settings in localStorage

// For sensitive assessment data:
// Option 1: Use sessionStorage (clears on browser close)
function saveGoehsAssessmentData() {
    const data = {
        orgName: document.getElementById('goehsOrgName').value,
        location: document.getElementById('goehsLocation').value,
        // ...
    };
    sessionStorage.setItem('goehsAssessmentData', JSON.stringify(data));
    // Note: sessionStorage also isn't secure; it's just more temporary
}

// Option 2: Don't store assessment data client-side at all
// Force user to re-enter or authenticate to retrieve
// (Better for security)

// Option 3: If storage is necessary, encrypt before storing
function encryptAssessmentData(data) {
    // Use TweetNaCl.js or similar library for encryption
    // BUT: Client-side encryption is weak if the key is also stored client-side
    // Recommend not storing sensitive data client-side at all
}
```

**Priority:** Remove sensitive organizational data from localStorage, or use sessionStorage instead.

---

### 5. **No CSRF Protection** ⚠️ MEDIUM-HIGH
**Severity:** MEDIUM-HIGH  
**Location:** Lines 15018-15024, 15175-15181 (all fetch calls)

**Issue:**
```javascript
response = await fetch(GOEHS_GLOBAL_API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        prompt: prompt
    })
});
// No CSRF token, no origin validation, no double-submit checks
```

**Risk:**
- If this endpoint is hosted on Goodyear's infrastructure (which it should be), an attacker could forge requests from a malicious site
- No validation that the request came from the legitimate Risk Assessment app
- Third-party sites could trigger API calls on behalf of users

**Remediation:**
```javascript
// 1. Add CSRF token from server (set in meta tag or cookie)
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || 
           document.cookie.split('; ').find(row => row.startsWith('csrf-token='))?.split('=')[1];
}

// 2. Include in all POST requests
response = await fetch('/api/ai-assist', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() // Add CSRF token
    },
    body: JSON.stringify({ prompt })
});

// 3. Backend validates token before processing
app.post('/api/ai-assist', (req, res) => {
    const tokenFromHeader = req.headers['x-csrf-token'];
    const tokenFromSession = req.session.csrfToken;
    
    if (tokenFromHeader !== tokenFromSession) {
        return res.status(403).json({ error: 'CSRF token invalid' });
    }
    
    // Process request
});
```

**Priority:** Implement CSRF protection for all POST/PUT/DELETE endpoints.

---

### 6. **No Input Validation on CSV Generation** ⚠️ MEDIUM-HIGH
**Severity:** MEDIUM  
**Location:** Lines 15600-15750 (CSV generation functions)

**Issue:**
The `escapeCSV()` function exists (line 15544) but may have edge cases:
```javascript
function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}
```

**Risk:**
- **CSV Injection:** Fields with `=`, `+`, `@` at the start could be interpreted as formulas
- **Formula Injection:** Excel/Sheets could execute embedded formulas in CSV
- Example: `=cmd|'/c calc'!A1` could execute commands when opened in Excel

**Vulnerable code:**
```javascript
// Line 15596 - hazards data includes user-generated "Description of Countermeasures"
const rows = hazards.map(h => [
    orgName, location, assessmentTitle, h.taskName, h.hazardCategory, h.subHazard, h.outcome, h.description,
    h.initFreq, h.initSev, h.initLike, h.initScore, h.initRating,
    h.counterDesc, h.counterLadder, // <-- User input, could contain formulas
    // ...
]);
```

**Remediation:**
```javascript
function sanitizeCSVField(str) {
    if (str === null || str === undefined) return '';
    str = String(str).trim();
    
    // Remove formula indicators
    if (str.match(/^[=+@\-\t]/)) {
        str = "'" + str; // Prefix with single quote to prevent formula execution
    }
    
    // Then escape for CSV
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Use in CSV generation:
const rows = hazards.map(h => [
    sanitizeCSVField(orgName),
    sanitizeCSVField(location),
    sanitizeCSVField(h.counterDesc), // Protect user input
    // ... all other fields
]);
```

**Priority:** Update all CSV generation functions to prevent formula injection.

---

### 7. **Missing Authentication/Authorization** ⚠️ MEDIUM
**Severity:** MEDIUM  
**Location:** Entire application (no login mechanism visible)

**Issue:**
The application has no visible user authentication:
- No login screen
- No session management
- No access control to restrict who can create assessments
- No audit trail of who made changes

**Risk:**
- **Unauthorized access:** Anyone with browser access can modify risk assessments
- **Data tampering:** No way to know who changed what assessment
- **Compliance violation:** GDPR/audit requirements demand access logs
- **Accountability gap:** If a bad assessment is submitted, no audit trail

**Remediation:**
```javascript
// 1. Add authentication check at app startup
window.addEventListener('load', async function() {
    const user = await verifyUserSession();
    if (!user) {
        window.location.href = '/login'; // Redirect to login
        return;
    }
    
    // Store user info for logging
    window.currentUser = user;
    initializeApp();
});

// 2. Log all assessment changes
function logAssessmentAction(action, details) {
    const log = {
        timestamp: new Date().toISOString(),
        user: window.currentUser.id,
        action: action, // 'create', 'edit', 'delete', 'export'
        details: details,
        userAgent: navigator.userAgent
    };
    
    // Send to server
    fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
    });
}

// 3. Add role-based access control
function canUserExportToGOEHS(user) {
    return user.roles.includes('ehs-manager') || user.roles.includes('admin');
}

if (!canUserExportToGOEHS(window.currentUser)) {
    document.getElementById('goehsIntegrationBtn').disabled = true;
}
```

**Priority:** Implement authentication and audit logging before next production release.

---

## 🟡 MEDIUM-PRIORITY VULNERABILITIES

### 8. **No Rate Limiting on AI Calls** ⚠️ MEDIUM
**Severity:** MEDIUM  
**Location:** Lines 15089-15100, 15260-15275

**Issue:**
Users can call the AI endpoint unlimited times without restriction:
```javascript
async function aiAssistTaskFields() {
    // No rate limit check
    // User could click button 1000 times in a second
    const response = await fetch(GOEHS_GLOBAL_API_ENDPOINT, {
        // ...
    });
}
```

**Risk:**
- **Excessive API charges:** If you're paying per API call, attackers could run up bills
- **DOS attack:** Overwhelming backend with requests
- **Resource exhaustion:** Browser/server DoS

**Remediation:**
```javascript
let aiCallTimestamps = {};

function checkAIRateLimit(userId) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old timestamps
    aiCallTimestamps[userId] = (aiCallTimestamps[userId] || [])
        .filter(ts => ts > oneMinuteAgo);
    
    // Allow max 5 calls per minute
    if (aiCallTimestamps[userId].length >= 5) {
        return false; // Rate limit exceeded
    }
    
    aiCallTimestamps[userId].push(now);
    return true;
}

async function aiAssistTaskFields() {
    if (!checkAIRateLimit(window.currentUser.id)) {
        showGoehsAlert('⏱️ Rate limit: Max 5 AI calls per minute. Please wait.', 'warning');
        return;
    }
    
    // Proceed with API call
}
```

**Priority:** Implement rate limiting to protect API costs.

---

### 9. **No Content Security Policy (CSP)** ⚠️ MEDIUM
**Severity:** MEDIUM  
**Location:** HTML head (missing)

**Issue:**
No CSP header to restrict where scripts, styles, images can be loaded from.

**Risk:**
- **Script injection:** Attacker could inject scripts from malicious sources
- **Style injection:** CSS could be injected to steal data via UI tricks
- **Third-party library compromise:** If a third-party library is compromised, CSP limits damage

**Remediation:**
Add to HTML `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://trusted-cdn.example.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://your-backend.example.com;
    object-src 'none';
    frame-ancestors 'none';
">
```

Or add server-side header:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

**Priority:** Implement CSP headers to reduce attack surface.

---

## 📋 SUMMARY TABLE

| # | Vulnerability | Severity | Status | ETA |
|---|---|---|---|---|
| 1 | XSS via innerHTML | CRITICAL | ✅ **FIXED** | Done |
| 2 | Hardcoded API Endpoint | CRITICAL | ❌ Not Fixed | Sprint 1 |
| 3 | Insecure File Upload | HIGH | ✅ **FIXED** | Done |
| 4 | Sensitive Data in localStorage | HIGH | ❌ Not Fixed | Sprint 2 |
| 5 | No CSRF Protection | MEDIUM-HIGH | ❌ Not Fixed | Sprint 1 |
| 6 | CSV Injection | MEDIUM | ✅ **FIXED** | Done |
| 7 | No Authentication | MEDIUM | ❌ Not Fixed | Sprint 1 |
| 8 | No Rate Limiting | MEDIUM | ❌ Not Fixed | Sprint 2 |
| 9 | No CSP Header | MEDIUM | ❌ Not Fixed | Sprint 2 |

---

## 🎯 IMMEDIATE ACTIONS (This Week)

1. **Fix XSS vulnerabilities:** Replace all `innerHTML` with safe alternatives
2. **Move API endpoint to backend:** Create `/api/ai-assist` endpoint on Goodyear's server
3. **Add file upload validation:** Implement type, size, extension checks
4. **Add CSRF protection:** Include CSRF tokens in all state-changing requests
5. **Implement authentication:** Add login and user verification

---

## 📞 Next Steps

1. **Security Review Meeting:** Discuss findings with development team
2. **Assign Ownership:** Each vulnerability gets a sprint owner
3. **Update Backlog:** Create security-focused user stories
4. **Compliance Check:** Verify fixes meet GDPR/SOC2 requirements before production
5. **Penetration Test:** Hire external security firm after fixes to verify

---

**Report Prepared By:** Security Analysis  
**Date:** February 6, 2026  
**Classification:** Internal Use - Security Sensitive
