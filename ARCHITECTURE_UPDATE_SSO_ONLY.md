# Architecture Update: SSO-Only Login & Local-Download Reports
## Risk Assessment Buddy Smart 3.0 - Redesigned Future State

---

## Summary of Changes

**Major Design Decisions:**

1. **Authentication: SSO ONLY**
   - Users login ONLY via Microsoft Entra ID (company badge)
   - NO separate username/password for the app
   - NO local user database in Azure
   - Simplified access management

2. **Report Storage: LOCAL PC ONLY**
   - NO assessment database in Azure
   - NO server-side report storage
   - All reports downloaded to user's local PC
   - Same as current behavior (just more secure)

3. **Azure Storage: Minimal**
   - ONLY audit logs (for compliance)
   - ONLY session tokens (temporary)
   - ONLY system logs (for monitoring)
   - NO personal or assessment data on servers

---

## Redesigned Architecture

### Current State vs Future State Comparison

```
CURRENT STATE (Now)
├── Frontend: GitHub Pages SPA
├── Backend: Vercel Express server
├── AI: OpenRouter API (third-party)
├── Auth: None (open access)
├── Storage: localStorage on user's computer
└── Reports: Download to local PC

FUTURE STATE (Q2 2026)
├── Frontend: GitHub Pages SPA (same)
├── Backend: Azure App Service
├── AI: Azure OpenAI (company-controlled)
├── Auth: SSO via Entra ID (company badge ONLY)
├── Storage: Minimal - audit logs only
└── Reports: Download to local PC (same)
```

---

## What Each Component Does (Updated)

### 🔐 **Authentication Layer - SSO Only**

**What Changed:**
- Before: Open app, fill form, no login
- Now: Login with your Goodyear email/badge, then use app
- Future: Same Entra ID login for all company apps

**Process:**
```
USER
  ↓ Clicks "Login with Goodyear"
  ↓
ENTRA ID (Company Login)
  ↓ User enters: email + password
  ↓ Entra ID checks: "Is this a Goodyear employee?"
  ↓ If MFA enabled: "Approve on your phone"
  ↓
APP RECEIVES TOKEN
  ↓ Digital ID card proving they are authenticated
  ↓ Valid for 1 hour (auto-renews)
  ↓
USER ACCESS GRANTED
  ↓ Opens Risk Assessment app
  ↓ Creates assessments
  ↓ Downloads reports
```

**Token System (JWT - JSON Web Token):**
```
Token Contains:
{
  "user": "john.smith@goodyear.com",
  "department": "Safety",
  "expires": "2026-01-16 15:30:00",
  "issued_by": "Microsoft Entra ID",
  "cryptographic_signature": "xxxxx..."
}

Token Never Changes:
- Same person, same token (for 1 hour)
- One token per login session
- Automatically rotates before expiration
- No re-login needed (seamless)
```

---

### 🛡️ **API Management Gateway**

**What It Does:**
```
Incoming Request
  ↓
1. CHECK AUTHENTICATION
   "Do you have a valid token?"
   If No → REJECT (401 Unauthorized)
   If Yes → Continue
  ↓
2. CHECK RATE LIMIT
   "Have you made too many requests?"
   Example: 100 requests/min is OK, 10,000 is NOT
   If Exceeded → SLOW DOWN (429 Too Many Requests)
   If OK → Continue
  ↓
3. DECRYPT & ROUTE
   Use TLS 1.3 to decrypt request
   Route to correct backend service
   ↓
4. FORWARD TO APP SERVICE
   Send to Node.js backend
   Include: User info, token, request
```

**Rate Limiting Examples:**
- Normal employee: 100 API calls/minute = ✅ Allowed
- Automated bot: 10,000 API calls/minute = ❌ Blocked
- Malicious attacker: 50,000 API calls/minute = ❌ Blocked

**Why This Matters:**
- ✅ Protects against attacks
- ✅ Fair resource sharing
- ✅ Prevents accidental overload
- ✅ Saves costs

---

### 💻 **App Service - Your Application**

**What It Does:**
```
Receives: User request + validated token
  ↓
1. VALIDATE TOKEN
   Checks: "Is this token real and not expired?"
   ↓
2. FETCH API KEYS
   Asks Key Vault: "May I have the OpenAI API key?"
   Key Vault: "Yes, here it is (encrypted)"
   ↓
3. PROCESS REQUEST
   If request is "Generate tasks":
     - Takes hazard description
     - Creates AI prompt
     - Sends to Azure OpenAI
     - Gets back JSON response
     - Validates response
     - Returns to user
   ↓
4. LOG ACTION
   Records to audit logs:
     - Who: john.smith@goodyear.com
     - What: Generated 5 tasks for hazard XYZ
     - When: 2026-01-16 14:30:45
     - Status: Success
   ↓
5. SEND RESPONSE
   Returns formatted JSON to user
   Example:
   {
     "status": "success",
     "tasks": [
       {"id": 1, "title": "Install guardrail", ...},
       {"id": 2, "title": "Provide training", ...}
     ]
   }
```

**Important: No Report Storage**
- User request: "Export as PDF"
- App Service: Sends data to client
- Browser: Generates PDF locally
- Downloads to: User's computer
- Server NEVER stores the PDF

---

### 🤖 **Azure OpenAI - The AI Brain**

**What Changed:**
- Before: Third-party service (OpenRouter)
- Now: Company-owned service (Azure OpenAI)
- Same GPT models, but under Goodyear control

**How It Works:**
```
App Service
  ↓ Sends: "Generate 5 safety tasks for: Slippery floor in kitchen"
  ↓
Azure OpenAI
  ↓ Processes with GPT-4 or GPT-3.5 model
  ↓ Generates intelligent response
  ↓
Response Back to App
  ✓ Task 1: Install non-slip mats
  ✓ Task 2: Establish cleaning schedule
  ✓ Task 3: Train employees
  ✓ Task 4: Mark hazardous area
  ✓ Task 5: Incident tracking process
  ↓
App Returns to Browser
  ↓
User Sees Results
```

**Benefits of Azure OpenAI:**
- ✅ Data never leaves company
- ✅ No quota limits
- ✅ Better performance SLA
- ✅ Can use more powerful models (GPT-4)
- ✅ Full control and monitoring

---

### 🔑 **Key Vault - Secret Lockbox**

**What It Stores:**
- Azure OpenAI API key
- Database connection strings (if needed later)
- SSL certificates
- Any sensitive configuration

**How It Works:**
```
App Service needs OpenAI API key
  ↓
Asks Key Vault: "Can I have the key?"
  ↓
Key Vault checks: "Is this App Service legitimate?"
  ↓
If Yes:
  - Retrieves key (encrypted)
  - Sends to App Service
  - App Service uses key
  - Returns key immediately
  - Key NEVER stored in app code
  
If No:
  - Access DENIED
  - Logged as security alert
```

**Security Benefits:**
- ✅ Keys never in source code
- ✅ Keys never visible to developers
- ✅ Keys rotate automatically
- ✅ Revoke access instantly if compromised
- ✅ Complete audit trail of access

---

### 📊 **Azure Storage - Minimal (Audit Logs Only)**

**What Changed:**
```
OLD DESIGN (Before This Update)
├── SQL Database → Assessment Records, User Profiles, Session Data
├── Blob Storage → PDF Exports, Excel Reports
└── Table Storage → Audit Logs

NEW DESIGN (Current Update)
└── Table Storage ONLY → Audit Logs, Session Tokens, System Metrics
    (NO assessment records)
    (NO exported reports)
    (NO user profiles)
```

**Why This Is Better:**
- ✅ Simpler architecture
- ✅ Lower costs (no database)
- ✅ Less data = Less privacy risk
- ✅ Faster deletions (no backups to manage)
- ✅ Meets compliance easily (no stored PII)

**What Table Storage Stores:**
```
1. AUDIT LOGS (Compliance requirement)
   {
     "timestamp": "2026-01-16 14:30:45",
     "user": "john.smith@goodyear.com",
     "action": "GENERATED_TASKS",
     "hazard_id": "HAZ-001",
     "status": "SUCCESS",
     "ip_address": "192.168.1.100"
   }

2. SESSION TOKENS (Temporary)
   {
     "token_id": "abc123xyz...",
     "user": "john.smith@goodyear.com",
     "expires": "2026-01-16 15:30:00",
     "created": "2026-01-16 14:30:00"
   }

3. SYSTEM METRICS (For monitoring)
   {
     "timestamp": "2026-01-16 14:30:45",
     "metric": "API_RESPONSE_TIME",
     "value": "245ms",
     "endpoint": "/api/ai"
   }
```

**Duration of Storage:**
- Audit logs: 7 years (OSHA requirement)
- Session tokens: Automatically deleted when expired
- System metrics: 90 days (for trend analysis)

---

### 📈 **Application Insights & Log Analytics**

**What They Monitor:**

**Application Insights:**
- How fast API responds (SLA: <500ms)
- How many errors occur (Alert if >1%)
- Which features are used most
- Performance trends

**Log Analytics:**
- Query audit logs (who did what when)
- Search for specific actions
- Generate compliance reports
- Alert on suspicious activity

**Example Queries:**

Query 1: "Show me who accessed the system today"
```
Results:
user_john.smith@goodyear.com - 47 API calls
user_jane.doe@goodyear.com - 23 API calls
user_bob.wilson@goodyear.com - 15 API calls
```

Query 2: "Show me all errors from today"
```
Results:
14:32:15 - Error: Invalid token (user: john.smith@goodyear.com)
14:45:22 - Error: API rate limit exceeded (user: bot-service)
15:01:10 - Error: OpenAI service timeout (all users affected)
```

Query 3: "Generate compliance report for Q1 2026"
```
Results:
Total assessments generated: 234
Total API calls: 1,247
Failed requests: 2
Uptime: 99.98%
```

---

## Data Flow Comparison

### **Current State (Now)**

```
YOU (GitHub Pages)
  ↓ (No encryption, public)
  ↓
OPENROUTER API
  ↓ (Processes)
  ↓
Response
  ↓
YOUR BROWSER
  ↓ (Generates PDF)
  ↓
DOWNLOAD TO PC
  ↓
SAVED LOCALLY
```

### **Future State (Q2 2026)**

```
YOU (GitHub Pages)
  ↓
CLICK LOGIN
  ↓
ENTRA ID
  ↓ "Who are you?"
  ↓
YOU AUTHENTICATE
  ↓ Email + Password + Phone (if MFA)
  ↓
ENTRA ID CREATES TOKEN
  ↓ Digital proof of identity
  ↓
YOUR APP
  ↓ (Has token in every request)
  ↓
API GATEWAY (Azure)
  ↓ "Do you have a valid token?"
  ↓ ✓ YES → Continue
  ↓
APP SERVICE (Azure)
  ↓ (Validates token again)
  ↓ (Fetches API key from Key Vault)
  ↓
AZURE OPENAI
  ↓ (Processes AI request)
  ↓
Response
  ↓
YOUR BROWSER
  ↓ (All local: validation, PDF generation, etc.)
  ↓
DOWNLOAD TO PC
  ↓
SAVED LOCALLY
  ↓
AUDIT LOG ENTRY
  ↓ (Azure records: who, what, when)
```

**Key Difference:** Every step is encrypted, authenticated, and logged

---

## Report Flow (Local Download)

### **How Reports Are Created**

```
1. USER CLICKS "EXPORT AS PDF"
   ↓
2. BROWSER GATHERS DATA
   All hazard info is in browser memory
   (This data NEVER leaves the PC)
   ↓
3. LOCAL PROCESSING
   PDFKit library (running on your computer)
   - Formats data
   - Embeds images
   - Blurs faces
   - Creates professional PDF
   ↓
4. DOWNLOAD
   File saved to Downloads folder
   File name: RA_2026-01-16_Building-A.pdf
   ↓
5. OPTIONAL: SHARE
   You can email it to team
   You can upload to SharePoint
   You decide what to do with it
   ↓
6. SERVER RESPONSE
   Azure backend logs:
   - Who exported
   - When
   - For which assessment
   (NOT what's in the file)
```

**Why Server Never Sees the PDF:**
- ✅ PDFKit runs in browser (JavaScript)
- ✅ PDF never uploaded to server
- ✅ Just a download notification to server
- ✅ Server logs the action, not the content
- ✅ Privacy protected

---

## Audit Trail (Compliance)

### **What Gets Logged**

**Action: Employee Creates Assessment**
```
{
  "timestamp": "2026-01-16 14:30:45.123Z",
  "user": "john.smith@goodyear.com",
  "action": "ASSESSMENT_CREATED",
  "assessment_id": "ASS-2026-0001",
  "hazard_category": "Fall from Height",
  "building": "A",
  "region": "US",
  "ip_address": "192.168.1.100",
  "browser": "Chrome 119",
  "status": "SUCCESS",
  "duration_ms": 245
}
```

**Action: Employee Generates AI Tasks**
```
{
  "timestamp": "2026-01-16 14:31:12.456Z",
  "user": "john.smith@goodyear.com",
  "action": "AI_TASKS_GENERATED",
  "assessment_id": "ASS-2026-0001",
  "task_count": 5,
  "model_used": "GPT-4",
  "tokens_used": 342,
  "ip_address": "192.168.1.100",
  "status": "SUCCESS",
  "response_time_ms": 1850
}
```

**Action: Employee Exports Report**
```
{
  "timestamp": "2026-01-16 14:32:05.789Z",
  "user": "john.smith@goodyear.com",
  "action": "REPORT_EXPORTED",
  "assessment_id": "ASS-2026-0001",
  "export_format": "PDF",
  "ip_address": "192.168.1.100",
  "status": "SUCCESS"
}
```

**Action: Failed Login Attempt**
```
{
  "timestamp": "2026-01-16 14:25:30.111Z",
  "user": "unknown",
  "action": "LOGIN_FAILED",
  "reason": "Invalid credentials",
  "ip_address": "203.45.67.89",
  "browser": "Unknown",
  "status": "FAILURE"
}
```

**Action: Suspicious Activity Detected**
```
{
  "timestamp": "2026-01-16 14:15:45.222Z",
  "user": "john.smith@goodyear.com",
  "action": "RATE_LIMIT_EXCEEDED",
  "requests_in_minute": 450,
  "limit": 100,
  "ip_address": "192.168.1.100",
  "status": "BLOCKED"
}
```

**Why This Matters:**
- ✅ OSHA compliance (7-year record requirement)
- ✅ Security audits (see who did what)
- ✅ Anomaly detection (spot suspicious behavior)
- ✅ Troubleshooting (find root causes)
- ✅ Legal protection (prove system worked correctly)

---

## Security Levels

### **Layer 1: Authentication**
- Microsoft Entra ID verifies identity
- MFA (two-factor) available
- Tokens expire and refresh
- No permanent password stored in app

### **Layer 2: API Gateway**
- Validates every request
- Checks rate limits
- Enforces CORS policy
- Blocks suspicious patterns

### **Layer 3: Application**
- Validates token again (defense in depth)
- Sanitizes all inputs
- Encrypts all responses
- Logs all actions

### **Layer 4: Transport**
- TLS 1.3 encryption
- HTTPS only (no HTTP)
- Perfect forward secrecy
- Certificate pinning (optional)

### **Layer 5: Data At Rest**
- Audit logs encrypted
- Key Vault encrypted
- Azure Storage encrypted
- Multi-layer encryption

---

## Phase 2 Implementation Checklist

### **Frontend Changes (Minimal)**
- [ ] Add MSAL.js library for SSO login
- [ ] Create login button
- [ ] Handle token in localStorage
- [ ] Add token to all API requests
- [ ] Handle token expiration/refresh
- [ ] Add logout button

### **Backend Changes (Azure)**
- [ ] Create App Service in Azure
- [ ] Deploy Node.js server
- [ ] Configure Key Vault
- [ ] Set up Azure OpenAI integration
- [ ] Implement JWT validation
- [ ] Add audit logging to Table Storage
- [ ] Configure CORS for GitHub Pages

### **Infrastructure Setup**
- [ ] Create Resource Group
- [ ] Set up API Management gateway
- [ ] Configure rate limiting policies
- [ ] Enable Application Insights
- [ ] Set up Log Analytics workspace
- [ ] Configure alerts
- [ ] Enable SSL certificates

### **Security & Compliance**
- [ ] Configure Entra ID application
- [ ] Set up MFA policies
- [ ] Enable audit logging
- [ ] Configure 7-year retention
- [ ] Set up threat detection
- [ ] Compliance report generation

### **Testing**
- [ ] Test SSO login flow
- [ ] Test token refresh
- [ ] Test AI task generation
- [ ] Test PDF export
- [ ] Test audit logging
- [ ] Load testing (100+ concurrent users)
- [ ] Security penetration testing

---

## Costs Comparison

### **Current (Vercel + OpenRouter)**
- Vercel hosting: ~$50/month
- OpenRouter API: ~$30-50/month (variable)
- CDN: Included in Vercel
- **Total: $80-100/month**

### **Future (Azure + OpenAI)**
- App Service: ~$60-80/month
- API Management: ~$40/month
- Azure OpenAI: ~$50-80/month (based on usage)
- Azure Storage: ~$5/month
- Application Insights: ~$5/month
- Log Analytics: ~$20/month
- **Total: $180-230/month**

**Cost Increase Rationale:**
- More reliability (99.99% vs 99.9%)
- Better performance
- Enterprise compliance ready
- Company control of infrastructure
- Scale-ready for 1,000+ users

---

## Migration Timeline

### **Phase 0: NOW (Jan 2026)**
- ✅ Current Vercel deployment
- ✅ Basic security
- Document architecture

### **Phase 1: Weeks 1-4 (Jan-Feb 2026)**
- [ ] Add monitoring to Vercel
- [ ] Update legal registry database
- [ ] Run pilot with small group
- [ ] Gather feedback

### **Phase 2: Weeks 5-12 (Feb-Mar 2026)**
- [ ] Build Azure infrastructure
- [ ] Implement SSO login
- [ ] Migrate AI to Azure OpenAI
- [ ] Set up audit logging
- [ ] Security testing

### **Phase 3: Go-Live (Apr 2026)**
- [ ] Switch to Azure
- [ ] All users login with SSO
- [ ] Vercel kept as backup
- [ ] Monitor closely

### **Phase 4: Optimization (May 2026+)**
- [ ] Performance tuning
- [ ] Cost optimization
- [ ] Feedback implementation
- [ ] Feature additions

---

## FAQ: SSO-Only with Local Reports

### **Q: Do I need a separate password for the app?**
A: No! You login once with your Goodyear email. That's it. Same as email/Teams/OneDrive.

### **Q: Where are my reports stored?**
A: Only on your computer. Downloaded to your Downloads folder. You decide if you share them.

### **Q: Can the company see my reports?**
A: No. Your reports are not on company servers. Only you have them. You can choose to upload to SharePoint if needed.

### **Q: What information does the company track?**
A: Only that you used the app (who, when, what action). Not the content of your assessments.

### **Q: If I delete my report, can IT recover it?**
A: No. Since it's on your PC, only you can recover from recycle bin. Company doesn't have a copy.

### **Q: What if the app goes down?**
A: You can still access reports on your PC. You can create new reports offline. They sync when internet returns.

### **Q: Is this more secure than before?**
A: Yes! Every request is encrypted, authenticated, and logged. Before was open access.

### **Q: How long are my actions tracked?**
A: 7 years (OSHA requirement). After that, automatically deleted.

### **Q: Can I use this on my personal computer?**
A: Yes! You login with your Goodyear email, use app, download reports locally.

### **Q: What if I forget to login?**
A: App redirects you to login page. Just click "Login with Goodyear."

### **Q: Can I share assessments with teammates?**
A: Export as PDF, email to team, or upload to SharePoint. Your choice.

### **Q: Is my data backed up?**
A: Your reports on your PC are your responsibility. Audit logs backed up 7 years on company servers.

---

## Key Differences: This Design vs. Traditional SaaS

```
TRADITIONAL SAAS (Not This App)
├── User data stored in company database
├── All reports stored on servers
├── Company can see all content
├── If server deleted, data lost
├── Complex data retention policies
└── Users can't work offline

THIS APP (New Design)
├── User data stays on PC (localStorage)
├── Reports stored on user's computer
├── Company only sees metadata (audit logs)
├── Users own their reports
├── Simple data retention (7 years auto-delete logs)
└── Works offline, syncs when online
```

---

## Next Steps

1. **Review this architecture** with your IT team
2. **Validate security** meets company policies
3. **Estimate costs** and get budget approval
4. **Plan timeline** for Phase 2 implementation
5. **Begin Phase 1** monitoring and improvements

