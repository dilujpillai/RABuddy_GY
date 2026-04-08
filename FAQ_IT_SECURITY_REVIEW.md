# FAQ — IT Security Review Meeting

**Risk Assessment Buddy Smart 3.0**  
**For IT Security & Compliance Review**  
**Date:** January 28, 2026

---

## Overview

This FAQ consolidates the most common questions IT security teams ask about Risk Assessment Buddy Smart 3.0, organized by category for the security review meeting.

---

## 1. ACCESS & AUTHENTICATION

### Q1: How do users access this system?

**Current (Phase 0 - Pilot):**
- Users open the application URL in their browser
- There's no authentication in Phase 0 because this is a pilot
- Anyone with the URL can access it, but distribution is limited to known pilots only

**Future (Phase 2 - Production):**
- Users will click "Login with Goodyear"
- Authentication via Microsoft Entra ID (Azure AD) using Goodyear email and password
- MFA support if configured by IT policy
- Sessions last 1 hour with automatic token refresh
- Automatic logout after inactivity

---

### Q2: What happens when someone logs in?

**Answer:**
When a user clicks "Login with Goodyear":
1. Browser redirects to Microsoft Entra ID login page
2. User enters their @goodyear.com credentials
3. Entra ID authenticates and (optionally) prompts for MFA
4. Entra ID returns a JWT token (signed by Microsoft)
5. Browser stores token in sessionStorage (not persistent across sessions)
6. Token included in every API request
7. API Gateway validates the token
8. App Service validates the token again (defense in depth)
9. If valid, request proceeds
10. Audit log entry created: user ID, timestamp, action, IP address

**Security Note:** JWT tokens are signed by Microsoft only; only they can create valid tokens. Tokens expire after 1 hour, and new ones are requested before expiration. Tokens are never stored on our servers.

---

### Q3: Is multi-factor authentication required?

**Answer:**
- **Phase 0 (Pilot):** No (URL-based access only)
- **Phase 2 (Production):** Yes, required per Goodyear policy
- Users will verify with phone, fingerprint, or Windows Hello

---

## 2. DATA STORAGE & LOCATION

### Q4: Where is user data stored?

**Answer - By Design, We Store MINIMAL Data:**

**User's Computer (Local Storage):**
- Risk assessments (while working)
- Uploaded photos (temporary)
- User preferences
- Work-in-progress files

**User's Downloads Folder:**
- PDF reports (when user exports)
- Excel spreadsheets (when user exports)
- Project ZIP files (backup copies)

**Goodyear Azure Storage:**
- Only audit logs (who did what, when)
- Only system metrics
- NO assessment content stored here

**User's SharePoint (Optional):**
- Only if user chooses to upload PDF there (Phase 3)
- Then under Goodyear's SharePoint retention policy

**Why This Design?**
- Users maintain full control of their data
- Minimizes our liability for data retention
- Reduces compliance burden
- Improves privacy (we don't know what's in assessments)

---

### Q5: Can Goodyear employees see other employees' assessments?

**Answer:**
- No. Role-based access control prevents unauthorized viewing
- Only users assigned to that assessment can view it
- Exception: Admins can view all assessments for audit purposes (logged)
- Users have granular permission controls

---

### Q6: What happens if user's laptop is stolen?

**Answer:**
- Assessments on laptop are encrypted
- Even if stolen, files cannot be read without password
- Assessment data is not uploaded to servers, so it's isolated to that device
- No server-side backup means minimal exposure

---

## 3. AUDIT LOGGING & MONITORING

### Q7: What happens to audit logs?

**Answer:**

**What's Logged:**
- Login/logout attempts
- Assessment creation
- AI task generation
- Report downloads
- System errors
- Data exports

**Log Details Include:**
- User ID (from Entra ID)
- Timestamp
- Action description
- IP address
- Result (success/failure)
- Response time

**Storage & Retention:**
- Stored in Azure Table Storage
- 7-year retention (OSHA requirement alignment)
- Encrypted at rest (AES-256)
- Automatically purged after 7 years

**Access:**
- Only IT administrators and compliance officers can access
- Queryable via Log Analytics to answer questions like:
  - "Who created assessments in Building A in January?"
  - "What failed login attempts happened today?"
  - "How many AI requests were made last week?"

---

### Q8: Can Goodyear audit this system?

**Answer:**
- Yes. Audit logs available via Log Analytics
- Read-only access can be granted to internal auditors
- No modification capability (immutable logs)
- Full traceability of all system actions

---

### Q9: What if there's a security incident?

**Answer:**

**Detection:**
- Real-time monitoring via Application Insights
- Alert rules trigger on anomalies
- Example: 100 login failures in 5 minutes

**Investigation:**
- Query audit logs to find affected users
- Check what data was accessed
- Review API calls and responses

**Containment:**
- Immediately revoke compromised tokens
- Disable affected user accounts (via Entra ID)
- Block suspicious IP addresses

**Notification:**
- Alert IT security team
- Notify affected users
- Escalate to management if needed

**Recovery:**
- Redeploy unaffected version
- Reset passwords/keys
- Monitor for further incidents

**Documentation:**
- Timeline of events
- Root cause analysis
- Lessons learned
- Process improvements

**Recommendations:**
- IT security monitors Log Analytics dashboard daily
- Splunk integration for centralized alerting (Phase 3)
- Monthly security review of audit logs

---

## 4. DATA ENCRYPTION & TRANSMISSION

### Q10: What data moves between systems, and is it encrypted?

**Answer - Complete Data Flow:**

**1. Browser → API Gateway (HTTPS/TLS 1.3)**
- User's assessment text and AI request
- Encrypted end-to-end
- Server cannot intercept

**2. API Gateway → App Service (Internal Azure Network)**
- Request validated and routed
- Encrypted over TLS
- Microsoft manages infrastructure

**3. App Service → Key Vault (Secure Azure Call)**
- Requests the OpenAI API key
- Key Vault returns encrypted key
- Key never visible in logs

**4. App Service → Azure OpenAI (HTTPS/TLS 1.3)**
- Assessment text sent (no photos)
- Encrypted in transit
- Azure OpenAI generates tasks
- Response returned encrypted

**5. App Service → Browser (HTTPS/TLS 1.3)**
- AI-generated tasks
- Encrypted in transit

**6. Audit Event → Log Analytics**
- Logging what happened (not the data)
- Example: "John Smith created 1 assessment"
- NOT: The actual assessment content

**Photos:** Never leave the user's computer. Face blurring happens locally in browser before any upload.

---

## 5. SENSITIVE DATA HANDLING

### Q11: How do you handle sensitive data like employee names in photos?

**Answer:**

**Client-Side Face Blurring (Automatic):**
1. When user uploads a photo, face-api.js runs in their browser
2. Automatically detects all faces
3. Blurs them using 25-pixel blur filter
4. Happens before any upload
5. User can see blurred photo and verify it looks good

**Manual Review Available:**
- If auto-blur misses a face, user can manually select areas to blur
- Full user control before exporting

**Local Processing:**
- Blurring happens on user's computer
- We NEVER see unblurred photos
- They never leave the local PC

**Export Controls:**
- When user downloads PDF, it contains blurred images
- Unblurred original stays on user's PC only
- If shared, it's user's responsibility

**Storage:**
- We don't store photos on servers at all
- User owns the files on their computer

---

## 6. INTEGRATION & THIRD PARTIES

### Q12: What data moves to third-party services?

**Answer:**

**Authorized External Services:**
1. **Azure OpenAI (Enterprise Agreement)**
   - Assessment text sent for AI analysis
   - Enterprise data processing agreement in place
   - Data not used for model training
   - Enterprise SLA: 99.99% uptime

2. **GOEHS (Goodyear Internal System)**
   - Risk assessment results exported by user (optional)
   - Under Goodyear's control
   - Via secure API with authentication

3. **GitHub (Code Repository)**
   - Application code only
   - Public source code
   - No user data or assessments

**NOT Shared:**
- No third-party data brokers
- No marketing vendors
- No analytics platforms (tracking user behavior)
- No insurance companies
- No external consultants

---

### Q13: Can we export assessment data to third parties?

**Answer:**
- No. Export is only to GOEHS (internal Goodyear system)
- No third-party access
- AI requests go to Azure OpenAI only (enterprise agreement; no training use of data)
- Users control what they export

---

### Q14: What happens if Azure is breached?

**Answer:**
- Application runs on Azure, but only assessment metadata and audit logs stored there
- Assessment content is client-side only (user's device or GOEHS)
- Even if Azure is breached, actual assessment data is not exposed
- Audit logs are encrypted at rest

---

## 7. API & CREDENTIALS

### Q15: What if an API key is compromised?

**Answer:**
- Key Vault has automatic rotation (every 90 days)
- Compromised key only valid for remaining time in 90-day cycle
- Automatic audit alert if unauthorized use detected
- Keys never hardcoded or visible in source code

---

### Q16: Can you give me admin access to the API?

**Answer:**
- In Phase 2, we'll provide role-based access
- Admins can view audit logs but not modify them (immutable)
- All admin actions are themselves logged
- No direct API key exposure to admins

---

## 8. COMPLIANCE & STANDARDS

### Q17: What compliance standards do you need to meet?

**Answer:**

**Goodyear Corporate Policy:**
- Audit log retention: [Confirm requirement with IT]
- Risk assessment documentation (users can export)
- Safety control tracking (in application)

**OSHA (if applicable):**
- App is NOT directly subject to OSHA's 7-year requirement (that applies to injury logs, medical records)
- Will follow Goodyear's standard audit log retention policy

**GDPR (General Data Protection Regulation - if EU users):**
- User data rights (export, delete)
- Data minimization (only essential data collected)
- Data retention limits (we don't store personal assessments)
- Right to erasure (users own their data)

**Corporate Data Classification:**
- Confidential: Photos with faces (but faces blurred)
- Internal: Assessment summaries (user controls)
- Restricted: API keys and credentials (in Key Vault)

**SOC 2 Type II (if requested):**
- Security controls documented
- Audit logs available for review
- Access controls and monitoring
- Incident response procedures

**Our Architecture Meets These Standards:**
- Minimal data retention (no PII on servers)
- Configurable audit trail (per policy)
- User control (downloads data, not us)
- Encryption (TLS 1.3 in transit, AES-256 at rest)

---

### Q18: Is this compliant with our data security policy?

**Answer:**
- We've designed for standard enterprise compliance
- We'll validate against your specific policy checklist
- Full transparency on data flows and storage
- Ready for custom compliance requirements

---

## 9. RISK MANAGEMENT

### Q19: What are the biggest risks?

**Answer:**

**Phase 0 (Current):**
- 🔴 No authentication (anyone with URL can access)
  - Mitigation: Pilot-only, limited users
  
- 🟡 No audit logging
  - Mitigation: Adding in Phase 1
  
- 🟡 No rate limiting
  - Mitigation: Adding in Phase 2

**Phase 2 (After migration to Azure):**
- 🟢 No significant risks
- ✅ SSO authentication
- ✅ Rate limiting enabled
- ✅ Audit logging 7 years
- ✅ Enterprise support

**Recommendations:**
- Keep Phase 0 to pilot users only
- Don't promote widely until Phase 2
- Plan Azure infrastructure now
- Schedule security assessment before Phase 2 launch

---

### Q20: How do we know if the app is secure?

**Answer:**
- Annual penetration testing by external firm
- Monthly vulnerability scanning
- Real-time monitoring and alerts
- Quarterly compliance audits
- Annual security training for team
- Automated code security gates in CI/CD pipeline

---

## 10. DISASTER RECOVERY & BUSINESS CONTINUITY

### Q21: Do you have a disaster recovery plan?

**Answer:**
- **Phase 0:** Minimal (code in GitHub, can redeploy)
- **Phase 2:** Full Azure backup and failover plan with 4-hour RTO (Recovery Time Objective)
- Daily automated backups of audit logs
- Multi-region deployment capability

---

### Q22: What happens if you go out of business?

**Answer:**
- Users can export all their data anytime as ZIP files
- Code is open-source available
- No vendor lock-in
- Assessment data remains user-owned regardless

---

## 11. PERMISSIONS & ADMINISTRATION

### Q23: Can IT administrators update or delete assessments?

**Answer:**
- No. Only the user who created it or users with explicit permission
- Exception: Admins can DELETE assessments for compliance (all deletions logged)
- Cannot edit without full audit trail
- Immutable audit log of all changes

---

### Q24: Can users manually override AI suggestions?

**Answer:**
- Yes. AI suggestions are assistive, not authoritative
- Users review and edit all AI-generated content before export
- Users control final assessment data
- All changes logged with user ID and timestamp

---

## 12. DATA RETENTION

### Q25: What's your data retention policy?

**Answer:**
- Assessment data: User owns it (we don't store)
- Audit logs: 7 years
- Temporary cache: Deleted with session
- Exported files: User manages in their downloads folder

---

## 13. ROADMAP & FUTURE PHASES

### Q26: What are your plans for the next phase?

**Answer:**

**Phase 2 (Q2 2026) - Production Migration:**
1. Move to Azure App Service (from Vercel)
2. Add SSO with Entra ID authentication
3. Enterprise AI via Azure OpenAI
4. Comprehensive 7-year audit logging
5. Real-time monitoring (Application Insights)
6. Full GDPR and OSHA compliance

**Phase 3 (Q3 2026) - Optional Enhancements:**
- Backend assessment storage (if needed)
- SharePoint integration
- Teams notifications
- Splunk integration
- Mobile app

**Recommendations:**
- Continue monitoring Phase 0 pilot
- Gather user feedback
- Identify any issues or needs
- Plan Phase 2 Azure resources
- Schedule security testing (Q1 2026)

---

## 14. DEPENDENCY & VULNERABILITY MANAGEMENT

### Q27: What open-source libraries do you use, and are they secure?

**Answer:**

**Current Libraries:**
- ✅ JSZip - Active development, no known CVEs
- ✅ DOMPurify 3.1.6 - Security-focused, regularly updated
- ✅ face-api.js - Based on TensorFlow.js (maintained)
- ✅ Tailwind CSS - Active, regularly updated
- ✅ PDFKit - Well-maintained, stable

**Vulnerability Management:**
- Quarterly dependency scans using OWASP Dependency-Check
- Regular npm audit runs
- Automated alerts for new vulnerabilities
- Immediate patching for critical issues

---

## 15. AI & PROMPT SECURITY

### Q28: How do you prevent prompt injection attacks?

**Answer:**
- User input sanitized with DOMPurify before embedding
- User content wrapped in delimiters ("User's Input:" markers)
- Prompt structure explicitly instructs AI to treat user content as data only, not instructions
- AI responses validated against expected JSON schema
- All output sanitized before display

---

### Q29: What happens if the AI generates inappropriate content?

**Answer:**
- All AI responses validated against expected JSON schema
- Text content sanitized before display
- Control hierarchy values validated against whitelist
- Invalid responses trigger error message and user retry
- Audit log captures failed responses

---

## 16. QUICK REFERENCE - CRITICAL ANSWERS

### For IT Leadership Review

| Question | Answer |
|----------|--------|
| **Do you store user data?** | No. Users own all data. We only store audit logs. |
| **Is it encrypted?** | Yes. TLS 1.3 in transit, AES-256 at rest. |
| **Who can access assessments?** | Only authorized users. Admins can view only (audit logs). |
| **How long are logs kept?** | 7 years (OSHA alignment). Then auto-deleted. |
| **Phase 0 authentication?** | None (pilot-only, limited users). |
| **Phase 2 authentication?** | Entra ID SSO with optional MFA. |
| **AI data: safe?** | Enterprise DPA with Azure OpenAI; no training use. |
| **Photos: safe?** | Face blurring in-browser; originals never uploaded. |
| **3rd party access?** | No. Only GOEHS and Azure OpenAI (enterprise). |
| **Compliance ready?** | Yes. GDPR, OSHA, SOC 2 Type II aligned. |

---

## Contact & Escalation

**For Security Questions:**
- IT Security Team Lead
- Application Owner (EHS Department)
- Technical Lead (Development Team)

**For Compliance Questions:**
- Compliance Officer
- IT Security

**For Operational Questions:**
- Technical Lead
- Support Team

---

**Document Classification:** Internal Use Only  
**Last Updated:** January 28, 2026  
**Review Cycle:** Quarterly or before major releases  
**Next Review:** Prior to Phase 2 deployment
