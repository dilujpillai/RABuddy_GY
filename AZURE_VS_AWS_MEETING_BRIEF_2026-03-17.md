# Risk Assessment Buddy — Why Azure, Not AWS
## Meeting Brief for IT Discussion — March 17, 2026

**Prepared for:** IT Team Meeting  
**Objective:** Demonstrate why Azure is the natural home for this app and present a concrete roadmap  
**Key Message:** *We're not choosing a cloud provider — we're choosing to stay inside the ecosystem Goodyear already owns and pays for.*

---

## 1. The 60-Second Elevator Pitch

> Risk Assessment Buddy is a working prototype that helps EHS teams identify workplace hazards using AI, generate standardized risk assessments, and export to our GOEHS system. It's been built and tested, but it's currently in the approval process for official deployment.
>
> Right now it has **no authentication, no persistence, and no collaboration** — it only runs locally in a browser. Before we deploy it globally, we need to add those capabilities. The question isn't *whether* to deploy it to the cloud — it's *which* cloud makes our lives easiest and gets us to market fastest.
>
> Every single integration we need — identity, storage, notifications, workflow automation, collaboration — **already exists in Microsoft 365**, which Goodyear already licenses. Putting this in AWS means building bridges back to Microsoft for every one of those features. Putting it in Azure means we just plug in.

---

## 2. The Five Killer Arguments for Azure

Use these as your main talking points. Each one is a conversation-stopper.

---

### Argument 1: "The App Lives Where the Users Live — Microsoft Teams"

**The Vision:**  
Risk Assessment Buddy becomes a **Teams tab app**. Users never leave Teams. They open a tab, create a risk assessment, save it, assign actions — all without switching windows.

**Why this matters:**
- Every Goodyear employee already has Teams open all day
- No new URL to remember, no bookmarks to manage
- Teams handles authentication silently — zero-click SSO
- Notifications about assigned actions appear as Teams messages
- Plant EHS channels can have a dedicated "Risk Assessment" tab

**What this looks like in practice:**
```
Teams → EHS-Fulda Channel → Risk Assessment Tab
  → User creates assessment
  → Saves to SharePoint (automatic)
  → Assigns action to colleague
  → Colleague gets Teams notification
  → Colleague opens same tab, completes action
  → Done. Never left Teams.
```

**AWS comparison:** With AWS, you'd host the app externally, users access via browser bookmark, authentication requires a separate SAML bridge, and you'd need to build a custom Teams connector. That's weeks of extra engineering for an inferior experience.

**Estimated effort to embed in Teams:** 1–2 days (Teams app manifest + tab configuration). The app is already a single-page web app — Teams tabs are literally just iframes pointing to a URL with SSO token pass-through.

---

### Argument 2: "Downloads Go Straight to SharePoint — Not Some S3 Bucket Nobody Can Find"

**The Vision:**  
Every risk assessment the user creates is saved as a structured JSON file in a **SharePoint document library**, organized by plant. Users can browse, search, and open past assessments directly from SharePoint — or from the app.

**Why this matters:**
- SharePoint is already Goodyear's document management system
- Plant teams already know how to navigate SharePoint
- Built-in versioning: every save creates a new version with full change history
- Built-in permissions: plant-level folder access using existing Azure AD security groups
- Built-in search: SharePoint indexes JSON content — users can find assessments by keyword
- Built-in retention policies: compliance team can set data lifecycle rules
- Built-in audit trail: who accessed what, when

**The folder structure:**
```
SharePoint: /sites/EHS-RiskAssessment/Risk Assessments/
├── Plant-Fulda/
│   ├── PROJ-FUL-20260212-001.json    ← Full assessment data
│   ├── PROJ-FUL-20260215-002.json
│   └── ...
├── Plant-Amiens/
├── Plant-Adapazari/
└── Templates/
```

**AWS comparison:** With AWS, files go to S3. Nobody at Goodyear browses S3. You'd need to build a custom file browser, implement your own versioning, create your own permission model, and set up your own audit logging. SharePoint gives you all of this for $0 additional cost.

---

### Argument 3: "Power Automate Unpacks the JSON and Populates SharePoint Lists — Zero Code"

**The Vision:**  
When a user saves a risk assessment, **Power Automate** automatically:
1. Detects the new/updated JSON file in SharePoint
2. Reads and parses the JSON content
3. Extracts key metadata (title, plant, date, risk ratings, hazard count, highest risk)
4. Creates/updates a row in a **SharePoint List** — giving management a searchable, filterable, sortable dashboard of ALL assessments across ALL plants
5. If any hazard is rated "Critical" or "High" — automatically sends a Teams notification to the plant manager

**This is the power play.** Here's the complete Power Automate flow:

```
FLOW 1: "Assessment Index Sync"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger:  When a file is created or modified in
          /sites/EHS-RiskAssessment/Risk Assessments/
          
Action 1: Get file content (JSON)
Action 2: Parse JSON (using schema from our app)
Action 3: Create/Update item in "Assessment Index" SharePoint List
          → Title:           assessment.title
          → Plant:           assessment.location
          → Organization:    assessment.organization
          → Status:          status
          → Created By:      createdBy
          → Assessment Date: assessment.assessmentDate
          → Hazard Count:    hazards.length
          → Highest Risk:    MAX(hazards[].initRating)
          → Project ID:      id
          → Deep Link:       [auto-generated app URL]

FLOW 2: "Critical Risk Alert"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger:  When item created/modified in "Assessment Index" list
Condition: Highest Risk = "Critical" OR "High"

Action 1: Get plant manager from Azure AD group
Action 2: Post adaptive card to Teams channel:
          "⚠️ High-Risk Assessment Filed"
          Plant: Fulda | Risk: Critical | Assessor: John Smith
          [View Assessment] [View Actions]
Action 3: Send Outlook email to plant manager + EHS director

FLOW 3: "Action Reminder"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger:  Recurrence (daily at 8 AM)
Condition: Actions list items WHERE DueDate = Tomorrow AND Status ≠ Completed

Action 1: For each overdue action:
          → Send Teams message to assignee
          → If 3+ days overdue: escalate to manager

FLOW 4: "Weekly EHS Summary"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger:  Recurrence (every Monday at 9 AM)
Action 1: Query Assessment Index for past 7 days
Action 2: Query Actions Registry for completion rates
Action 3: Compose HTML summary email
Action 4: Send to EHS leadership distribution list
```

**AWS comparison:** There is no Power Automate equivalent in AWS. You'd need to build Lambda functions, Step Functions, SNS topics, SES email sending, and custom dashboards. That's a full development project. With Power Automate, an EHS power user can build these flows in an afternoon using drag-and-drop — **no developer needed**.

**Cost:** $0. Power Automate is included in Microsoft 365 E3/E5 licenses that Goodyear already pays for.

---

### Argument 4: "SharePoint Lists Become the Management Dashboard — For Free"

**The Vision:**  
The SharePoint Lists populated by Power Automate become a **real-time management dashboard**:

**Assessment Index List — What Leadership Sees:**
| Title | Plant | Status | Risk Level | Assessor | Date | Actions |
|-------|-------|--------|-----------|----------|------|---------|
| Tire Building Line 3 | Fulda | Approved | High | J. Smith | 2026-03-10 | 5 open |
| Mixing Area Review | Amiens | In Review | Medium | M. Dupont | 2026-03-12 | 2 open |
| Warehouse Safety | Adapazari | Draft | Critical | A. Yilmaz | 2026-03-15 | 8 open |

**Actions Registry List — What Plant Managers See:**
| Action | Plant | Priority | Assigned To | Due | Status |
|--------|-------|----------|-------------|-----|--------|
| Install lifting aid | Fulda | High | J. Smith | Mar 26 | Open |
| Update signage | Amiens | Medium | P. Laurent | Mar 20 | Completed |
| Replace guard rail | Adapazari | Critical | O. Demir | Mar 18 | Overdue ⚠️ |

**What you get for free with SharePoint Lists:**
- Filter by plant, status, risk level, date range
- Sort by any column
- Group by plant or status
- Create custom views (e.g., "My Plant", "Overdue Actions", "Critical Risks")
- Export to Excel with one click
- Power BI integration for executive dashboards
- Mobile access via SharePoint mobile app
- Conditional formatting (red for overdue, green for completed)

**AWS comparison:** You'd need to build a custom dashboard from scratch — React frontend, API Gateway, DynamoDB or RDS backend, Cognito auth. That's a multi-sprint project. SharePoint Lists do it out of the box.

---

### Argument 5: "Total Cost: ~$73/month. AWS Would Be $200+/month Plus Weeks of Integration Work"

**Azure Cost Breakdown:**
| Resource | Monthly Cost | Notes |
|----------|-------------|-------|
| Azure App Service (S1) | $73 | Hosts the web app |
| Azure AD / Entra ID | $0 | Included in M365 |
| SharePoint Online | $0 | Included in M365 |
| Microsoft Graph API | $0 | Included in M365 |
| Power Automate | $0 | Included in M365 E3+ |
| Teams Integration | $0 | Included in M365 |
| Outlook Integration | $0 | Included in M365 |
| SSL Certificate | $0 | Azure-provided |
| **TOTAL** | **~$73/month** | |

**AWS Cost Breakdown (to achieve equivalent functionality):**
| Resource | Monthly Cost | Notes |
|----------|-------------|-------|
| EC2 (t3.medium) | ~$40 | Hosts the web app |
| NAT Gateway | ~$40 | Required for networking |
| S3 Storage | ~$5 | File storage |
| Cognito | ~$10 | Authentication |
| SES (email) | ~$5 | Email sending |
| Lambda + Step Functions | ~$15 | Workflow automation |
| API Gateway | ~$10 | API management |
| Data Transfer | ~$10 | Outbound transfer |
| ACM Certificate | $0 | SSL cert |
| **TOTAL** | **~$135+/month** | |

**But the real cost is hidden:** AWS requires custom integration code for every Microsoft service — SSO bridge to Azure AD, middleware for SharePoint, custom connectors for Teams/Outlook, custom workflow engine to replace Power Automate. **That's 4–8 weeks of additional developer time.**

---

## 3. The "What If IT Says..." Rebuttal Guide

| IT Says | Your Response |
|---------|---------------|
| *"We standardize on AWS"* | "I understand. But this app's value comes from Microsoft 365 integration — Teams, SharePoint, Outlook, Power Automate. On AWS, we'd spend weeks building bridges back to M365. On Azure, we plug in natively. The app is small ($73/month) — the cost of bridging to M365 from AWS would exceed the hosting cost." |
| *"AWS is more scalable"* | "This is an internal EHS tool for ~500–2,000 users. A single Azure App Service instance handles 10,000+ concurrent users. We'll never need hyperscale. What we need is integration, and Azure has that." |
| *"We already have AWS infrastructure"* | "Absolutely, and this avoids duplicating what AWS does well. This app specifically needs identity (Entra ID), documents (SharePoint), comms (Teams/Outlook), and workflows (Power Automate). All of those are Microsoft. Hosting it in Azure means one ecosystem, one set of credentials, one security perimeter." |
| *"Security team prefers AWS"* | "The security model here inherits 100% from Goodyear's existing M365 tenant — same Conditional Access policies, same MFA, same compliance certifications (SOC 2, ISO 27001, GDPR). No new security surface to audit. On AWS, we'd need to configure security from scratch AND maintain cross-cloud trust." |
| *"Can we at least look at a hybrid approach?"* | "Sure — we could host the static app on AWS and call Microsoft Graph APIs from there. But that means managing CORS, token exchange across domains, and maintaining two cloud environments for one small app. It's simpler and cheaper to keep everything in one place." |
| *"What about vendor lock-in?"* | "The app is standard HTML/JS — it runs anywhere. The lock-in concern is backwards: we're locked into M365 regardless (email, Teams, SharePoint). Azure is the only cloud that connects to M365 natively. Putting this on AWS doesn't reduce lock-in; it just adds a second vendor." |

---

## 4. The Live Demo Angle (If Opportunity Arises)

If you get the chance to show something in the meeting, here's the narrative:

1. **Show the app working today** — open Index.HTML, create a quick risk assessment, show the AI hazard identification
2. **Show the JSON output** — "This is what gets saved. Structured, machine-readable, ready for SharePoint"
3. **Show the SharePoint List mockup** — "This is what Power Automate creates automatically from that JSON. No code. Plant managers see this dashboard."
4. **Show a Power Automate flow** — Even a screenshot of the flow designer showing the trigger → parse → update pattern
5. **Show a Teams tab** — "This is where users will access it. They never leave Teams."

---

## 5. The Roadmap — How We Get There

### Phase 0: Where We Are Today (Prototype in Approval)
- ✅ Working single-page web app (HTML + JavaScript) — built and tested locally
- ✅ AI-powered hazard identification and risk scoring
- ✅ Multi-language support (EN, FR, DE)
- ✅ GOEHS CSV/Excel export
- ❌ No authentication — anyone with the URL can access
- ❌ No persistence — data lost on browser close (localStorage only)
- ❌ No collaboration — users can't share or jointly edit assessments
- ⏳ Status: Awaiting IT/Legal approval to deploy

---

### Phase 1: Host + SSO + Teams Tab (Weeks 1–3)

**Goal:** App is live in Azure, secured with Goodyear SSO, accessible as a Teams tab.

| Week | Who | What |
|------|-----|------|
| Week 1 | IT | Create Azure App Service, register app in Entra ID, provide Tenant/Client IDs |
| Week 2 | Dev | Integrate MSAL.js for SSO, deploy app, test authentication |
| Week 3 | Dev + IT | Create Teams app manifest, deploy as Teams tab, test with pilot users |

**IT effort:** ~2–3 hours total  
**Deliverables:**
- ✅ App hosted at `https://risk-assessment-buddy.azurewebsites.net`
- ✅ Only Goodyear employees can access (Entra ID SSO)
- ✅ User name/email displayed in app
- ✅ Available as a tab in Microsoft Teams
- ✅ MFA and Conditional Access policies inherited automatically

**Teams Tab — Technical Detail:**
```json
// Teams App Manifest (manifest.json)
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "version": "1.0.0",
  "id": "risk-assessment-buddy-guid",
  "name": { "short": "Risk Assessment Buddy" },
  "description": { "short": "AI-powered EHS risk assessments" },
  "staticTabs": [
    {
      "entityId": "riskAssessment",
      "name": "Risk Assessment",
      "contentUrl": "https://risk-assessment-buddy.azurewebsites.net?context=teams",
      "scopes": ["personal"]
    }
  ],
  "configurableTabs": [
    {
      "configurationUrl": "https://risk-assessment-buddy.azurewebsites.net/config",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupchat"]
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["risk-assessment-buddy.azurewebsites.net"]
}
```

---

### Phase 2: SharePoint Storage + Power Automate Sync (Weeks 4–7)

**Goal:** Assessments saved to SharePoint, Power Automate syncs metadata to SharePoint Lists.

| Week | Who | What |
|------|-----|------|
| Week 4 | IT | Create SharePoint site + document library + Assessment Index list |
| Week 5 | Dev | Implement Save/Load via Microsoft Graph API |
| Week 5 | Dev/EHS | Build Power Automate flow: JSON → SharePoint List sync |
| Week 6 | Dev | Implement deep-linking (shareable URLs) + plant folder structure |
| Week 7 | Test | Pilot with Fulda + Amiens plant teams |

**IT effort:** ~3 hours total  
**Deliverables:**
- ✅ Save assessment → JSON file in SharePoint (organized by plant)
- ✅ Load assessment → Open any saved project from SharePoint
- ✅ Power Automate parses JSON → populates Assessment Index list
- ✅ SharePoint List = searchable/filterable dashboard of all assessments
- ✅ Version history on every file (built-in)
- ✅ Plant-level permissions via Azure AD security groups
- ✅ Deep links: share assessment via Teams/email, recipient opens directly

**Power Automate Flow Design:**
```
TRIGGER: When a file is created or modified
         in /sites/EHS-RiskAssessment/Risk Assessments/

→ GET file content
→ PARSE JSON (schema provided by dev team)
→ CONDITION: Does item exist in Assessment Index list?
   YES → UPDATE item with new values
   NO  → CREATE new item
→ CONDITION: Highest risk = Critical?
   YES → POST Teams notification to plant manager channel
         SEND email to EHS director
```

---

### Phase 3: Actions Registry + Outlook/Teams Notifications (Weeks 8–11)

**Goal:** Corrective actions tracked in SharePoint, assigned via Teams, reminders automated.

| Week | Who | What |
|------|-----|------|
| Week 8 | IT | Create Actions Registry SharePoint list + SG-EHS-ActionOwners group |
| Week 9 | Dev | Implement action generation from hazards + assignment UI |
| Week 10 | Dev | Implement Teams/Outlook notifications for action assignments |
| Week 11 | Dev/EHS | Build Power Automate flows: reminders, escalations, weekly summary |

**IT effort:** ~4 hours total  
**Deliverables:**
- ✅ Generate corrective actions from identified hazards
- ✅ Assign actions to team members (loaded from Azure AD group)
- ✅ Teams notification to assignee with adaptive card (Accept/Decline/View)
- ✅ Outlook email with action details + deep link to app
- ✅ Actions Registry SharePoint List = plant manager action dashboard
- ✅ Power Automate: daily overdue reminders, escalation after 3 days, weekly EHS summary email

---

### Phase 4: Power BI Executive Dashboard + Mobile (Weeks 12–14)

**Goal:** Leadership visibility across all plants, mobile access for floor walkers.

| Week | Who | What |
|------|-----|------|
| Week 12 | Dev/EHS | Connect Power BI to SharePoint Lists (Assessment Index + Actions Registry) |
| Week 13 | Dev | Optimize app for mobile Teams (responsive layout) |
| Week 14 | Test | Full rollout to all plants |

**Deliverables:**
- ✅ Power BI dashboard: assessments by plant, risk trends, action completion rates
- ✅ Power BI embedded in Teams channel as a tab
- ✅ Mobile-optimized experience for floor assessments via Teams mobile app
- ✅ Global rollout to EMEA → Americas → Asia Pacific

---

### Visual Roadmap

```
MAR 2026        APR 2026         MAY 2026          JUN 2026
───────────────────────────────────────────────────────────────
PHASE 1         PHASE 2          PHASE 3            PHASE 4
SSO + Teams     SharePoint +     Actions +          Power BI +
Tab             Power Automate   Notifications      Mobile
                                                    
[██████████]    [██████████████]  [████████████████]  [██████████]
Wk 1-3          Wk 4-7           Wk 8-11            Wk 12-14

Milestones:
🔵 App live with SSO in Teams
🔵 Assessments saved to SharePoint, synced to Lists
🔵 Actions tracked, notifications automated
🔵 Executive dashboards live, global rollout complete
```

---

## 6. The "Microsoft Ecosystem Synergy" Slide

If you need to put this on a slide, here's the core diagram:

```
┌─────────────────────────────────────────────────────────────┐
│              GOODYEAR MICROSOFT 365 TENANT                  │
│                                                             │
│  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐  │
│  │  TEAMS    │  │SHAREPOINT│  │  OUTLOOK   │  │POWER BI │  │
│  │           │  │          │  │            │  │         │  │
│  │ App Tab   │  │ JSON     │  │ Action     │  │Executive│  │
│  │ Notifs    │  │ Storage  │  │ Emails     │  │Dashboard│  │
│  │ Channels  │  │ Lists    │  │ Reminders  │  │ Reports │  │
│  └─────┬─────┘  └────┬─────┘  └─────┬──────┘  └────┬────┘  │
│        │             │              │              │        │
│        └──────┬──────┴──────┬───────┴──────┬───────┘        │
│               │             │              │                │
│        ┌──────▼─────────────▼──────────────▼──────┐         │
│        │         MICROSOFT GRAPH API              │         │
│        │      (Single unified API for all)        │         │
│        └────────────────────┬─────────────────────┘         │
│                             │                               │
│        ┌────────────────────▼─────────────────────┐         │
│        │    ⚡ POWER AUTOMATE                      │         │
│        │    JSON → List sync  |  Reminders         │         │
│        │    Escalations  |  Weekly summaries        │         │
│        └────────────────────┬─────────────────────┘         │
│                             │                               │
│        ┌────────────────────▼─────────────────────┐         │
│        │          ENTRA ID (Azure AD)             │         │
│        │    SSO  |  MFA  |  Groups  |  RBAC       │         │
│        └──────────────────────────────────────────┘         │
│                                                             │
│        ┌──────────────────────────────────────────┐         │
│        │     AZURE APP SERVICE ($73/month)         │         │
│        │     Risk Assessment Buddy (HTML + JS)     │         │
│        └──────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

        ↕ ALL connections are native. ZERO custom bridges. ↕

┌─────────────────────────────────────────────────────────────┐
│              IF WE USED AWS INSTEAD...                       │
│                                                             │
│  AWS EC2 ──bridge──→ Azure AD (SSO)                         │
│  AWS S3  ──bridge──→ SharePoint (storage)                   │
│  AWS SES ──bridge──→ Outlook (email)                        │
│  AWS Lambda──bridge──→ Teams (notifications)                │
│  AWS Step Functions ──bridge──→ Power Automate (workflows)  │
│                                                             │
│  = 5 custom bridges to build and maintain forever           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Summary: The Ask

**What we're asking IT to approve and help us deploy:**
1. **Host on Azure App Service** — $73/month (or $0 with Static Web Apps free tier)
2. **Entra ID App Registration for SSO** — ~30 minutes of IT time
3. **Create SharePoint site for data storage** — ~30 minutes of IT time
4. **Approve deployment as a Teams tab app** — Standard Teams admin process, follows existing governance
5. **Enable Power Automate workflows** — No additional IT effort (already licensed)

**Timeline:** 14-week phased rollout (Phase 1 goes live in 3 weeks if approved today)

**What Goodyear gets:**
- Authenticated, secure EHS risk assessment platform (replacing the unauthenticated prototype)
- Integrated into Teams (where everyone already works)
- Assessments stored in SharePoint (where documents already live for compliance/audit)
- Automated workflows via Power Automate (no-code, already licensed)
- Management dashboards via SharePoint Lists + Power BI
- Action tracking with automated reminders and escalations
- Full audit trail for compliance and accountability
- Global scalability across all plants
- **All for ~$73/month using tools Goodyear already pays for**

**What happens if we go AWS instead:**
- Same (or higher) hosting cost
- 4–8 weeks of custom integration development to bridge back to M365
- Ongoing maintenance burden for cross-cloud connections
- Separate security audit surface and compliance framework
- Users still step outside their workflow to use the app (no Teams integration)
- No Power Automate automation, no native Teams tab, no seamless SharePoint
- Delays deployment by 2+ months

**The strategic advantage:** This is a "low-hanging fruit" deployment that lets us demonstrate digital transformation inside the Microsoft ecosystem Goodyear has already invested in. Success here creates a template for other EHS/operational apps.
