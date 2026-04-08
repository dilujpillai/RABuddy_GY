# Risk Assessment Buddy – Azure Integration Proposal

**Prepared for:** Goodyear IT Meeting  
**Date:** February 12, 2026  
**Application:** Risk Assessment Buddy Smart 3.0  
**Author:** EHS Digital Team  

---

## Table of Contents

1. [What the App Does Today](#1-what-the-app-does-today)
2. [Why Azure Over AWS](#2-why-azure-over-aws)
3. [Phase 1 – Host & Authenticate (SSO)](#3-phase-1--host--authenticate-sso)
4. [Phase 2 – SharePoint Integration (Save & Load Projects)](#4-phase-2--sharepoint-integration-save--load-projects)
5. [Phase 3 – Actions Registry & Outlook Integration](#5-phase-3--actions-registry--outlook-integration)
6. [Architecture Diagram](#6-architecture-diagram)
7. [What We Need from IT](#7-what-we-need-from-it)
8. [Cost Estimate](#8-cost-estimate)
9. [Timeline](#9-timeline)
10. [Security & Compliance](#10-security--compliance)
11. [FAQ for IT](#11-faq-for-it)

---

## 1. What the App Does Today

**Risk Assessment Buddy** is a single-page web application (HTML + JavaScript) that helps EHS teams across Goodyear plants to:

- **Create risk assessments** by describing work processes in free text or uploading Excel templates
- **Use AI** to automatically break down tasks, identify hazards, classify risk categories, and suggest countermeasures
- **Generate structured outputs** in CSV format compatible with our GOEHS vendor system
- **Support multiple languages** (English, French, German) for global plant teams

### Current State

| Feature | Status |
|---------|--------|
| Risk assessment creation | ✅ Working |
| AI-powered hazard identification | ✅ Working |
| GOEHS CSV/Excel export | ✅ Working |
| Multi-language support (EN/FR/DE) | ✅ Working |
| User authentication | ❌ None |
| Data persistence | ❌ Browser only (localStorage) |
| Multi-user collaboration | ❌ Not available |
| Action tracking | ❌ Not available |

### The Problem

- **No authentication** – Anyone with the URL can access the app
- **No data persistence** – Risk assessments are lost when the browser closes
- **No collaboration** – Users can't share or jointly edit assessments
- **No action tracking** – Corrective actions from hazards aren't tracked to completion
- **No audit trail** – No record of who created/modified assessments

---

## 2. Why Azure Over AWS

### The Core Argument

> Goodyear already uses Microsoft 365 (Outlook, Teams, SharePoint, Azure AD).  
> Hosting in Azure means **zero extra integration layers** — everything connects natively.

### Side-by-Side Comparison

| Capability | Azure | AWS |
|------------|-------|-----|
| **SSO with Goodyear credentials** | ✅ Native (Azure AD) | ⚠️ Requires custom SAML/OIDC bridge |
| **SharePoint data storage** | ✅ Direct via Microsoft Graph API | ⚠️ Requires middleware + API calls |
| **Teams notifications** | ✅ Built-in webhooks | ⚠️ Custom integration needed |
| **Outlook email/calendar** | ✅ Native via Microsoft Graph | ⚠️ Separate connector required |
| **Power Automate workflows** | ✅ Built-in | ❌ Not available |
| **Existing Goodyear licenses** | ✅ Likely included in M365 E3/E5 | 💰 Additional licensing cost |
| **IT team familiarity** | ✅ Already managing Azure AD/M365 | ❓ May need new skills |
| **Compliance (GDPR, SOC 2)** | ✅ Inherited from M365 tenant | ✅ Available but separate setup |
| **Estimated monthly cost** | ~$50–150 | ~$80–200+ |

### Key Takeaway

With **Azure**, we plug directly into Goodyear's existing infrastructure.  
With **AWS**, we need to build bridges to every Microsoft service we already use.

---

## 3. Phase 1 – Host & Authenticate (SSO)

> **Goal:** Host the app in Azure, add single sign-on so only Goodyear employees can access it.  
> **Effort:** 1–2 weeks  
> **Dependencies:** Azure AD App Registration, Azure App Service

### What Changes

```
BEFORE:  User opens app → No login → Anyone can access
AFTER:   User opens app → Azure AD login → Only Goodyear employees can access
```

### Technical Steps for IT

#### Step 1: Create Azure App Service

```
Azure Portal → Create Resource → Web App
├── Resource Group       : rg-goodyear-ehs
├── Name                 : risk-assessment-buddy
├── Runtime Stack        : Node.js 18 LTS (or Static Web App)
├── Region               : West Europe (or closest Goodyear data center)
├── Pricing Tier         : B1 Basic ($13/month) or S1 Standard ($73/month)
└── Enable HTTPS         : Yes (mandatory)
```

#### Step 2: Register App in Azure AD

```
Azure Portal → Azure Active Directory → App Registrations → New Registration
├── Name                 : Risk Assessment Buddy
├── Supported accounts   : Single tenant (Goodyear only)
├── Redirect URI         : https://risk-assessment-buddy.azurewebsites.net
└── Platform             : Single-page application (SPA)
```

**API Permissions to grant:**

| Permission | Type | Purpose |
|------------|------|---------|
| `User.Read` | Delegated | Read user profile (name, email) |
| `Sites.ReadWrite.All` | Delegated | Read/write to SharePoint (Phase 2) |
| `Files.ReadWrite.All` | Delegated | Upload/download files in SharePoint (Phase 2) |
| `Mail.Send` | Delegated | Send Outlook emails (Phase 3) |
| `Group.Read.All` | Delegated | Read team member groups (Phase 3) |

> **Note:** Start with `User.Read` only for Phase 1. Add more permissions in later phases.

#### Step 3: Add Authentication to the App

We'll use **MSAL.js** (Microsoft Authentication Library) — Microsoft's official client-side auth library.

**What the app does on load:**

```
1. User navigates to https://risk-assessment-buddy.azurewebsites.net
2. MSAL checks: Is user already logged into Microsoft 365?
   ├── YES → App loads immediately (silent SSO, no popup)
   └── NO  → Redirect to Microsoft login page
3. User sees their name/email in the app header
4. Azure AD token is stored in browser session (not localStorage)
5. Token is used for all subsequent API calls
```

**Code the app will use (already built into our app):**

```javascript
// MSAL Configuration (values from Azure AD App Registration)
const msalConfig = {
    auth: {
        clientId: 'YOUR_CLIENT_ID',                              // From Step 2
        authority: 'https://login.microsoftonline.com/TENANT_ID', // Goodyear tenant
        redirectUri: 'https://risk-assessment-buddy.azurewebsites.net'
    },
    cache: {
        cacheLocation: 'sessionStorage'  // Secure: clears on browser close
    }
};
```

**What IT needs to provide:**

| Value | Where to Find It |
|-------|-------------------|
| `Tenant ID` | Azure Portal → Azure AD → Overview |
| `Client ID` | Azure Portal → App Registrations → Your App → Overview |
| `Redirect URI` | The App Service URL (e.g., `https://risk-assessment-buddy.azurewebsites.net`) |

#### Step 4: Deploy the App

**Option A: GitHub Integration (Recommended)**
```
Azure App Service → Deployment Center → GitHub
├── Repository   : goodyear/risk-assessment-buddy
├── Branch       : main
└── Auto-deploy  : Yes (on every push to main)
```

**Option B: Manual ZIP Deploy**
```
1. Zip the app files (Index.HTML, server.js, lib/, models/, etc.)
2. Azure Portal → App Service → Advanced Tools (Kudu)
3. Drag and drop ZIP file
4. App is live in 30 seconds
```

#### Phase 1 Outcome

| Feature | Status |
|---------|--------|
| App hosted on Azure | ✅ |
| HTTPS enforced | ✅ |
| SSO with Goodyear credentials | ✅ |
| User's name/email displayed in app | ✅ |
| Only Goodyear employees can access | ✅ |
| No passwords to manage | ✅ |

---

## 4. Phase 2 – SharePoint Integration (Save & Load Projects)

> **Goal:** Users can save complete risk assessments to SharePoint and load them later for editing.  
> **Effort:** 2–3 weeks  
> **Dependencies:** Phase 1 complete, SharePoint site created

### What Changes

```
BEFORE:  User creates assessment → Data lives in browser only → Lost on close
AFTER:   User creates assessment → Saves to SharePoint → Loads anytime, anywhere
```

### User Workflow

```
Step 1: User completes risk assessment in the app
Step 2: Clicks "💾 Save to SharePoint"
Step 3: App saves project as JSON file to SharePoint document library
Step 4: Shareable link is generated and copied to clipboard
Step 5: Link can be sent via email/Teams to colleagues

--- Later ---

Step 6: User (or colleague) clicks the link
Step 7: App opens and loads the project from SharePoint
Step 8: User continues editing, adds more details
Step 9: Clicks "💾 Save" again → Updates the file in SharePoint
```

### SharePoint Structure

```
SharePoint Site: /sites/EHS-RiskAssessment
│
├── Risk Assessments/                          ← Document Library
│   ├── Plant-Fulda/                           ← Folder per plant
│   │   ├── PROJ-FUL-20260212-001.json         ← Project file
│   │   ├── PROJ-FUL-20260215-002.json
│   │   └── PROJ-FUL-20260220-003.json
│   │
│   ├── Plant-Amiens/
│   │   ├── PROJ-AMI-20260213-001.json
│   │   └── PROJ-AMI-20260218-002.json
│   │
│   ├── Plant-Adapazari/
│   │   └── PROJ-ADA-20260214-001.json
│   │
│   └── Templates/                             ← Shared templates
│       └── default-template.json
│
└── Assessment Index/                          ← SharePoint List (metadata)
    ├── Title: "Q1 2026 Tire Building"  |  Plant: Fulda  |  Status: Draft
    ├── Title: "Mixing Area Review"     |  Plant: Amiens |  Status: Approved
    └── Title: "Warehouse Safety"       |  Plant: Adapazari | Status: In Review
```

### What's Stored in Each Project JSON File

```json
{
    "id": "PROJ-FUL-20260212-001",
    "version": "2.0",
    "createdDate": "2026-02-12T10:30:00Z",
    "lastModifiedDate": "2026-02-12T14:45:00Z",
    "createdBy": "john.smith@goodyear.com",
    "lastModifiedBy": "john.smith@goodyear.com",
    "status": "Draft",

    "assessment": {
        "title": "Q1 2026 Tire Building Risk Assessment",
        "organization": "Mfg - EMEA",
        "location": "Fulda",
        "department": "Tire Building",
        "workstation": "Line 3",
        "assessmentDate": "2026-02-12",
        "type": "Safety",
        "approver": "Plant Manager"
    },

    "tasks": [
        {
            "taskName": "Material Loading",
            "taskDescription": "Loading rubber compounds onto conveyor",
            "conditionMode": "Routine",
            "coreActivity": "Material Handling",
            "jobTitle": "Operator"
        }
    ],

    "hazards": [
        {
            "taskName": "Material Loading",
            "hazardCategory": "Ergonomic Hazards",
            "subHazard": "Manual handling of heavy loads",
            "outcome": "Back strain/injury",
            "description": "Lifting 25kg rubber bales repeatedly",
            "initFreq": "2", "initSev": "7", "initLike": "5",
            "initScore": "70.00", "initRating": "High",
            "counterDesc": "Use mechanical lifting aid",
            "counterLadder": "Level 4 - Engineering Controls",
            "resFreq": "1.5", "resSev": "5", "resLike": "3",
            "resScore": "22.50", "resRating": "Medium"
        }
    ],

    "actions": []
}
```

### Technical Steps for IT

#### Step 1: Create SharePoint Site

```
SharePoint Admin Center → Create Site
├── Site Name        : EHS-RiskAssessment
├── URL              : https://goodyear.sharepoint.com/sites/EHS-RiskAssessment
├── Template         : Team Site (connected to M365 Group)
├── Privacy          : Private
└── Owner            : EHS Admin Group
```

#### Step 2: Create Document Library

```
Site Settings → Site Contents → New → Document Library
├── Name             : Risk Assessments
├── Versioning       : Major versions enabled (for audit trail)
├── Require Checkout  : No (allow concurrent access)
└── Default View     : All Documents
```

#### Step 3: Create Assessment Index List (Optional but Recommended)

```
Site Contents → New → List
├── Name             : Assessment Index
├── Columns:
│   ├── Title           (Single line text)  ← Assessment title
│   ├── Organization    (Choice)            ← Mfg - EMEA, Mfg - Americas, etc.
│   ├── Plant           (Choice)            ← Fulda, Amiens, etc.
│   ├── Status          (Choice)            ← Draft, In Review, Approved, Closed
│   ├── CreatedBy       (Person)            ← Who created it
│   ├── AssessmentDate  (Date)              ← When assessed
│   ├── ProjectId       (Single line text)  ← Links to JSON file
│   ├── HazardCount     (Number)            ← How many hazards
│   └── HighestRisk     (Choice)            ← Critical, High, Medium, Low
```

> **Why a List?** So users can search/filter assessments in SharePoint without opening the app.  
> The Document Library stores the full project data; the List provides a searchable index.

#### Step 4: Set Folder Permissions

```
Risk Assessments (Document Library)
├── Plant-Fulda/     → Fulda EHS Team (Edit), All EHS (Read)
├── Plant-Amiens/    → Amiens EHS Team (Edit), All EHS (Read)
└── Plant-Adapazari/ → Adapazari EHS Team (Edit), All EHS (Read)
```

> **Tip:** Use Azure AD Security Groups for each plant team.  
> Example: `SG-EHS-Fulda`, `SG-EHS-Amiens`, etc.

### How the App Connects (Microsoft Graph API)

All SharePoint operations go through **Microsoft Graph API** — the unified API for all Microsoft 365 services.

```
App (browser)
  ↓ MSAL token (from Phase 1 SSO)
  ↓
Microsoft Graph API (https://graph.microsoft.com/v1.0)
  ├── GET  /sites/{siteId}/drive/root:/Plant-Fulda:/children     → List files
  ├── PUT  /sites/{siteId}/drive/root:/Plant-Fulda/file.json:/content → Save file
  ├── GET  /drives/{driveId}/items/{fileId}/content               → Load file
  └── POST /sites/{siteId}/lists/AssessmentIndex/items            → Update index
```

> **No extra server needed!** The app calls Microsoft Graph directly from the browser using the user's Azure AD token.

### Deep Linking (Shareable URLs)

When a user saves a project, the app generates a link:

```
https://risk-assessment-buddy.azurewebsites.net?projectId=PROJ-FUL-20260212-001&org=Mfg-EMEA&location=Fulda
```

When someone clicks this link:
1. App opens
2. Authenticates via SSO (automatic)
3. Fetches project JSON from SharePoint
4. Displays the full assessment for viewing/editing

#### Phase 2 Outcome

| Feature | Status |
|---------|--------|
| Save projects to SharePoint | ✅ |
| Load projects from SharePoint | ✅ |
| Version history (SharePoint built-in) | ✅ |
| Per-plant folder structure | ✅ |
| Searchable assessment index | ✅ |
| Shareable deep links | ✅ |
| Cross-plant visibility (read-only) | ✅ |

---

## 5. Phase 3 – Actions Registry & Outlook Integration

> **Goal:** Create corrective actions from hazards, assign to team members, track completion, send Outlook notifications.  
> **Effort:** 3–4 weeks  
> **Dependencies:** Phase 2 complete

### What Changes

```
BEFORE:  Hazard identified → Countermeasure noted on paper → No follow-up
AFTER:   Hazard identified → Action created → Assigned to owner → Email sent →
         Owner completes action → Status updated → Audit trail maintained
```

### User Workflow

```
Step 1: User completes risk assessment (hazards identified)
Step 2: Clicks "🎯 Generate Actions" → App creates an action for each hazard
Step 3: User assigns each action to a team member (loaded from Azure AD group)
Step 4: Sets priority (auto-calculated from risk rating) and due date
Step 5: Clicks "📧 Notify Assigned Users"
Step 6: Outlook email sent to each assignee with action details + link to app
Step 7: Assignee opens link → Reviews action → Marks as complete
Step 8: Dashboard shows all actions: Open, In Progress, Completed, Overdue
```

### Actions Data Model

```json
{
    "id": "ACT-FUL-20260212-001",
    "projectId": "PROJ-FUL-20260212-001",
    "hazardId": "hazard-3",
    
    "description": "Install mechanical lifting aid for rubber bale handling",
    "hazardCategory": "Ergonomic Hazards",
    "subHazard": "Manual handling of heavy loads",
    "currentControl": "Manual lifting",
    "proposedControl": "Mechanical lift assist device",
    "countermeasureLadder": "Level 4 - Engineering Controls",
    
    "priority": "High",
    "status": "Open",
    "dueDate": "2026-02-26",
    
    "assignedTo": "john.smith@goodyear.com",
    "assignedDate": "2026-02-12T14:30:00Z",
    "completionDate": null,
    
    "createdBy": "marie.dupont@goodyear.com",
    "createdDate": "2026-02-12T14:00:00Z",
    
    "notes": "Budget approved. Vendor quote received.",
    "attachments": []
}
```

### SharePoint Actions List

```
Site Contents → New → List
├── Name             : Actions Registry
├── Columns:
│   ├── Title           (Single line text)   ← Action ID
│   ├── Description     (Multi-line text)    ← What needs to be done
│   ├── AssessmentTitle  (Single line text)   ← Which assessment
│   ├── Plant           (Choice)             ← Which plant
│   ├── HazardCategory  (Choice)             ← Type of hazard
│   ├── Priority        (Choice)             ← Critical, High, Medium, Low
│   ├── Status          (Choice)             ← Open, In Progress, Completed, Overdue
│   ├── AssignedTo      (Person)             ← Action owner
│   ├── DueDate         (Date)               ← Target completion
│   ├── CompletionDate  (Date)               ← Actual completion
│   ├── CreatedBy       (Person)             ← Who created the action
│   ├── CountermeasureLadder (Choice)        ← Level 1–6
│   └── Notes           (Multi-line text)    ← Comments/updates
```

### Loading Team Members from Azure AD

Instead of hardcoding team members, the app loads them from an **Azure AD Security Group**:

```
Azure AD → Groups → New Security Group
├── Name        : SG-EHS-ActionOwners
├── Members     : All EHS team members across plants
└── Description : Team members who can be assigned actions
```

**The app queries this group on-demand:**

```
GET https://graph.microsoft.com/v1.0/groups/{groupId}/members
→ Returns: [{ name: "John Smith", email: "john.smith@goodyear.com", jobTitle: "EHS Manager" }, ...]
```

> **Benefit:** When someone joins/leaves a team, IT updates the Azure AD group — the app automatically reflects the change.

### Outlook Email Notifications

When actions are assigned, the app sends an Outlook email via Microsoft Graph:

```
POST https://graph.microsoft.com/v1.0/me/sendMail
```

**Email content (auto-generated):**

```
Subject: 🎯 Action Assigned: Install mechanical lifting aid

Hi John,

You have been assigned a new action from the Risk Assessment:
"Q1 2026 Tire Building Risk Assessment" (Fulda)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Action:      Install mechanical lifting aid for rubber bale handling
Hazard:      Ergonomic Hazards → Manual handling of heavy loads
Priority:    🔴 High
Due Date:    February 26, 2026
Assigned By: Marie Dupont
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 View in App: https://risk-assessment-buddy.azurewebsites.net?projectId=PROJ-FUL-20260212-001&tab=actions

Please review and update the action status when completed.

Best regards,
Risk Assessment Buddy
```

### Future: Power Automate Workflows

Once Phase 3 is live, we can add automated workflows:

```
Trigger: Action due date is tomorrow AND status is still "Open"
Action:  Send reminder email to assignee + escalate to manager
```

```
Trigger: Action marked as "Completed"
Action:  Notify assessment creator + update SharePoint list + log completion
```

```
Trigger: New action created with "Critical" priority
Action:  Immediately notify plant manager + EHS director
```

> **Power Automate is included in Microsoft 365 licenses** — no additional cost.

#### Phase 3 Outcome

| Feature | Status |
|---------|--------|
| Generate actions from hazards | ✅ |
| Assign to team members (from Azure AD) | ✅ |
| Auto-set priority from risk rating | ✅ |
| Auto-set due date from priority | ✅ |
| Save actions to SharePoint list | ✅ |
| Send Outlook notifications | ✅ |
| Action dashboard (view/filter/update) | ✅ |
| Power Automate reminders | ✅ |
| Full audit trail | ✅ |

---

## 6. Architecture Diagram

### Current Architecture (No Backend)

```
┌──────────────────┐
│   User Browser   │
│   (Index.HTML)   │
│                  │
│  - Risk Assessment
│  - AI Analysis   │──── Fetch ──── External AI API (Vercel)
│  - CSV Export    │
│  - localStorage  │
└──────────────────┘
```

### Future Architecture (Azure + SharePoint)

```
┌─────────────────────────────────────────────────────────┐
│                  Goodyear Microsoft 365 Tenant           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐     ┌──────────────────────────────┐  │
│  │  Azure AD     │     │  SharePoint Online            │  │
│  │              │     │                              │  │
│  │  - SSO       │     │  Document Library:            │  │
│  │  - User Auth │     │  ├── Plant-Fulda/             │  │
│  │  - Groups    │     │  ├── Plant-Amiens/            │  │
│  │  - Roles     │     │  └── Plant-Adapazari/         │  │
│  └──────┬───────┘     │                              │  │
│         │             │  Lists:                       │  │
│         │             │  ├── Assessment Index          │  │
│         │             │  └── Actions Registry          │  │
│         │             └──────────┬───────────────────┘  │
│         │                        │                       │
│  ┌──────▼────────────────────────▼──────────────────┐   │
│  │              Microsoft Graph API                  │   │
│  │    (Unified API for all Microsoft 365 services)   │   │
│  └──────────────────────┬───────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────▼───────────────────────────┐   │
│  │         Azure App Service / Static Web App        │   │
│  │                                                   │   │
│  │  Risk Assessment Buddy (Index.HTML + server.js)   │   │
│  │  ├── MSAL.js (authentication)                     │   │
│  │  ├── Graph API calls (SharePoint read/write)      │   │
│  │  ├── AI Integration (risk analysis)               │   │
│  │  └── GOEHS Integration (CSV/Excel export)         │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Outlook / Teams / Power Automate                  │   │
│  │  ├── Email notifications (action assignments)      │   │
│  │  ├── Teams alerts (critical actions)               │   │
│  │  └── Automated reminders (overdue actions)         │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. What We Need from IT

### Phase 1 (SSO + Hosting)

| # | Request | Who | Effort |
|---|---------|-----|--------|
| 1 | Create Azure App Service (or Static Web App) | IT/Cloud Team | 30 min |
| 2 | Register app in Azure AD (App Registration) | IT/Identity Team | 30 min |
| 3 | Provide Tenant ID and Client ID | IT/Identity Team | 5 min |
| 4 | Grant API permission: `User.Read` | IT/Identity Team | 5 min |
| 5 | Configure redirect URI | IT/Identity Team | 5 min |
| 6 | Set up GitHub deployment (or provide deployment method) | IT/DevOps | 30 min |
| 7 | Enable HTTPS on App Service | IT/Cloud Team | 5 min |
| 8 | (Optional) Custom domain: `risk-buddy.goodyear.com` | IT/DNS Team | 1 hour |

### Phase 2 (SharePoint Integration)

| # | Request | Who | Effort |
|---|---------|-----|--------|
| 1 | Create SharePoint site: `EHS-RiskAssessment` | IT/SharePoint Admin | 30 min |
| 2 | Create Document Library: `Risk Assessments` | IT/SharePoint Admin | 15 min |
| 3 | Enable versioning on library | IT/SharePoint Admin | 5 min |
| 4 | Create SharePoint List: `Assessment Index` | IT/SharePoint Admin | 30 min |
| 5 | Grant API permissions: `Sites.ReadWrite.All`, `Files.ReadWrite.All` | IT/Identity Team | 10 min |
| 6 | Create Azure AD Security Groups per plant (e.g., `SG-EHS-Fulda`) | IT/Identity Team | 30 min |
| 7 | Set folder permissions per plant | IT/SharePoint Admin | 30 min |
| 8 | Provide SharePoint Site ID and Drive ID | IT/SharePoint Admin | 5 min |

### Phase 3 (Actions & Outlook)

| # | Request | Who | Effort |
|---|---------|-----|--------|
| 1 | Create SharePoint List: `Actions Registry` | IT/SharePoint Admin | 30 min |
| 2 | Create Azure AD Group: `SG-EHS-ActionOwners` | IT/Identity Team | 15 min |
| 3 | Add plant team members to the group | IT/Identity Team | 30 min |
| 4 | Grant API permissions: `Mail.Send`, `Group.Read.All` | IT/Identity Team | 10 min |
| 5 | (Optional) Create Power Automate flows for reminders | IT/Power Platform | 2 hours |
| 6 | (Optional) Create Teams channel: `EHS-RiskAssessment` | IT/Teams Admin | 15 min |

---

## 8. Cost Estimate

### Monthly Costs

| Resource | Phase | Cost/Month |
|----------|-------|------------|
| Azure App Service (B1 Basic) | Phase 1 | ~$13 |
| Azure App Service (S1 Standard) | Phase 1 | ~$73 |
| Azure Static Web Apps (Free tier) | Phase 1 | $0 |
| SharePoint Online | Phase 2 | $0 (included in M365) |
| Microsoft Graph API | All | $0 (included in M365) |
| Azure AD | All | $0 (included in M365) |
| Power Automate | Phase 3 | $0 (included in M365 E3+) |
| SSL Certificate | Phase 1 | $0 (Azure provides free SSL) |

### Total Estimated Cost

```
Phase 1: $0–73/month  (depending on tier chosen)
Phase 2: $0/month     (uses existing SharePoint)
Phase 3: $0/month     (uses existing M365 services)
──────────────────────
Total:   $0–73/month  vs AWS estimate of $80–200+/month
```

> **Most features use services already included in Goodyear's Microsoft 365 licenses.**

### AWS Comparison

```
AWS EC2 (t3.medium)   : ~$40/month
AWS NAT Gateway       : ~$40/month
AWS Data Transfer     : ~$10/month
AWS Route 53 (DNS)    : ~$1/month
Custom Auth (Cognito) : ~$10/month
───────────────────────
AWS Total             : ~$100+/month + custom integration effort
```

---

## 9. Timeline

```
PHASE 1: Host & Authenticate (SSO)
──────────────────────────────────
Week 1  │ IT: Create App Service + Azure AD Registration
Week 2  │ Dev: Integrate MSAL.js, deploy app, test SSO
        │ ✅ Milestone: App live with SSO

PHASE 2: SharePoint Integration
──────────────────────────────────
Week 3  │ IT: Create SharePoint site, libraries, lists
Week 4  │ Dev: Implement Save/Load project functions
Week 5  │ Dev: Implement deep linking, plant folder structure
        │ Test: Pilot with Fulda plant team
        │ ✅ Milestone: Save/Load projects working

PHASE 3: Actions & Notifications
──────────────────────────────────
Week 6  │ IT: Create Actions list, Azure AD groups
Week 7  │ Dev: Implement action generation, assignment UI
Week 8  │ Dev: Implement Outlook notifications
Week 9  │ Dev: Build actions dashboard
        │ Test: Full end-to-end testing with 2 plants
        │ ✅ Milestone: Full platform live

ROLLOUT
──────────────────────────────────
Week 10 │ Pilot: 2–3 plants
Week 12 │ Rollout: All EMEA plants
Week 14 │ Rollout: Americas + Asia Pacific
```

---

## 10. Security & Compliance

### Authentication & Authorization

| Control | Implementation |
|---------|----------------|
| Authentication | Azure AD SSO (MSAL.js) |
| Authorization | Azure AD Security Groups per plant |
| Token Storage | sessionStorage (clears on browser close) |
| Token Lifetime | 1 hour (auto-refresh) |
| MFA | Inherited from Goodyear Azure AD policy |
| Admin Access | Separate Azure AD role (`EHS-Admin`) |

### Data Protection

| Control | Implementation |
|---------|----------------|
| Encryption in transit | HTTPS/TLS 1.2+ (Azure enforced) |
| Encryption at rest | SharePoint (Microsoft-managed keys) |
| Data residency | EU data center (configurable) |
| Access logging | Azure AD sign-in logs + SharePoint audit |
| Data retention | SharePoint versioning + retention policies |
| Right to erasure (GDPR) | Standard SharePoint deletion + retention |

### Compliance Certifications (Inherited from Azure/M365)

- ✅ SOC 1, SOC 2, SOC 3
- ✅ ISO 27001, ISO 27018
- ✅ GDPR compliant
- ✅ CSA STAR
- ✅ HITRUST

### Data Flow (What Data Goes Where)

```
User Input (free text)
  ↓
AI API (risk analysis)        → Text only, no PII, sanitized output
  ↓
App (browser)                 → Structured risk data in memory
  ↓
SharePoint (storage)          → JSON project files (within Goodyear tenant)
  ↓
Outlook (notifications)       → Action assignment emails (internal only)
```

> **No personal data leaves Goodyear's Microsoft 365 tenant.**  
> Only anonymized task descriptions are sent to the AI API for classification.

---

## 11. FAQ for IT

### Q: Is this a custom-built app or a vendor product?
**A:** Custom-built by the EHS team. It's a single-page HTML/JavaScript application with no external dependencies except an AI classification API. All data stays within Goodyear's Microsoft 365 tenant.

### Q: Does it need a backend server?
**A:** Not for Phase 1 and 2. The app runs entirely in the browser and communicates directly with Microsoft Graph API using the user's Azure AD token. Phase 3 may benefit from a lightweight Node.js backend for Power Automate webhooks, but it's optional.

### Q: What API permissions does it need?
**A:** See [Section 7](#7-what-we-need-from-it). We start with `User.Read` only (Phase 1) and add more as needed. All permissions are **delegated** (user context), not **application-level**.

### Q: Can we restrict access to specific users/groups?
**A:** Yes. In Azure AD → Enterprise Applications → Risk Assessment Buddy → Properties → Set "User Assignment Required" to Yes. Then only assigned users/groups can access the app.

### Q: What happens if Azure goes down?
**A:** The app has a built-in offline mode — users can still create assessments locally and save as CSV/Excel. SharePoint sync resumes when connectivity is restored.

### Q: How do we add a new plant?
**A:** Three steps: (1) Create a folder in the SharePoint document library, (2) Create an Azure AD security group for the plant team, (3) Set folder permissions. The app auto-detects new plant folders.

### Q: Can we audit who accessed what?
**A:** Yes. Azure AD provides sign-in logs, and SharePoint provides file access audit logs. Both are available in the Microsoft 365 Compliance Center.

### Q: What about the AI API endpoint?
**A:** Currently hosted on Vercel (external). In Phase 1, we recommend moving this to an Azure Function within Goodyear's tenant for better security and compliance. This removes any external API dependency.

### Q: How much storage will it use?
**A:** Each project JSON file is approximately 5–50 KB. At 100 assessments per plant per year across 20 plants, that's roughly 100 MB/year — well within SharePoint's 25 TB default storage.

### Q: Can we integrate with our existing EHS systems?
**A:** Yes. The app already exports to GOEHS format (CSV/Excel). SharePoint integration enables automated data flows via Power Automate to other systems (SAP EHS, Enablon, etc.).

---

## Summary

| Phase | What | When | IT Effort | Cost |
|-------|------|------|-----------|------|
| **Phase 1** | Host app + SSO | Weeks 1–2 | ~2 hours | $0–73/month |
| **Phase 2** | SharePoint save/load | Weeks 3–5 | ~3 hours | $0/month |
| **Phase 3** | Actions + Outlook | Weeks 6–9 | ~4 hours | $0/month |

**Total IT effort: ~9 hours across 3 phases**  
**Total monthly cost: $0–73 (using existing M365 licenses)**

---

*This document is intended for internal Goodyear use only.*  
*For questions, contact the EHS Digital Team.*
