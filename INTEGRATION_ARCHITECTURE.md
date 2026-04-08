# Risk Assessment Buddy Smart 3.0 — Integration Architecture

**Document Version:** 1.0  
**Date:** January 26, 2026  
**Status:** Phase 0 (Pilot) → Phase 2 (Production)  
**Classification:** Internal Use Only

---

## Executive Overview

Risk Assessment Buddy Smart 3.0 is designed as a **connected enterprise application** that integrates with Goodyear's existing corporate IT infrastructure at four critical levels:

1. **Identity & Access** — Corporate directory (Entra ID)
2. **Network & Security** — Azure infrastructure and firewalls
3. **Data Flow** — GOEHS Risk Registry ecosystem
4. **Governance & Deployment** — Azure DevOps and change management

This document explains how the application "plugs into" Goodyear's systems, shares information securely, and maintains compliance with corporate policies.

---

## 1. Identity & Access Integration (Microsoft Entra ID)

### 1.1 Current State (Phase 0)

**Status:** ❌ Not implemented (Pilot phase)

- Application uses URL-based access only
- No user authentication mechanism
- Assessments attributed to "Anonymous Pilot User"
- Access controlled via email distribution of non-public URL
- No integration with corporate identity provider

**Implementation:** Static HTML file served from GitHub Pages; JavaScript runs entirely client-side

### 1.2 Phase 2 Architecture: Entra ID Integration

#### What It Does

When a user attempts to access Risk Assessment Buddy in Phase 2, the application will:

```
User opens application URL
    ↓
Browser redirected to Microsoft Entra ID login page
    ↓
User enters @goodyear.com credentials
    ↓
Entra ID performs credential validation
    ↓
Optional: Multi-Factor Authentication challenge (if configured)
    ↓
Entra ID issues signed JWT token (valid 1 hour)
    ↓
Token returned to application
    ↓
Token stored in sessionStorage (memory-only; not persistent)
    ↓
Application makes API calls with JWT in Authorization header
    ↓
API Gateway validates token signature and expiration
    ↓
App Service processes request with user context
    ↓
Audit event logged with user ID, action, timestamp
```

#### JWT Token Structure

```json
{
  "oid": "550e8400-e29b-41d4-a716-446655440000",
  "preferred_username": "john.doe@goodyear.com",
  "name": "John Doe",
  "email": "john.doe@goodyear.com",
  "appid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "aud": "https://api.riskassessment.goodyear.internal",
  "exp": 1674057600,
  "iat": 1674054000,
  "groups": ["ehs-users", "facility-managers"]
}
```

#### Benefits of Entra ID Integration

| Benefit | Impact | Example |
|---------|--------|---------|
| **Automatic Account Provisioning** | New employees gain access immediately upon hire | Sally joins EHS team → Entra ID syncs → Can log in same day |
| **Automatic Account Revocation** | Departing employees lose access immediately | Bob leaves company → Entra ID deactivates account → Cannot log in |
| **Corporate MFA Enforcement** | Goodyear security policies automatically applied | All users required to use Authenticator app or Windows Hello |
| **Password Policy Compliance** | Passwords meet corporate complexity standards | 16+ characters, special characters, enforced via Entra ID |
| **Session Management** | Automatic timeout after inactivity | User inactive >1 hour → JWT expires → Forced re-login |
| **Audit Trail** | Every login/logout tied to individual user | Security team can trace all access to user identity |
| **Conditional Access** | Location and device policies enforced | Access blocked from non-Goodyear networks or unmanaged devices |
| **License Management** | Application access tracked per user | Finance can audit user count for licensing |

#### Entra ID Conditional Access Policies (Phase 2)

These corporate-level policies automatically apply to Risk Assessment Buddy:

```
Policy 1: Require MFA for all users
  Condition: All users
  Action: Require MFA using Authenticator app or Windows Hello

Policy 2: Block access from unmanaged devices
  Condition: Device not enrolled in Intune MDM
  Action: Block access; show message to contact IT

Policy 3: Restrict access to corporate network
  Condition: User attempts access from outside Goodyear VPN
  Action: Require MFA + IP address whitelisting

Policy 4: Enforce password reset after 90 days
  Condition: Password age > 90 days
  Action: Require password change before access granted

Policy 5: Flag high-risk sign-ins
  Condition: Impossible travel, unusual location, anomalous behavior
  Action: MFA challenge + require admin approval
```

#### Technical Implementation

**Azure AD App Registration:**
```
Application Name: Risk Assessment Buddy Smart
Object ID: [auto-assigned]
Application ID: [auto-assigned]
Supported Account Types: Single tenant (Goodyear only)
Redirect URIs:
  - https://riskassessment.goodyear.internal/auth/callback
  - https://riskassessment-staging.goodyear.internal/auth/callback
Token Endpoint: https://login.microsoftonline.com/[tenant-id]/oauth2/v2.0/token
Authorization Endpoint: https://login.microsoftonline.com/[tenant-id]/oauth2/v2.0/authorize
Scopes Requested:
  - openid (basic identity)
  - profile (user display name)
  - email (user email address)
```

**Token Refresh Flow:**
- Access token valid for 1 hour
- When expires, application uses refresh token to obtain new access token
- User never sees this renewal; happens transparently
- If refresh token expired (24 hours), user must re-authenticate

---

## 2. Network & Security Integration (Azure API Gateway & VPN)

### 2.1 Current State (Phase 0)

**Status:** ⚠️ Partial (GitHub Pages is public; Vercel API is internet-accessible)

- Application served publicly via GitHub Pages
- API calls routed through Vercel serverless infrastructure
- No internal network integration
- No VPN requirement
- Accessible from any internet connection

### 2.2 Phase 2 Architecture: Azure Network Integration

#### What It Does

All inbound and outbound traffic is routed through Goodyear's network security perimeter:

```
User on Corporate Network / VPN
    ↓
Request enters Goodyear network boundary
    ↓
Azure Front Door (DDoS + geo-routing)
    ↓
Azure API Management (rate limiting, WAF rules)
    ↓
Azure API Gateway (authentication verification)
    ↓
Internal Load Balancer (route to App Service instances)
    ↓
App Service processes request
    ↓
Response flows back through same path
    ↓
Azure Front Door returns to user
```

#### API Gateway Security Controls

**Rate Limiting:**
```
Per User:
  - 100 requests per minute (public operations)
  - 20 requests per minute (AI operations)
  - Burst capacity: 200 requests (handled gracefully)

Per IP Address:
  - 10,000 requests per hour
  - Excess requests rejected with 429 Too Many Requests

Rate Limit Headers:
  - X-Rate-Limit-Limit: 100
  - X-Rate-Limit-Remaining: 87
  - X-Rate-Limit-Reset: 1674054060
```

**Web Application Firewall (WAF) Rules:**

| Rule | Purpose | Action |
|------|---------|--------|
| SQL Injection Detection | Blocks `'OR'1'='1`, `; DROP TABLE`, etc. | Log + Block |
| XSS Pattern Matching | Blocks `<script>`, `javascript:`, event handlers | Log + Block |
| Path Traversal | Blocks `../`, `..\`, etc. | Log + Block |
| Protocol Attack | Blocks HTTP Request Smuggling | Log + Block |
| Bot Detection | Blocks automated scrapers, crawlers | Log + Block |
| Geo-blocking | Allows traffic only from Goodyear operating regions | Log + Block from unauthorized regions |
| Certificate Validation | Requires valid TLS certificate | Reject if invalid |

**Corporate VPN Requirement (Phase 2.1):**
- Access restricted to Goodyear corporate network or approved VPN tunnel
- External access blocked unless on VPN
- VPN logs integrated with audit trail
- Location-based access control via Azure Conditional Access

#### Network Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GOODYEAR CORPORATE NETWORK                        │
│                                                                      │
│  ┌─────────────┐                                                    │
│  │ User Device │  (Laptop on corporate LAN or VPN connected)        │
│  └──────┬──────┘                                                    │
│         │ HTTPS/TLS 1.3                                             │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │        Azure Front Door                                  │      │
│  │  (DDoS Protection, SSL Termination, Geo-routing)        │      │
│  └──────────────────┬───────────────────────────────────────┘      │
│                     │                                               │
│         ┌───────────┴──────────┐                                    │
│         │ Azure API Management │                                    │
│         │ (Rate Limit, Logging)│                                    │
│         └──────────┬───────────┘                                    │
│                    │                                                │
│         ┌──────────▼───────────┐                                    │
│         │  API Gateway         │                                    │
│         │  (Auth Validation,   │                                    │
│         │   Request Logging)   │                                    │
│         └──────────┬───────────┘                                    │
│                    │                                                │
│  ┌─────────────────▼──────────────────────────────────────┐        │
│  │         App Service (Multiple Instances)               │        │
│  │  ┌─────────────────────────────────────────────────┐  │        │
│  │  │  Risk Assessment API Instance 1                 │  │        │
│  │  │  (Node.js + Express.js)                        │  │        │
│  │  └─────────────────────────────────────────────────┘  │        │
│  │  ┌─────────────────────────────────────────────────┐  │        │
│  │  │  Risk Assessment API Instance 2                 │  │        │
│  │  │  (Load balanced)                                │  │        │
│  │  └─────────────────────────────────────────────────┘  │        │
│  │  ┌─────────────────────────────────────────────────┐  │        │
│  │  │  Risk Assessment API Instance N                 │  │        │
│  │  │  (Auto-scaling based on load)                  │  │        │
│  │  └─────────────────────────────────────────────────┘  │        │
│  └──────────────────┬───────────────────────────────────┘         │
│                     │                                               │
│         ┌───────────▼──────────────┐                               │
│         │ Azure SQL Database       │                               │
│         │ (Encrypted at rest)      │                               │
│         └────────────────────────┘                                │
│                                                                    │
│         ┌──────────────────────────┐                              │
│         │ Azure Key Vault          │                              │
│         │ (Secrets & Certificates) │                              │
│         └──────────────────────────┘                              │
│                                                                    │
│         ┌──────────────────────────┐                              │
│         │ Azure Table Storage      │                              │
│         │ (Audit Logs)             │                              │
│         └──────────────────────────┘                              │
│                                                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HTTPS/TLS 1.3 (egress only for Azure OpenAI)
         │
    ┌────▼────────────────────┐
    │ Azure OpenAI             │
    │ (Enterprise SLA 99.99%)  │
    └─────────────────────────┘
```

#### Zero Trust Network Principles

Phase 2 implementation follows Microsoft Zero Trust model:

```
Principle 1: Verify Explicitly
  - Every request requires valid JWT token
  - Token signature verified by API Gateway
  - User identity confirmed before each operation

Principle 2: Least Privilege Access
  - Users granted minimum permissions needed for role
  - Admins can only manage assigned facilities
  - Auditors can only view (never modify)

Principle 3: Assume Breach
  - All communications encrypted (TLS 1.3)
  - Encryption at rest (AES-256) for audit logs
  - Rate limiting prevents brute force attacks
  - Anomalous access triggers alerts

Principle 4: Micro-segmentation
  - Each API endpoint requires specific permissions
  - Separate service accounts for different functions
  - Database connections use managed identity (no hardcoded credentials)

Principle 5: Monitor and Log
  - Every API call logged with user ID, action, timestamp
  - Audit logs immutable and retained 7 years
  - Real-time alerts for security events
  - Dashboard for compliance reporting
```

---

## 3. Data Flow Integration (GOEHS / Risk Registry)

### 3.1 Current State (Phase 0)

**Status:** ✅ Partially Implemented

- GOEHS Integration modal available in UI (3 tabs: Assessment, Task, Hazard)
- Users can map assessment data to GOEHS fields
- Export formats: CSV, Excel, Tab-separated
- AI Assist feature suggests GOEHS field values
- All exports go to user device only (no server storage)

**Implementation:** Client-side JavaScript; manual user approval before export

### 3.2 Phase 2 Architecture: GOEHS Integration

#### What It Does

Risk Assessment Buddy becomes the **data entry point** for Goodyear's EHS Risk Registry:

```
User completes assessment in Risk Assessment Buddy
    ↓
User clicks "GOEHS Integration" button
    ↓
Modal opens with Assessment, Task, and Hazard tabs
    ↓
User reviews and validates assessment data
    ↓
User optionally uses AI Assist to fill GOEHS fields
    ↓
User approves export (manual control point)
    ↓
Export format selected (CSV, Excel, or direct API)
    ↓
If API: Direct upload to GOEHS Risk Registry (Phase 2.1)
If File: Download to user's device for manual upload
    ↓
GOEHS Risk Registry receives structured assessment data
    ↓
Data enriches global Goodyear safety database
    ↓
Data available for compliance reporting and analytics
    ↓
Hazard history tracked; trends identified
```

#### GOEHS Data Model Integration

**Assessment Record:**
```
Assessment ID: [auto-generated GUID]
Assessment Date: [user-selected date]
Facility: [mapped from user profile]
Department: [mapped from user profile]
Assessed By: [current user email]
Risk Owner: [selected from dropdown]

Task Assessment (repeatable):
  Task ID: [unique identifier]
  Task Description: [from Risk Assessment Buddy]
  Task Location: [mapped from facility]
  Hazard Groups: [multiple selection from GOEHS taxonomy]
  
Pre-Control Risk Rating:
  Frequency: [1, 1.25, 1.5, 1.75, 2]
  Severity: [1-10]
  Likelihood: [1-10]
  Calculated Risk Score: [Freq × Sev × Likelihood]
  
Control Measures (repeatable):
  Hierarchy Level: [Elimination, Engineering, Administrative, PPE]
  Control Description: [from Risk Assessment Buddy]
  Responsible Party: [selected]
  Target Implementation Date: [date]
  
Post-Control Risk Rating:
  Frequency: [1-2]
  Severity: [1-10]
  Likelihood: [1-10]
  Calculated Risk Score: [after controls]
  
Status: [Draft, Submitted, Approved, Implemented]
```

#### GOEHS Field Validation & Whitelist

**Approved Hazard Groups:**
```
001 - Mechanical/Physical
002 - Chemical
003 - Biological/Infectious
004 - Ergonomic
005 - Psychosocial
006 - Environmental (Temperature, Noise, Radiation)
007 - Work Organization
008 - Traffic/Transportation
```

**Approved Control Hierarchy:**
```
Hierarchy 1 - Elimination (Remove hazard entirely)
Hierarchy 2 - Engineering (Design out hazard)
Hierarchy 3 - Administrative (Procedures, training)
Hierarchy 4 - PPE (Personal protective equipment)
Hierarchy 5 - Monitoring (Ongoing inspection)
```

**Approved Risk Frequency Scale:**
```
1    - Once per year or less
1.25 - Several times per year
1.5  - Monthly
1.75 - Weekly
2    - Daily or more
```

#### Export Format Examples

**CSV Format (Tab-Separated):**
```
Assessment ID	Assessment Date	Task ID	Task Description	Hazard Group	Pre-Frequency	Pre-Severity	Pre-Likelihood	Control Measure	Hierarchy	Post-Frequency	Post-Severity	Post-Likelihood
ASS-2026-001	01-JAN-2026	TASK-001	Operate Forklift	001-Mechanical	1.5	7	5	Daily Equipment Inspection	Hierarchy 2	1	7	3
ASS-2026-001	01-JAN-2026	TASK-001	Operate Forklift	001-Mechanical	1.5	7	5	Operator Certification Required	Hierarchy 3	1	5	2
```

**Excel Format (Structured Workbook):**
```
Sheet 1: Summary
  - Assessment ID, Date, Facility, Department, Assessed By

Sheet 2: Tasks
  - Task ID, Description, Location, Hazard Groups (comma-separated)

Sheet 3: Pre-Control Ratings
  - Task ID, Frequency, Severity, Likelihood, Risk Score

Sheet 4: Controls
  - Control Description, Hierarchy, Responsible Party, Target Date

Sheet 5: Post-Control Ratings
  - Task ID, New Frequency, New Severity, New Likelihood, New Risk Score
```

#### GOEHS API Integration (Phase 2.1)

**Direct Upload API Endpoint:**
```
POST /api/goehs/assessments/import
Authorization: Bearer [JWT Token]
Content-Type: application/json

Request Body:
{
  "assessmentData": {
    "assessmentId": "ASS-2026-001",
    "assessmentDate": "01-JAN-2026",
    "facility": "Facility-123",
    "department": "Manufacturing-Line-A",
    "assessedBy": "john.doe@goodyear.com",
    "tasks": [
      {
        "taskId": "TASK-001",
        "description": "Operate Forklift",
        "hazardGroups": ["001", "004"],
        "preControl": {
          "frequency": 1.5,
          "severity": 7,
          "likelihood": 5
        },
        "controls": [
          {
            "description": "Daily Equipment Inspection",
            "hierarchy": "Hierarchy 2"
          }
        ],
        "postControl": {
          "frequency": 1,
          "severity": 7,
          "likelihood": 3
        }
      }
    ]
  },
  "submissionType": "DRAFT|SUBMITTED|APPROVED"
}

Response:
{
  "status": "SUCCESS",
  "goehs_assessment_id": "GOEHS-2026-00145",
  "message": "Assessment imported successfully",
  "task_count": 1,
  "validation_warnings": []
}
```

#### Real-Time Data Sync (Phase 2.2)

Phase 2.2 enables bidirectional synchronization:

```
Risk Assessment Buddy                    GOEHS Risk Registry
        ↕ (Real-time sync)
        
User updates control measure     →      GOEHS auto-updates
       in Risk Assessment Buddy           database

Control approved in GOEHS        ←      Notification sent
       appears as "Approved" tag  in Risk Assessment Buddy
       in next refresh
```

#### Benefits of GOEHS Integration

| Benefit | Impact | Business Value |
|---------|--------|----------------|
| **No Data Silos** | Assessment data automatically available in Risk Registry | Eliminates manual data entry; reduces errors 95% |
| **Compliance Ready** | All data formatted for regulatory audits | Audit-ready reports generated automatically |
| **Trend Analysis** | GOEHS tracks hazard history across time | Identify recurring hazards; prevent future incidents |
| **Facility Comparison** | Compare risk profiles across Goodyear locations | Share best practices; allocate resources effectively |
| **Global Safety Database** | All assessments contribute to corporate knowledge | Learn from incidents across entire organization |
| **Control Effectiveness** | Track pre-control vs. post-control ratings | Measure effectiveness of implemented controls |
| **Regulatory Reporting** | GOEHS automatically generates compliance reports | Meet OSHA, ISO 45001, local requirements with one click |

---

## 4. Governance & Deployment Integration (Azure DevOps)

### 4.1 Current State (Phase 0)

**Status:** ⚠️ Minimal

- Code stored on GitHub (public repository)
- Deployment to Vercel is automatic on Git push
- No formal change control process
- No automated security scanning
- No formal approval workflow

**Implementation:** GitHub Actions trigger Vercel deployment

### 4.2 Phase 2 Architecture: Azure DevOps Integration

#### What It Does

All code changes go through Goodyear's formal IT governance process:

```
Developer commits code to Git
    ↓
Azure DevOps Git repository receives commit
    ↓
Webhook triggers CI/CD pipeline (GitHub Actions)
    ↓
Step 1: Build
  - Install dependencies (npm install)
  - Compile code (if applicable)
  - Check for syntax errors

    ↓
Step 2: Unit Tests
  - Run test suite
  - Block merge if tests fail

    ↓
Step 3: SAST Security Scan
  - Static Application Security Testing
  - Scan for hardcoded credentials, XSS, SQL injection
  - Block merge if critical vulnerabilities found

    ↓
Step 4: Dependency Audit
  - Check for known CVEs in npm packages
  - Block merge if high-severity vulnerabilities

    ↓
Step 5: Code Review
  - Pull request requires 2+ approvals from designated reviewers
  - IT Security team reviews security changes
  - Architecture review for significant changes

    ↓
Step 6: Approval Gate
  - Stakeholders (EHS, IT Security) approve release
  - Risk assessment completed if major changes

    ↓
Step 7: Build Artifact
  - Docker image built and pushed to Azure Container Registry
  - Image signed with Goodyear certificate
  - Vulnerability scan of container image

    ↓
Step 8: Deployment to Staging
  - Automatically deployed to staging environment
  - Smoke tests run (basic functionality verification)
  - Security tests run (authentication, authorization)
  - Manual QA testing performed

    ↓
Step 9: Approval for Production
  - All stakeholders confirm staging tests passed
  - Change request submitted to CAB (Change Advisory Board)
  - CAB approves or defers to next window

    ↓
Step 10: Production Deployment (Blue-Green)
  - Blue environment (old version) still running
  - Green environment (new version) updated
  - Load balancer gradually shifts traffic to green
  - Automatic rollback if error rate increases

    ↓
Step 11: Post-Deployment Monitoring
  - Application Insights tracks metrics
  - Alerts triggered if error rate > threshold
  - Rollback initiated if critical issue detected

    ↓
Step 12: Audit Logging
  - Deployment recorded in audit log
  - Who deployed, when, what changed
  - Retained for 7 years for compliance
```

#### Azure DevOps Project Structure

```
Risk Assessment Buddy Smart
├── Repositories
│   ├── riskassessment-frontend (HTML/JS/CSS)
│   ├── riskassessment-api (Node.js backend)
│   └── riskassessment-infrastructure (Terraform/ARM templates)
│
├── Build Pipelines
│   ├── Frontend Build (npm, webpack)
│   ├── API Build (npm, Docker)
│   └── Infrastructure Build (Terraform validate)
│
├── Release Pipelines
│   ├── Release to Staging
│   ├── Release to Production
│   └── Hotfix to Production (emergency only)
│
├── Test Plans
│   ├── Functional Test Suite (50+ test cases)
│   ├── Security Test Suite (OWASP Top 10)
│   ├── Performance Test Suite (load testing)
│   └── Compliance Test Suite (GDPR, SOX, ISO 45001)
│
├── Boards
│   ├── Product Backlog (features, enhancements)
│   ├── Sprint Board (current work)
│   ├── Issue Tracking (bugs, support tickets)
│   └── Risk Register (security/operational risks)
│
└── Wiki
    ├── Architecture Documentation
    ├── Deployment Procedures
    ├── Troubleshooting Guide
    └── Security Policies
```

#### Security Gates in CI/CD Pipeline

**SAST (Static Application Security Testing):**
```
Tool: SonarQube (integrated with Azure DevOps)

Scans For:
  - Hardcoded credentials (API keys, passwords)
  - SQL Injection vulnerabilities
  - XSS (Cross-Site Scripting) vulnerabilities
  - Insecure deserialization
  - Weak cryptography
  - Missing input validation
  - Unencrypted sensitive data transmission

Severity Levels:
  🔴 CRITICAL → Block merge immediately; page on-call security
  🟠 HIGH    → Block merge; require security team approval
  🟡 MEDIUM  → Warn; allow merge with tech lead approval
  🟢 LOW     → Track in metrics; no merge block

Example Block:
  SonarQube: CRITICAL - Hardcoded API key detected in line 1830
  
  const API_ENDPOINT = 'https://risk-assessment-api-nine.vercel.app/api/ai';
  const API_KEY = 'sk-1234567890abcdefghij'; // ← EXPOSED!
  
  ❌ Merge blocked. Remove API key and use environment variable.
```

**Dependency Audit:**
```
Tool: npm audit + GitHub Dependabot

Check:
  - All npm packages scanned against CVE database
  - License compliance (GPL, proprietary, etc.)
  - Package age and maintenance status

Example Finding:
  Package: express-session (version 1.17.0)
  CVE: CVE-2021-41197 - Authentication bypass in express-session
  Severity: HIGH
  Fix: Update to 1.17.3 or later
  
  ❌ Merge blocked. Update dependency and re-run tests.
```

**Code Review Process:**

```
Pull Request Created
    ↓
Automated checks run (lint, build, tests)
    ↓
Code Review Assigned To:
  - 2 developers from core team
  - 1 security reviewer (for security changes)
  - 1 ops reviewer (for infrastructure changes)

Reviewers Check For:
  ✓ Code follows standards and best practices
  ✓ No security vulnerabilities introduced
  ✓ Tests cover new functionality (>80% coverage)
  ✓ Documentation updated
  ✓ Performance impact acceptable
  ✓ Backwards compatibility maintained
  ✓ No breaking changes to API

Approval Rules:
  ✓ All automated checks must pass
  ✓ Minimum 2 approvals required
  ✓ If security changes: IT Security approval required
  ✓ If infrastructure changes: Ops approval required
  ✓ Can request additional reviewers if needed

Timeline:
  - Target: PR reviewed within 24 business hours
  - Urgent: 4-hour SLA for critical patches
  - High-risk: 48-hour review window for major refactors
```

#### Environment Configuration Management

**Configuration by Environment:**

```
Development (Developer Laptops)
├── API Endpoint: http://localhost:3000
├── Database: Local SQLite
├── Authentication: Disabled (for testing)
├── Logging Level: DEBUG (verbose)
├── AI Service: OpenRouter (free tier for testing)
└── Secrets: Stored in .env.local (never committed to Git)

Staging (Azure Dev Environment)
├── API Endpoint: https://riskassessment-staging.goodyear.internal
├── Database: Azure SQL (test data only)
├── Authentication: Entra ID (staging tenant)
├── Logging Level: INFO
├── AI Service: Azure OpenAI (non-prod instance)
├── Secrets: Azure Key Vault (staging)
├── SSL Certificate: Self-signed for testing
└── Access: Goodyear staff only; read-only data

Production (Azure Prod Environment)
├── API Endpoint: https://riskassessment.goodyear.internal
├── Database: Azure SQL (HA/DR configured; encrypted)
├── Authentication: Entra ID (production tenant)
├── Logging Level: WARNING (only errors and critical events)
├── AI Service: Azure OpenAI (production instance with SLA)
├── Secrets: Azure Key Vault (production; rotated quarterly)
├── SSL Certificate: Goodyear CA-signed; renewed annually
├── Access: Authorized Goodyear staff only; audit logged
└── Backup: Automated daily; geo-redundant; 30-day retention
```

**Secrets Management Process:**

```
Phase 0 (Current):
  - API keys stored in Vercel environment variables
  - No encryption
  - Risk: Anyone with Vercel access can view keys

Phase 2 (Target):
  - All secrets stored in Azure Key Vault
  - Encrypted at rest (AES-256)
  - Accessed via managed identity (no hardcoded credentials)
  - Automatic rotation every 90 days
  - Audit log of every access
  - Segregation: Staging secrets ≠ Production secrets

Key Rotation Process:
  Day 1-89:   Current key used for all operations
  Day 90:     New key generated
  Day 90-179: Both keys accepted (grace period)
  Day 179:    Old key revoked; only new key accepted
  Monitoring: Any use of revoked key triggers alert
```

#### Rollback & Disaster Recovery

**Blue-Green Deployment Strategy:**

```
Current State (Blue Environment):
  - Version 1.0 deployed and running
  - Handling all production traffic
  - Database: Version A schema

New Release Ready (Green Environment):
  - Version 1.1 deployed in parallel
  - Database: Version A schema (same; upgraded in-place)
  - NOT receiving traffic yet
  - Smoke tests run to verify deployment

Smoke Tests Passed:
  - Load balancer configured to send X% traffic to green
  - Monitor error rates, latency, exceptions
  - If green error rate < 1%: Proceed to next step
  - If green error rate > 1%: Rollback immediately

Gradual Traffic Shift:
  - 1% traffic to green (99% stays on blue)
  - Monitor for 5 minutes
  - 10% traffic to green (90% stays on blue)
  - 25% traffic to green
  - 50% traffic to green (canary deployment complete)
  - 100% traffic to green

Cutover Complete:
  - Blue still running but not receiving traffic
  - Kept alive for 24 hours for instant rollback
  - If critical issue detected: Shift 100% traffic back to blue
  - After 24 hours: Blue terminated

Rollback Procedure (if needed):
  - 1-Click rollback from Azure DevOps
  - Traffic instantly shifted back to blue
  - Incident investigation begins
  - Root cause identified and fixed
  - Re-deploy after fix verified in staging
```

**Disaster Recovery Scenarios:**

| Scenario | Response | RTO | RPO |
|----------|----------|-----|-----|
| Application crash | Restart app service; auto-scaling handles load | 5 min | 0 min |
| Database corruption | Restore from hourly backup | 30 min | 1 hour |
| Entire region down | Failover to secondary region (geo-redundant) | 5-10 min | 5 min |
| Data center fire | Restore from geo-redundant backup | 1 hour | 5 min |
| Ransomware attack | Restore from immutable backup (offline) | 2 hours | 24 hours |

---

## 5. Integration Timeline & Milestones

### Phase 0 (Current - Jan 2026)

**Status:** ✅ Active Pilot

- [x] GOEHS Integration modal implemented (client-side only)
- [x] Excel import with RA2025 template support
- [x] Multi-language auto-detection (EN/FR/DE/TR/ES)
- [x] Smart value matching for risk ratings
- [x] PDF/Excel export functionality
- [ ] Entra ID integration (planned for Phase 2)
- [ ] Network security integration (planned for Phase 2)
- [ ] Azure DevOps integration (planned for Phase 2)

**Deliverables by End of Phase 0:**
- Fully functional pilot with GOEHS export capability
- Comprehensive testing with 5-10 pilot users
- Security review completed
- Architecture documentation finalized
- Risk assessment completed

### Phase 1 (Q1 2026)

**Status:** 📅 Planned

- [ ] Azure subscriptions provisioned
- [ ] Entra ID application registration created
- [ ] API Gateway and authentication layer developed
- [ ] Azure Key Vault configured with API keys
- [ ] Staging environment established
- [ ] Initial CI/CD pipeline setup
- [ ] Enhanced logging (localStorage → Azure Table Storage)
- [ ] Dependency audit automation

**Milestones:**
- Week 1-2: Infrastructure provisioned
- Week 3-4: Entra ID integration development
- Week 5-6: API Gateway development
- Week 7-8: Staging environment testing
- Week 9-12: CI/CD pipeline testing and refinement

**Deliverables by End of Phase 1:**
- Staging environment fully operational
- Entra ID login working in staging
- API Gateway rate limiting tested
- CI/CD pipeline tested with non-production code
- Security pen testing completed (staging)

### Phase 2 (Q2 2026)

**Status:** 📅 Production Ready

**2A - Core Production Deployment (Mid-Q2):**
- [ ] Production environment deployed on Azure App Service
- [ ] Entra ID authentication enforced
- [ ] Azure API Gateway live with all security policies
- [ ] Audit logging to Azure Table Storage enabled
- [ ] Blue-green deployment strategy tested
- [ ] Load testing completed (1000+ concurrent users)

**2B - GOEHS API Integration (End of Q2):**
- [ ] Direct GOEHS API integration (POST /api/goehs/assessments)
- [ ] Batch import capability (multiple assessments)
- [ ] Real-time validation against GOEHS taxonomy
- [ ] Error handling and retry logic
- [ ] GOEHS webhook notifications (when assessment approved)

**Milestones:**
- Week 1: Final security review
- Week 2: Go/No-Go decision meeting
- Week 3: Production cutover (blue-green deployment)
- Week 4: Monitoring and stabilization
- Week 5-8: GOEHS API development and testing
- Week 9-12: Full production support and optimization

**Deliverables by End of Phase 2:**
- Full production deployment operational
- 99.9% uptime SLA maintained
- All integrations live and tested
- Compliance audit completed
- User training delivered
- Support documentation completed

### Phase 3 (Q3 2026)

**Status:** 📅 Future Enhancement

- [ ] SharePoint integration (document storage)
- [ ] Microsoft Teams notifications (assessment updates)
- [ ] Mobile application (iOS/Android)
- [ ] Real-time data sync with GOEHS
- [ ] Advanced analytics dashboard
- [ ] Machine learning for hazard classification

---

## 6. Integration Security Checklist

### Entra ID Integration Security

- [ ] OAuth 2.0 / OIDC implementation reviewed by IT Security
- [ ] Token validation implemented on every API call
- [ ] Session timeout configured (1 hour inactivity)
- [ ] MFA enforcement confirmed with Entra ID team
- [ ] Conditional Access policies tested
- [ ] Logout/token revocation tested
- [ ] Account deactivation tested (simulate employee departure)
- [ ] Sign-in risk assessment configured
- [ ] Admin consent required for API scopes
- [ ] Audit logs exported and analyzed

### Network Security Integration

- [ ] API Gateway WAF rules deployed and tested
- [ ] Rate limiting tested under load
- [ ] DDoS protection activated (Azure Front Door)
- [ ] VPN access tested from external network
- [ ] Geo-blocking policies configured
- [ ] TLS 1.3 required; older TLS versions blocked
- [ ] Certificate rotation process documented
- [ ] Network monitoring dashboard configured
- [ ] Firewall rules audited by IT Network team
- [ ] Zero Trust principles validated

### GOEHS Integration Security

- [ ] GOEHS API credentials stored in Key Vault (not in code)
- [ ] GOEHS API endpoint uses TLS 1.3
- [ ] GOEHS data validation whitelists configured
- [ ] GOEHS API error messages sanitized (no SQL exposed)
- [ ] Data transformation validated (no loss of information)
- [ ] Audit trail of GOEHS exports maintained
- [ ] GOEHS data access logged (who exported what, when)
- [ ] Export file encryption (for exports to user devices)
- [ ] GOEHS API pagination tested (large data sets)
- [ ] Error recovery procedures documented (GOEHS API timeout, failure)

### Azure DevOps Integration Security

- [ ] Azure DevOps project configured with least-privilege access
- [ ] Build service identity has minimal required permissions
- [ ] Artifact signing implemented
- [ ] Container image vulnerability scanning enabled
- [ ] SAST tool configured (SonarQube) with security gates
- [ ] Dependency audit automated (npm audit + Dependabot)
- [ ] Code review workflow enforced
- [ ] Secrets never logged in build artifacts
- [ ] Build logs retained and secured (7-year retention)
- [ ] Deployment approvals require human review

### Cross-Integration Testing

- [ ] End-to-end test: Login (Entra ID) → Create assessment → Export to GOEHS
- [ ] Failover test: Primary region down → Secondary region activates
- [ ] Rate limiting test: Burst of requests rejected gracefully
- [ ] Token expiration test: Expired token refresh works automatically
- [ ] Security scanning test: Malicious input rejected by WAF
- [ ] Audit logging test: All actions appear in compliance logs
- [ ] Performance test: API response time <200ms (P95)
- [ ] Compliance test: Data encrypted at rest and in transit
- [ ] Data retention test: Audit logs retained 7 years
- [ ] Disaster recovery test: Restore from backup successful

---

## 7. Contact & Escalation

### Integration Ownership

| Component | Owner | Contact | On-Call |
|-----------|-------|---------|---------|
| **Entra ID Integration** | IT Identity & Access | identity-team@goodyear.com | +1-330-xxx-xxxx |
| **Azure Infrastructure** | IT Cloud Operations | cloud-ops@goodyear.com | +1-330-xxx-xxxx |
| **Network Security** | IT Security | security-team@goodyear.com | +1-330-xxx-xxxx |
| **GOEHS Integration** | EHS Systems | ehs-systems@goodyear.com | +1-330-xxx-xxxx |
| **CI/CD Pipelines** | IT Development | devops-team@goodyear.com | +1-330-xxx-xxxx |

### Escalation Procedure

**Severity 1 (Critical - System Down):**
- Immediate page: On-call engineer + manager
- Target response: 15 minutes
- Target resolution: 1 hour
- Escalate to: VP IT Operations

**Severity 2 (High - Degraded Performance):**
- Page: Primary engineer + team lead
- Target response: 1 hour
- Target resolution: 4 hours
- Escalate to: Director of IT Operations

**Severity 3 (Medium - Partial Functionality):**
- Email: Engineer on-duty
- Target response: 4 hours
- Target resolution: 1 business day
- Escalate to: Team lead (if SLA breached)

**Severity 4 (Low - Enhancement / Question):**
- Ticket: Standard support queue
- Target response: 2 business days
- Target resolution: 5 business days
- No automatic escalation

---

## 8. Compliance & Audit

### Regulatory Alignment

**GDPR Compliance:**
- ✅ Data minimization: Only necessary data collected
- ✅ User consent: Users opt-in to GOEHS export
- ✅ Data portability: Users can export all data
- ✅ Right to erasure: Users delete local data; server audit logs separate
- ✅ Audit trail: All actions logged with user identity

**HIPAA (if US-based operations):**
- ✅ Encryption in transit (TLS 1.3)
- ✅ Encryption at rest (AES-256)
- ✅ Access controls (Entra ID + RBAC)
- ✅ Audit logging (7-year retention)
- ✅ Business Associate Agreements (if applicable)

**SOX (Sarbanes-Oxley) - If audited:**
- ✅ Change management (Azure DevOps controlled)
- ✅ Segregation of duties (RBAC roles)
- ✅ Audit trail immutable (append-only Table Storage)
- ✅ Access reviews quarterly
- ✅ IT general controls documented

**ISO 45001 (Occupational Health & Safety):**
- ✅ Risk assessment documented (this application)
- ✅ Controls recorded (GOEHS integration)
- ✅ Effectiveness measured (pre/post ratings)
- ✅ Management review supported (reporting)

### Annual Audit Checklist

**Compliance Audit (Q1 Each Year):**
- [ ] All integration points documented and tested
- [ ] Security controls validated (penetration test results)
- [ ] Audit logs reviewed for anomalies
- [ ] Data retention policy compliance verified
- [ ] User access reviews completed
- [ ] Change management process assessed
- [ ] Disaster recovery drills completed successfully
- [ ] Third-party vendor agreements reviewed

---

**Document Classification:** Internal Use Only  
**Last Updated:** January 26, 2026  
**Next Review:** Before Phase 2 deployment (Q2 2026)  
**Approval:** [To be signed by IT Security, CIO, EHS Director]
