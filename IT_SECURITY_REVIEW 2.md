# Risk Assessment Buddy Smart 3.0 — IT Security Review

**Document Version:** 3.0  
**Prepared For:** IT Security Technical Review Meeting  
**Last Updated:** January 26, 2026  
**Classification:** Internal Use Only

---

## Executive Summary

**Application:** Risk Assessment Buddy Smart 3.0  
**Purpose:** Occupational health and safety risk assessment tool with AI-assisted hazard analysis and GOEHS vendor integration  
**Current State:** Phase 0 (Pilot) — GitHub Pages + Vercel + OpenRouter  
**Target State:** Phase 2 (Production) — Azure App Service + Entra ID SSO + Azure OpenAI  
**Timeline:** Production deployment Q2 2026

**Key Security Design Principle:** Client-side processing with minimal server-side data retention. Assessment data remains on user's device; only audit logs are stored server-side.

**Phase 0 Status Update (Jan 2026):**
- ✅ Enhanced Excel import workflows (RA2025 template + manual column mapping)
- ✅ Multi-language support for auto-detection (EN, FR, DE, TR, ES)
- ✅ Intelligent value matching for risk ratings (Frequency, Severity, Likelihood)
- ✅ Dynamic column mapping and data refresh
- ✅ Comprehensive debug logging for troubleshooting
- ⏳ Authentication: Still None (pilot-only distribution)
- ⏳ Audit logging: Minimal (planned for Phase 1)

---

## 1. System Access, Management & Governance

### 1.1 Access Model

| Aspect | Current State (Phase 0) | Future State (Phase 2) |
|--------|------------------------|------------------------|
| **Authentication** | None (URL access only) | Microsoft Entra ID SSO |
| **Authorization** | Open access | Role-based (User, Admin, Auditor) |
| **MFA** | Not available | Supported via Entra ID policies |
| **Session Management** | Browser session only | 1-hour JWT token with refresh |
| **User Provisioning** | N/A | Automated via Entra ID sync |

### 1.2 Governance Structure

| Function | Responsibility |
|----------|---------------|
| **Application Owner** | EHS Department |
| **Technical Owner** | IT Development Team |
| **Security Oversight** | IT Security |
| **Access Approval** | Department Manager + IT Security |
| **Compliance Review** | Quarterly (IT Security + Compliance) |

### 1.3 Access Control Matrix (Phase 2)

| Role | Create Assessment | View Reports | Export Data | Access Audit Logs | Manage Users |
|------|-------------------|--------------|-------------|-------------------|--------------|
| User | ✅ | Own only | Own only | ❌ | ❌ |
| Admin | ✅ | All | All | Read-only | ✅ |
| Auditor | ❌ | All | ❌ | Read-only | ❌ |

---

## 2. Authentication, Authorization & Logging

### 2.1 Current Phase 0 Implementation

**⚠️ SECURITY NOTE:** Phase 0 has NO authentication. Mitigation: Pilot-only distribution via controlled email with non-public URL.

- **Access Control:** URL-based (sent via email to pilot participants only)
- **User Identification:** Anonymous (no tracking in Phase 0)
- **Session:** Browser localStorage + sessionStorage for preferences
- **Audit Trail:** Console logs + browser DevTools (client-side only)

**Phase 0 Data Flow:**
```
User opens URL
    ↓
HTML/JS loads from GitHub Pages (HTTPS)
    ↓
All processing happens locally in browser
    ↓
Optional: User exports data or uses AI features (connects to Vercel API)
    ↓
Assessment data stays on user's device
```

### 2.2 Authentication Flow (Phase 2)

```
User clicks "Login with Goodyear"
         │
         ▼
Browser redirects to Microsoft Entra ID
         │
         ▼
User enters @goodyear.com credentials
         │
         ▼
Entra ID validates → MFA prompt (if configured)
         │
         ▼
JWT token issued (signed, 1-hour expiry)
         │
         ▼
Token stored in sessionStorage (not persistent)
         │
         ▼
Token included in all API requests
         │
         ▼
API Gateway validates token → App Service validates again
         │
         ▼
Request processed → Audit log created
```

**Token Contents:** User ID, Email, Display Name, Department, Groups/Roles  
**Token Storage:** sessionStorage (cleared on browser close)  
**Token Validation:** Microsoft signature verification, expiration check, audience validation

### 2.3 Authorization Rules (Phase 2)

| Resource | Condition | Enforcement Point |
|----------|-----------|-------------------|
| Application access | Valid Entra ID token | API Gateway |
| AI features | Authenticated + rate limit not exceeded | App Service |
| Audit log access | Admin or Auditor role | API Gateway + App Service |
| User management | Admin role only | App Service |

### 2.4 Audit Logging

**Phase 0 Current State:**
- Minimal logging (console.log for debugging)
- No persistent audit trail
- No user attribution (anonymous access)

**Phase 1 Enhancement:**
- Browser-based event logging to localStorage
- Export audit trail as JSON

**Phase 2 Full Implementation:**

| Event Type | Data Logged |
|------------|-------------|
| Authentication | User ID, timestamp, IP, success/failure, MFA status |
| Assessment actions | User ID, action (create/edit/export), timestamp, assessment ID |
| AI requests | User ID, request type, timestamp, model used, token count |
| Excel import | User ID, file name, column mapping, rows processed, timestamp |
| Admin actions | User ID, target user, action, timestamp |
| Security events | Failed logins, rate limit hits, invalid tokens |

**Log Properties:**
- **Storage:** Azure Table Storage (encrypted AES-256)
- **Retention:** Per Goodyear IT policy (recommend 7 years)
- **Immutability:** Append-only, no deletion capability
- **Access:** Log Analytics queries, read-only for auditors

---

## 3. Data Flow, Security & Scope

### 3.1 Data Architecture - Phase 0 (Current)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Assessment data (text, photos, ratings)                      │    │
│  │ Face detection & blurring (local processing)                 │    │
│  │ PDF/Excel generation (local processing)                      │    │
│  │ RA2025 template parsing & column mapping (local)             │    │
│  │ localStorage: User preferences + column mappings             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/TLS 1.3 (assessment text for AI only, optional)
                              ▼
                    ┌──────────────────────┐
                    │  Vercel API Proxy    │
                    │  (OpenRouter or      │
                    │   Azure OpenAI)      │
                    └──────────────────────┘
```

### 3.2 Phase 0 Data Types & Classification

| Data Type | Classification | Storage Location | Retention | Encryption |
|-----------|---------------|------------------|-----------|------------|
| Assessment content | Confidential | User's PC only | User controlled | N/A (local) |
| Photos (faces blurred) | Confidential | User's PC only | User controlled | N/A (local) |
| User preferences | Internal | localStorage | Persistent (user cleared) | N/A (local) |
| Column mappings | Internal | localStorage | Persistent (user cleared) | N/A (local) |
| RA2025 template parse data | Confidential | Browser memory only | Session | N/A (local) |
| Console logs | Development | Browser DevTools | Session | N/A |

**Phase 2 Additions:**
| Audit logs | Internal | Azure Table Storage | Per policy | AES-256 |
| API keys | Restricted | Azure Key Vault | Perpetual | AES-256 |
| JWT tokens | Restricted | sessionStorage | 1 hour | Signed by Entra ID |

### 3.3 Data Sent to AI Service

When user opts to use AI features:

| Sent | Not Sent |
|------|----------|
| Task/hazard descriptions (text) | Photos or images |
| Control measure text | Personal identifiable information |
| Risk rating context | User credentials |
| Hazard categories | Location details |
| Frequency/Severity/Likelihood ratings | Assessment metadata |

**AI Data Handling:**
- **Phase 0:** OpenRouter (third-party) - verify no data retention
- **Phase 2:** Azure OpenAI - Enterprise data processing agreement, no training use

### 3.4 Transport Security

| Connection | Protocol | Minimum Version | Cipher Suite |
|------------|----------|-----------------|--------------|
| Browser ↔ GitHub Pages | HTTPS | TLS 1.3 | AES-256-GCM |
| Browser ↔ Vercel API | HTTPS | TLS 1.3 | AES-256-GCM |
| Browser ↔ OpenRouter | HTTPS | TLS 1.3 | AES-256-GCM |
| Browser ↔ API Gateway (Phase 2) | HTTPS | TLS 1.3 | AES-256-GCM |
| App Service ↔ Azure OpenAI | HTTPS | TLS 1.3 | AES-256-GCM |
| App Service ↔ Key Vault | Azure internal | Managed | Microsoft managed |

---

## 4. Data Governance & Lifecycle

### 4.1 Data Lifecycle

| Phase | Description | Owner | Duration |
|-------|-------------|-------|----------|
| **Creation** | User enters assessment data in browser or imports Excel | User | Active session |
| **Parsing** | Excel file (RA2025) parsed locally; column mapping detected | Browser | Seconds |
| **Processing** | AI generates suggestions, face blur applied | User (client-side) | Seconds |
| **Storage** | Assessment saved locally; audit log to Azure (Phase 2) | User / Azure | User-controlled / Per policy |
| **Export** | User downloads PDF/Excel/ZIP/GOEHS CSV | User | On demand |
| **Archival** | User moves to SharePoint/OneDrive | User | Per corporate policy |
| **Deletion** | User deletes local files; audit logs auto-purge | User / Automated | Manual / Per policy |

### 4.2 Data Retention Requirements

| Data Category | Retention Period | Justification | Storage |
|---------------|------------------|---------------|---------|
| Assessment data | User-controlled | Not server-stored | User's PC |
| Column mappings | User-controlled (saved in localStorage) | Settings persistence | Browser storage |
| Audit logs (Phase 2) | TBD (recommend 7 years) | Compliance/investigation | Azure Table Storage |
| API logs | 30 days | Troubleshooting | Azure Log Analytics |
| Session data | Session duration | Temporary | Browser memory |

**⚠️ Action Required:** Confirm audit log retention period with IT Security before Phase 2 deployment.

### 4.3 Data Export & Portability

Users can export all their data at any time:
- **PDF reports** — formatted assessment documents
- **Excel spreadsheets** — tabular data for analysis
- **GOEHS batch files** — CSV/Excel for vendor Risk Registry import (validated against GOEHS whitelist)
- **Project ZIP** — complete backup of all assessment data
- **JSON export** — raw project data for portability

**Server retains (Phase 0):** Nothing (all client-side)  
**Server retains (Phase 2):** Only audit logs (who/what/when) — never assessment content

---

## 5. Recent Feature Enhancements (Jan 2026)

### 5.1 RA2025 Template Support

**Overview:** Enhanced import workflow for Goodyear RA2025 Excel template format

**Security Considerations:**

| Feature | Security Control |
|---------|-----------------|
| Multi-language auto-detection | Input validated against whitelist of keywords |
| Column mapping | User-driven, saved to localStorage for session |
| Excel parsing | Client-side using JSZip + DOMParser (no server processing) |
| Value matching | Smart matching with numeric comparison & fuzzy logic |
| Debug logging | Console-only (not transmitted) |

**Data Flow:**
```
User uploads .xlsx file
    ↓
Browser: JSZip extracts sharedStrings.xml
    ↓
Browser: DOMParser reads sheet XML
    ↓
Browser: Auto-detects columns (multi-language keywords)
    ↓
User: Manually maps any undetected columns
    ↓
Browser: Parses data rows with smart value matching
    ↓
Result: Assessment data loaded into UI (stays on device)
```

**Validation:**
- File type: .xlsx only (checked by file extension + JSZip validation)
- Header row: Auto-detected or user-specified
- Data rows: Trimmed, empty rows skipped
- Risk ratings: Matched to dropdown values (Freq: 1-2, Sev: 1-10, Like: 1-10)
- Hazard categories: Mapped to registry (case-insensitive matching)

### 5.2 Column Mapping & Auto-Detection

**Supported Languages:**
- English (EN): primary
- French (FR): Fréquence, Sévérité, Probabilité
- German (DE): Häufigkeit, Schweregrad, Wahrscheinlichkeit
- Turkish (TR): Sıklık, Şiddet, Olasılık
- Spanish (ES): Frecuencia, Severidad, Probabilidad

**Keywords for Auto-Detection:**

| Field | Keywords |
|-------|----------|
| Task Description | task description, job step, beschreibung, açıklama, description de la tâche, aufgabe, görev |
| Hazard Group | hazard group, groupe de risque, gefahrengruppe, tehlike grubu |
| Hazard Detail | hazard detail, hazard list, détail du risque, gefahrendetail, type de danger, liste des dangers |
| Frequency | frequency, fréquence, häufigkeit, sıklık, frecuencia, freq |
| Severity | severity, gravité, schweregrad, şiddet, severidad, sev |
| Likelihood | likelihood, probabilité, wahrscheinlichkeit, olasılık, probabilidad, like |

**Smart Value Matching:**
1. Exact string match (e.g., "3" → "3")
2. Numeric comparison (e.g., "3.0" → "3")
3. Label contains value (e.g., "FIRST AID" in "3 - First Aid")
4. Value contains label text (e.g., "First Aid Case" → matches "3 - First Aid")

### 5.3 Security Implications

**Risks Mitigated:**
- ✅ No server-side file storage (processed locally)
- ✅ No sensitive data transmission during parsing
- ✅ User has full control over column mapping
- ✅ Refresh capability to reparse with corrected mappings

**Risks Remaining:**
- ⚠️ Malformed Excel files could crash parsing (handled with try-catch)
- ⚠️ Large files (>100 MB) could cause browser memory issues (acceptable for pilot)

---

## 6. Integration Points with Goodyear Systems

### 6.1 Current Integrations (Phase 0)

| System | Integration Type | Data Exchanged | Security |
|--------|------------------|----------------|----------|
| GitHub Pages | Static hosting | HTML/JS/CSS files | HTTPS |
| Vercel | API proxy | AI requests (text only) | HTTPS + API key in env vars |
| OpenRouter | AI service | Assessment text | HTTPS + API key managed |
| JSZip library | Excel parsing | .xlsx file extraction | Client-side library |
| face-api.js | Face detection | Image processing | Client-side TensorFlow.js |
| DOMPurify | Input sanitization | XSS prevention | Client-side library v3.1.6 |

### 6.2 Planned Integrations (Phase 2)

| System | Integration Type | Data Exchanged | Security |
|--------|------------------|----------------|----------|
| **Microsoft Entra ID** | OAuth 2.0 + OIDC | User identity, JWT tokens | Microsoft-managed |
| **Azure API Management** | Gateway | All API traffic | WAF, rate limiting, CORS |
| **Azure Key Vault** | Secret management | API keys (retrieved) | RBAC, encryption |
| **Azure OpenAI** | AI service | Assessment text | Enterprise DPA, 99.99% SLA |
| **Azure Table Storage** | Audit logs | Event records | Encryption at rest (AES-256) |
| **Azure Log Analytics** | Monitoring | Metrics, logs | Azure RBAC, retention policies |

### 6.3 GOEHS Integration Detail

**Purpose:** Export risk assessment data to GOEHS vendor Risk Registry via batch upload

**Data Flow:**
1. User completes assessment in main table
2. Opens GOEHS Integration modal (3 tabs: Assessment, Task, Hazard)
3. AI Assist or Intelligent Fill suggests field values
4. User reviews and validates data
5. Exports as CSV/Excel (copied to clipboard or downloaded)
6. User manually pastes/uploads to GOEHS system

**Security Controls:**
- ✅ All exports go to user's device only (no server storage)
- ✅ Date format validation (DD-MMM-YYYY)
- ✅ Dropdown values validated against vendor whitelist
- ✅ XSS prevention via DOMPurify
- ✅ No direct API connection to GOEHS (user-mediated, user approval required)
- ✅ Hazard categories mapped to GOEHS taxonomy (case-insensitive)
- ✅ Frequency values converted to GOEHS format (1, 1.25, 1.5, 1.75, 2)

**Supported Export Formats:**
- CSV (clipboard copy or download)
- Excel (.xlsx with formatted rows)
- Tab-separated (for direct paste to vendor system)

---

## 7. Technologies & Dependencies

### 7.1 Technology Stack

| Layer | Phase 0 (Current) | Phase 2 (Target) | Notes |
|-------|-------------------|------------------|-------|
| **Frontend** | Vanilla JS ES6+, Tailwind CSS | Same | No framework overhead |
| **Face Detection** | face-api.js (TensorFlow.js) | Same | Local processing |
| **Excel Export** | JSZip + SheetJS | Same | Client-side |
| **Excel Import** | JSZip + DOMParser | Same | Client-side, no server |
| **PDF Generation** | PDFKit | Same | Client-side |
| **Input Sanitization** | DOMPurify 3.1.6 | Same + server validation | Defense in depth |
| **Runtime** | Node.js 18 LTS | Same | LTS version |
| **Backend Framework** | Express.js 4.18.2 | Same | Lightweight |
| **Hosting** | Vercel (serverless) | Azure App Service | Managed platform |
| **Authentication** | None | Microsoft Entra ID | OAuth 2.0 + OIDC |
| **AI Service** | OpenRouter (GPT-4o-mini) | Azure OpenAI (GPT-4) | Enterprise SLA |
| **Secrets Management** | Vercel env variables | Azure Key Vault | Centralized, audited |
| **Audit Logging** | None | Azure Table Storage + Log Analytics | Compliance |
| **Monitoring** | Vercel dashboard | Azure Application Insights | Observability |

### 7.2 Dependency Audit

**Current Libraries:**
- ✅ JSZip - Active development, no known CVEs
- ✅ DOMPurify - Security-focused, regularly updated
- ✅ face-api.js - Based on TensorFlow.js (maintained)
- ✅ Tailwind CSS - Active, regularly updated

**Recommendation:** Quarterly dependency scan using OWASP Dependency-Check or npm audit

---

## 8. Identified Risks & Mitigation Strategies

### 8.1 Risk Register Summary

| ID | Risk | Current Severity | Phase 2 Severity | Status | Mitigation |
|----|------|------------------|------------------|--------|-----------|
| R1 | No authentication | 🔴 HIGH | 🟢 RESOLVED | Active | Entra ID SSO with MFA (Phase 2) |
| R2 | No audit logging | 🟡 MEDIUM | 🟢 RESOLVED | Planned | Azure Table Storage, 7-year retention |
| R3 | No rate limiting | 🟡 MEDIUM | 🟢 RESOLVED | Planned | API Gateway (100 req/min/user) |
| R4 | Third-party AI dependency | 🟡 MEDIUM | 🟢 RESOLVED | Planned | Azure OpenAI (SLA 99.99%) |
| R5 | Data exposure to AI vendor | 🟡 MEDIUM | 🟢 RESOLVED | Planned | Enterprise DPA, no training use |
| R6 | XSS/injection attacks | 🟡 MEDIUM | 🟡 MEDIUM | Mitigated | DOMPurify + planned server validation + WAF |
| R7 | API key exposure | 🟢 RESOLVED | 🟢 RESOLVED | Managed | Key Vault with RBAC |
| R8 | Excel parsing malformed files | 🟡 MEDIUM | 🟡 MEDIUM | Mitigated | Try-catch blocks, file size limits (Phase 1) |
| R9 | Column mapping errors | 🟡 MEDIUM | 🟢 RESOLVED | Mitigated | User manual override + refresh capability |
| R10 | Value matching failures | 🟡 MEDIUM | 🟢 RESOLVED | Mitigated | Smart matching (4-level logic), user review |

### 8.2 Risk Detail: No Authentication (R1)

**Current State (Phase 0):**
- ✅ Mitigated: Pilot-only distribution via email, non-public URL
- No user tracking or accountability (accepted for pilot)
- Assessment data never leaves user's device

**Phase 2 Resolution:**
- Mandatory Entra ID authentication
- MFA enforced per corporate policy
- All access logged with user identity
- Session timeout after 1 hour of inactivity

### 8.3 Risk Detail: Excel Parsing Malformed Files (R8)

**Current State:**
- JSZip validates ZIP structure
- DOMParser handles malformed XML gracefully
- Try-catch blocks prevent crashes
- Large files could consume browser memory

**Mitigations (Phase 1):**
- Add file size validation (warn if >50MB)
- Add error reporting UI (instead of silent failure)
- Document supported Excel formats (Excel 2007+ .xlsx only)

### 8.4 Risk Detail: Column Mapping Errors (R9)

**Current State (Resolved):**
- ✅ User can manually map columns in UI
- ✅ Auto-detection uses multi-language keywords (reduces false positives)
- ✅ Refresh button re-parses with corrected mappings
- ✅ Debug logging shows detected mappings

**Prevention:**
- Multi-step validation during import
- Confirmation dialog before processing
- Ability to edit mappings after import

### 8.5 Risk Detail: Value Matching Failures (R10)

**Current State (Resolved):**
- ✅ Smart matching uses 4-level logic (exact, numeric, label-based, fuzzy)
- ✅ User can manually override values in UI
- ✅ Visual feedback (value display in red text) for imported values
- ✅ Fallback to default if no match found

**Example Matching:**
```
Excel value: "3"
Option: "3 - First Aid"
Result: MATCHED ✅ (exact numeric match)

Excel value: "First Aid Case"
Option: "3 - First Aid"
Result: MATCHED ✅ (label text matching)

Excel value: "Low"
Options: ["1 - No injury", "3 - First Aid", "5 - Medical Treat", ...]
Result: NO MATCH → User manually selects
```

### 8.6 Residual Risks (Accepted by Design)

| Risk | Rationale | Mitigation |
|------|-----------|-----------|
| No server-side assessment storage | Reduces data retention liability, improves privacy | User exports to local storage, audit logs only |
| User controls data deletion | GDPR alignment, user ownership | Audit logs retained separately (Phase 2) |
| AI suggestions may be incorrect | AI is assistive, not authoritative | User review required before export |
| Pilot phase no authentication | Simplifies pilot testing | Limited distribution, URL not public |

---

## 9. Security Controls Summary

### 9.1 Control Matrix

| Control Category | Phase 0 (Current) | Phase 1 (Q1 2026) | Phase 2 (Q2 2026) |
|------------------|-------------------|-------------------|------------------|
| **Authentication** | ❌ None | ⚠️ Optional login | ✅ Entra ID SSO |
| **Authorization** | ❌ None | ⚠️ Basic roles | ✅ RBAC (User/Admin/Auditor) |
| **MFA** | ❌ None | ❌ None | ✅ Entra ID policy |
| **Encryption in Transit** | ✅ TLS 1.3 | ✅ TLS 1.3 | ✅ TLS 1.3 |
| **Encryption at Rest** | ❌ N/A | ❌ N/A | ✅ AES-256 (audit logs) |
| **Input Validation** | ✅ DOMPurify (client) | ✅ Enhanced | ✅ DOMPurify + Joi (server) |
| **Output Encoding** | ✅ HTML escape | ✅ HTML escape | ✅ HTML escape |
| **Rate Limiting** | ❌ None | ⚠️ Client-side | ✅ API Gateway (100 req/min/user) |
| **Audit Logging** | ⚠️ Console only | ✅ localStorage | ✅ Azure Table Storage |
| **Secret Management** | ⚠️ Env variables | ⚠️ Env variables | ✅ Azure Key Vault |
| **Monitoring** | ⚠️ Basic | ✅ Enhanced | ✅ Application Insights |
| **WAF** | ❌ None | ❌ None | ✅ Azure API Management |
| **DDoS Protection** | ❌ None | ❌ None | ✅ Azure Front Door |
| **File Upload Security** | ✅ Client-side validation | ✅ File type + size check | ✅ Enhanced + server validation |

### 9.2 Compliance Alignment

| Framework | Requirement | Status |
|-----------|-------------|--------|
| **GDPR** | Data minimization | ✅ No PII stored on servers |
| **GDPR** | Right to export | ✅ Full export capability |
| **GDPR** | Right to erasure | ✅ User controls local data |
| **Corporate Policy** | Encryption standards | ✅ AES-256 / TLS 1.3 |
| **Corporate Policy** | Audit log retention | ⏳ Pending confirmation (Phase 2) |
| **Corporate Policy** | Access logging | ⏳ Planned (Phase 2) |
| **NIST Cybersecurity Framework** | Access Control | 🟢 Phase 0/⏳ Phase 2 |
| **NIST Cybersecurity Framework** | Data Security | 🟢 Phase 0/⏳ Phase 2 |

---

## 10. Implementation Timeline

| Phase | Timeline | Deliverables | Security Enhancements | Status |
|-------|----------|--------------|----------------------|--------|
| **Phase 0** | Current (Jan 2026) | ✅ Pilot operational with RA2025 import | Multi-language support, smart value matching | Active |
| **Phase 1** | Q1 2026 | Enhanced logging, monitoring, file size limits | localStorage audit trail, improved error handling | Planned |
| **Phase 2** | Q2 2026 | Azure migration, SSO, comprehensive audit logging | Entra ID auth, RBAC, Azure Table Storage logs | Planned |
| **Phase 3** | Q3 2026 | SharePoint/Teams integration, mobile version | API-based integrations, OAuth scoping | Planned |

---

## 11. Pre-Meeting Checklist

**Confirmed Items:**
- [x] Architecture documented
- [x] Data flow documented (Phase 0 + Phase 2)
- [x] Risk register complete with new risks
- [x] Technology stack defined
- [x] Integration points identified
- [x] RA2025 template support documented
- [x] Column mapping & value matching logic documented

**Requires Confirmation:**
- [ ] Audit log retention period (1/3/5/7 years)
- [ ] Azure subscription provisioning
- [ ] Entra ID application registration
- [ ] Security testing schedule
- [ ] Pilot distribution list (Phase 0 access control)
- [ ] Phase 1 file size limits for Excel import

---

## 12. Contact Information

| Role | Contact |
|------|---------|
| Application Owner | [EHS Department Lead] |
| Technical Lead | [Development Team Lead] |
| Security Contact | [IT Security] |
| Compliance Contact | [Compliance Officer] |

---

**Document Classification:** Internal Use Only  
**Review Cycle:** Quarterly or before major releases  
**Next Review:** Prior to Phase 1 deployment (Q1 2026)  
**Recent Updates (Jan 26, 2026):** Added RA2025 template support details, updated Phase 0 status, added smart value matching documentation

---

## 1. System Access, Management & Governance

### 1.1 Access Model

| Aspect | Current State (Phase 0) | Future State (Phase 2) |
|--------|------------------------|------------------------|
| **Authentication** | None (URL access only) | Microsoft Entra ID SSO |
| **Authorization** | Open access | Role-based (User, Admin, Auditor) |
| **MFA** | Not available | Supported via Entra ID policies |
| **Session Management** | Browser session only | 1-hour JWT token with refresh |
| **User Provisioning** | N/A | Automated via Entra ID sync |

### 1.2 Governance Structure

| Function | Responsibility |
|----------|---------------|
| **Application Owner** | EHS Department |
| **Technical Owner** | IT Development Team |
| **Security Oversight** | IT Security |
| **Access Approval** | Department Manager + IT Security |
| **Compliance Review** | Quarterly (IT Security + Compliance) |

### 1.3 Access Control Matrix (Phase 2)

| Role | Create Assessment | View Reports | Export Data | Access Audit Logs | Manage Users |
|------|-------------------|--------------|-------------|-------------------|--------------|
| User | ✅ | Own only | Own only | ❌ | ❌ |
| Admin | ✅ | All | All | Read-only | ✅ |
| Auditor | ❌ | All | ❌ | Read-only | ❌ |

---

## 2. Authentication, Authorization & Logging

### 2.1 Authentication Flow (Phase 2)

```
User clicks "Login with Goodyear"
         │
         ▼
Browser redirects to Microsoft Entra ID
         │
         ▼
User enters @goodyear.com credentials
         │
         ▼
Entra ID validates → MFA prompt (if configured)
         │
         ▼
JWT token issued (signed, 1-hour expiry)
         │
         ▼
Token stored in sessionStorage (not persistent)
         │
         ▼
Token included in all API requests
         │
         ▼
API Gateway validates token → App Service validates again
         │
         ▼
Request processed → Audit log created
```

**Token Contents:** User ID, Email, Display Name, Department, Groups/Roles  
**Token Storage:** sessionStorage (cleared on browser close)  
**Token Validation:** Microsoft signature verification, expiration check, audience validation

### 2.2 Authorization Rules

| Resource | Condition | Enforcement Point |
|----------|-----------|-------------------|
| Application access | Valid Entra ID token | API Gateway |
| AI features | Authenticated + rate limit not exceeded | App Service |
| Audit log access | Admin or Auditor role | API Gateway + App Service |
| User management | Admin role only | App Service |

### 2.3 Audit Logging

**Events Captured:**

| Event Type | Data Logged |
|------------|-------------|
| Authentication | User ID, timestamp, IP, success/failure, MFA status |
| Assessment actions | User ID, action (create/edit/export), timestamp, assessment ID |
| AI requests | User ID, request type, timestamp, model used, token count |
| Admin actions | User ID, target user, action, timestamp |
| Security events | Failed logins, rate limit hits, invalid tokens |

**Log Properties:**
- **Storage:** Azure Table Storage (encrypted AES-256)
- **Retention:** Per Goodyear IT policy (recommend 7 years)
- **Immutability:** Append-only, no deletion capability
- **Access:** Log Analytics queries, read-only for auditors

---

## 3. Data Flow, Security & Scope

### 3.1 Data Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Assessment data (text, photos, ratings)                      │    │
│  │ Face detection & blurring (local processing)                 │    │
│  │ PDF/Excel generation (local processing)                      │    │
│  │ localStorage: User preferences only                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/TLS 1.3 (assessment text for AI only)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AZURE INFRASTRUCTURE                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ API Gateway  │ → │ App Service  │ → │ Azure OpenAI │            │
│  │ (Auth, Rate  │   │ (Processing) │   │ (AI Tasks)   │            │
│  │  Limiting)   │   │              │   │              │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
│         │                  │                                        │
│         │                  ▼                                        │
│         │           ┌──────────────┐   ┌──────────────┐            │
│         └─────────→ │ Key Vault    │   │Table Storage │            │
│                     │ (API keys)   │   │(Audit logs)  │            │
│                     └──────────────┘   └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Types & Classification

| Data Type | Classification | Storage Location | Retention | Encryption |
|-----------|---------------|------------------|-----------|------------|
| Assessment content | Confidential | User's PC only | User controlled | N/A (local) |
| Photos (faces blurred) | Confidential | User's PC only | User controlled | N/A (local) |
| User preferences | Internal | localStorage | Session | N/A (local) |
| Audit logs | Internal | Azure Table Storage | Per policy | AES-256 |
| API keys | Restricted | Azure Key Vault | Perpetual | AES-256 |
| JWT tokens | Restricted | sessionStorage | 1 hour | Signed by Entra ID |

### 3.3 Data Sent to AI Service

| Sent | Not Sent |
|------|----------|
| Task/hazard descriptions (text) | Photos or images |
| Control measure text | Personal identifiable information |
| Risk rating context | User credentials |
| Hazard categories | Location details |

**AI Data Handling (Azure OpenAI):**
- Enterprise data processing agreement
- Data NOT used for model training
- No data retention beyond request processing
- Encrypted in transit (TLS 1.3)

### 3.4 Transport Security

| Connection | Protocol | Minimum Version | Cipher Suite |
|------------|----------|-----------------|--------------|
| Browser ↔ GitHub Pages | HTTPS | TLS 1.3 | AES-256-GCM |
| Browser ↔ API Gateway | HTTPS | TLS 1.3 | AES-256-GCM |
| App Service ↔ Azure OpenAI | HTTPS | TLS 1.3 | AES-256-GCM |
| App Service ↔ Key Vault | Azure internal | Managed | Microsoft managed |

---

## 4. Data Governance & Lifecycle

### 4.1 Data Lifecycle

| Phase | Description | Owner | Duration |
|-------|-------------|-------|----------|
| **Creation** | User enters assessment data in browser | User | Active session |
| **Processing** | AI generates suggestions, face blur applied | User (client-side) | Seconds |
| **Storage** | Assessment saved locally; audit log to Azure | User / Azure | User-controlled / Per policy |
| **Export** | User downloads PDF/Excel/ZIP | User | On demand |
| **Archival** | User moves to SharePoint/OneDrive | User | Per corporate policy |
| **Deletion** | User deletes local files; audit logs auto-purge | User / Automated | Manual / Per policy |

### 4.2 Data Retention Requirements

| Data Category | Retention Period | Justification | Storage |
|---------------|------------------|---------------|---------|
| Assessment data | User-controlled | Not server-stored | User's PC |
| Audit logs | TBD (recommend 7 years) | Compliance/investigation | Azure Table Storage |
| API logs | 30 days | Troubleshooting | Azure Log Analytics |
| Session data | Session duration | Temporary | Browser memory |

**⚠️ Action Required:** Confirm audit log retention period with IT Security before Phase 2 deployment.

### 4.3 Data Export & Portability

Users can export all their data at any time:
- **PDF reports** — formatted assessment documents
- **Excel spreadsheets** — tabular data for analysis
- **GOEHS batch files** — CSV/Excel for vendor Risk Registry import
- **Project ZIP** — complete backup of all assessment data

**Server retains:** Only audit logs (who/what/when) — never assessment content.

---

## 5. Integration Points with Goodyear Systems

### 5.1 Current Integrations (Phase 0)

| System | Integration Type | Data Exchanged | Security |
|--------|------------------|----------------|----------|
| GitHub Pages | Static hosting | HTML/JS/CSS files | HTTPS |
| Vercel | API proxy | AI requests (text only) | HTTPS + API key |
| OpenRouter | AI service | Assessment text | HTTPS + API key |

### 5.2 Planned Integrations (Phase 2)

| System | Integration Type | Data Exchanged | Security |
|--------|------------------|----------------|----------|
| **Microsoft Entra ID** | OAuth 2.0 + OIDC | User identity, JWT tokens | Microsoft-managed |
| **Azure API Management** | Gateway | All API traffic | WAF, rate limiting |
| **Azure Key Vault** | Secret management | API keys (retrieved) | RBAC, encryption |
| **Azure OpenAI** | AI service | Assessment text | Enterprise DPA |
| **Azure Table Storage** | Audit logs | Event records | Encryption at rest |
| **Azure Log Analytics** | Monitoring | Metrics, logs | Azure RBAC |

### 5.3 Future Integrations (Phase 3)

| System | Purpose | Data Exchanged |
|--------|---------|----------------|
| SharePoint | Document storage | Exported PDFs |
| Microsoft Teams | Notifications | Assessment summaries |
| Splunk | Centralized logging | Audit events |
| GOEHS Risk Registry | Batch upload | Assessment/Task/Hazard data |

### 5.4 GOEHS Integration Detail

**Purpose:** Export risk assessment data to GOEHS vendor Risk Registry via batch upload

**Data Flow:**
1. User completes assessment in main table
2. Opens GOEHS Integration modal (3 tabs: Assessment, Task, Hazard)
3. AI Assist or Intelligent Fill suggests field values
4. User reviews and validates data
5. Exports as CSV/Excel (copied to clipboard or downloaded)
6. User pastes/uploads to GOEHS system (manual step)

**Security Controls:**
- All exports go to user's device only
- Date format validation (DD-MMM-YYYY)
- Dropdown values validated against vendor whitelist
- XSS prevention via DOMPurify
- No direct API connection to GOEHS (user-mediated)

---

## 6. Updates, Upgrades & Technologies

### 6.1 Technology Stack

| Layer | Current (Phase 0) | Future (Phase 2) |
|-------|-------------------|------------------|
| **Frontend** | Vanilla JS ES6+, Tailwind CSS | Same |
| **Face Detection** | face-api.js (TensorFlow.js) | Same |
| **PDF Generation** | PDFKit (client-side) | Same |
| **Excel Export** | JSZip + SheetJS | Same |
| **Input Sanitization** | DOMPurify 3.1.6 | Same |
| **Backend Runtime** | Node.js 18 LTS | Same |
| **Backend Framework** | Express.js 4.18.2 | Same |
| **Hosting** | Vercel (serverless) | Azure App Service |
| **Authentication** | None | Microsoft Entra ID |
| **AI Service** | OpenRouter (GPT-4o-mini) | Azure OpenAI (GPT-4) |
| **Secrets Management** | Vercel env variables | Azure Key Vault |
| **Audit Logging** | Minimal | Azure Table Storage |
| **Monitoring** | Vercel dashboard | Azure Application Insights |

### 6.2 Deployment Process

| Phase | Process |
|-------|---------|
| **Current** | Manual: Git commit → GitHub → Vercel auto-deploy (5 min) |
| **Future** | CI/CD: Git commit → GitHub Actions (tests, SAST) → Azure Container Registry → Staging → Approval → Production (blue-green) |

### 6.3 Security Gates

| Gate | Trigger | Action on Failure |
|------|---------|-------------------|
| Unit tests | Every commit | Block merge |
| SAST scan | Every PR | Block merge |
| Dependency audit | Daily | Alert + remediation ticket |
| Penetration test | Quarterly | Risk acceptance or fix |
| Code review | Every PR | Block merge |

### 6.4 Rollback Capability

- **Current:** Revert Git commit → Vercel redeploys (~5 min)
- **Future:** Blue-green deployment → instant traffic switch to previous version

---

## 7. Identified Risks & Mitigation Strategies

### 7.1 Risk Register Summary

| ID | Risk | Current Severity | Phase 2 Severity | Mitigation |
|----|------|------------------|------------------|------------|
| R1 | No authentication | 🔴 HIGH | 🟢 RESOLVED | Entra ID SSO with MFA |
| R2 | No audit logging | 🟡 MEDIUM | 🟢 RESOLVED | Azure Table Storage (7-year retention) |
| R3 | No rate limiting | 🟡 MEDIUM | 🟢 RESOLVED | API Gateway (100 req/min/user) |
| R4 | Third-party AI dependency | 🟡 MEDIUM | 🟢 RESOLVED | Azure OpenAI (SLA 99.99%) |
| R5 | Data exposure to AI vendor | 🟡 MEDIUM | 🟢 RESOLVED | Enterprise DPA, no training use |
| R6 | XSS/injection attacks | 🟡 MEDIUM | 🟢 RESOLVED | DOMPurify + server validation + WAF |
| R7 | API key exposure | 🟢 RESOLVED | 🟢 RESOLVED | Key Vault with RBAC |
| R8 | TLS misconfiguration | 🟢 LOW | 🟢 LOW | Azure-managed certificates |

### 7.2 Risk Detail: No Authentication (R1)

**Current State (Phase 0):**
- Anyone with URL can access the application
- No user tracking or accountability
- **Mitigation:** Pilot-only distribution, URL not publicly advertised

**Phase 2 Resolution:**
- Mandatory Entra ID authentication
- MFA enforced per corporate policy
- All access logged with user identity
- Session timeout after 1 hour of inactivity

### 7.3 Risk Detail: Third-Party AI (R4)

**Current State:**
- OpenRouter processes assessment text
- Single point of failure if service unavailable
- Data potentially used for model training

**Phase 2 Resolution:**
- Azure OpenAI under Goodyear contract
- Enterprise data processing agreement
- Data NOT used for training
- 99.99% SLA with failover

### 7.4 Residual Risks (Accepted by Design)

| Risk | Rationale | Control |
|------|-----------|---------|
| No server-side assessment storage | Reduces data retention liability, improves privacy | User exports to local storage |
| User controls data deletion | GDPR alignment, user ownership | Audit logs retained separately |
| AI suggestions may be incorrect | AI is assistive, not authoritative | User review required before export |

---

## 8. Security Controls Summary

### 8.1 Control Matrix

| Control Category | Current (Phase 0) | Phase 2 |
|------------------|-------------------|---------|
| **Authentication** | ❌ None | ✅ Entra ID SSO |
| **Authorization** | ❌ None | ✅ RBAC (User/Admin/Auditor) |
| **MFA** | ❌ None | ✅ Entra ID policy |
| **Encryption in Transit** | ✅ TLS 1.3 | ✅ TLS 1.3 |
| **Encryption at Rest** | ❌ N/A (no storage) | ✅ AES-256 (audit logs) |
| **Input Validation** | ✅ DOMPurify | ✅ DOMPurify + Joi (server) |
| **Output Encoding** | ✅ HTML escape | ✅ HTML escape |
| **Rate Limiting** | ❌ None | ✅ 100 req/min/user |
| **Audit Logging** | ⚠️ Minimal | ✅ Comprehensive |
| **Secret Management** | ⚠️ Env variables | ✅ Azure Key Vault |
| **Monitoring** | ⚠️ Basic | ✅ Application Insights |
| **WAF** | ❌ None | ✅ Azure API Management |
| **DDoS Protection** | ❌ None | ✅ Azure Front Door |

### 8.2 Compliance Alignment

| Framework | Requirement | Status |
|-----------|-------------|--------|
| **GDPR** | Data minimization | ✅ No PII stored on servers |
| **GDPR** | Right to export | ✅ Full export capability |
| **GDPR** | Right to erasure | ✅ User controls local data |
| **Corporate Policy** | Audit log retention | ⚠️ Pending confirmation |
| **Corporate Policy** | Access logging | ✅ Phase 2 |
| **Corporate Policy** | Encryption standards | ✅ AES-256 / TLS 1.3 |

---

## 9. Implementation Timeline

| Phase | Timeline | Deliverables | Security Gate |
|-------|----------|--------------|---------------|
| **Phase 0** | Current | Pilot operational | Limited distribution |
| **Phase 1** | Q1 2026 | Enhanced logging, monitoring | Operational readiness |
| **Phase 2** | Q2 2026 | Azure migration, SSO, audit logging | IT Security sign-off |
| **Phase 3** | Q3 2026 | SharePoint/Teams integration | Feature approval |

---

## 10. Pre-Meeting Checklist

**Confirmed Items:**
- [x] Architecture documented
- [x] Data flow documented
- [x] Risk register complete
- [x] Technology stack defined
- [x] Integration points identified

**Requires Confirmation:**
- [ ] Audit log retention period (1/3/5/7 years)
- [ ] Azure subscription provisioning
- [ ] Entra ID application registration
- [ ] Security testing schedule

---

## 11. Contact Information

| Role | Contact |
|------|---------|
| Application Owner | [EHS Department Lead] |
| Technical Lead | [Development Team Lead] |
| Security Contact | [IT Security] |
| Compliance Contact | [Compliance Officer] |

---

**Document Classification:** Internal Use Only  
**Review Cycle:** Quarterly or before major releases  
**Next Review:** Prior to Phase 2 deployment
