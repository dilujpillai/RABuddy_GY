# Risk Assessment Buddy Smart 3.0 — IT Security Review

**Document Version:** 2.0  
**Prepared For:** IT Security Technical Review Meeting  
**Last Updated:** January 2026  
**Classification:** Internal Use Only

---

## Executive Summary

**Application:** Risk Assessment Buddy Smart 3.0  
**Purpose:** Occupational health and safety risk assessment tool with AI-assisted hazard analysis and GOEHS vendor integration  
**Current State:** Phase 0 (Pilot) — GitHub Pages + Vercel + OpenRouter  
**Target State:** Phase 2 (Production) — Azure App Service + Entra ID SSO + Azure OpenAI  
**Timeline:** Production deployment Q2 2026

**Key Security Design Principle:** Client-side processing with minimal server-side data retention. Assessment data remains on user's device; only audit logs are stored server-side.

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
