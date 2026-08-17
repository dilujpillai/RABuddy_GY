# Risk Assessment Buddy (SMART 3.0) — Architecture, Data Movement & AWS Migration

**Prepared for:** AI Council Review
**Application:** Risk Assessment Buddy — SMART 3.0
**Output destination:** GOEHS Risk Registry (approved vendor)
**Document scope:** Current-state data movement, browser persistence, data privacy posture, and the Phase 2 migration to AWS with SSO.

---

## 1. Executive Summary

Risk Assessment Buddy is a **100% client-side web application**. There is no application server, no database, and no server-side user session. All risk assessment content lives in browser memory for the duration of a tab's life, and leaves the browser only when the user explicitly downloads a file or when text is sent to an external AI service for processing.

| Dimension | Current State (Phase 1) | Target State (Phase 2 — AWS) |
|---|---|---|
| Hosting | Static files, no managed platform | AWS (S3 + CloudFront, private origin) |
| Authentication | **None** — URL is the only control | SSO via corporate IdP |
| Authorisation | None | Role-based, group-driven from IdP |
| AI inference | Public Vercel proxy → OpenRouter → GPT-4o-mini | Private endpoint → Amazon Bedrock |
| Persistence | Browser `localStorage` + user-downloaded files | Same client model + optional server-side project store |
| Audit trail | **None** | CloudTrail + application audit log |
| Data residency | Indeterminate (OpenRouter sub-providers) | Contractually pinned AWS region |
| Output | GOEHS 40-column XLSX, manual upload | Same format, optionally automated |

**The three findings that most need Council attention** are unauthenticated access, an open AI proxy, and third-party LLM routing. These are detailed in Section 7 and addressed by Phase 2.

---

## 2. Current-State System Context

```mermaid
flowchart TB
    subgraph client["USER BROWSER — all assessment content lives here"]
        UI["Risk Assessment Buddy<br/>single-page application"]
        MEM["In-memory state<br/>images, GIF frames, table rows"]
        LS["localStorage<br/>preferences only"]
        FACE["face-api.js<br/>local face blur models"]
    end

    subgraph goodyear["GOODYEAR CONTROLLED"]
        FILES["Downloaded artefacts<br/>XLSX / JSON / ZIP / PDF"]
        GOEHS["GOEHS Risk Registry<br/>approved vendor"]
    end

    subgraph external["EXTERNAL — OUTSIDE GOODYEAR CONTROL"]
        PROXY["AI proxy<br/>Vercel serverless"]
        OR["OpenRouter<br/>LLM router"]
        LLM["GPT-4o-mini<br/>via sub-provider"]
        MM["MyMemory<br/>translation API"]
        CDN["Public CDNs<br/>Tailwind, DOMPurify, XLSX,<br/>Google Charts"]
    end

    UI --> MEM
    UI --> LS
    UI --> FACE
    UI -->|"text only"| PROXY
    PROXY --> OR
    OR --> LLM
    UI -->|"text only"| MM
    UI --> CDN
    UI -->|"user-initiated download"| FILES
    FILES -->|"manual upload by user"| GOEHS

    style client fill:#e0f2fe,stroke:#0369a1
    style goodyear fill:#dcfce7,stroke:#15803d
    style external fill:#fee2e2,stroke:#b91c1c
```

**Key architectural fact:** there is no path by which assessment data reaches a Goodyear-controlled server. It goes from the browser either to the user's local disk or to a third-party AI service.

---

## 3. Workflow Map

The application exposes five entry workflows that converge on one shared risk table and one shared GOEHS export.

```mermaid
flowchart LR
    subgraph inputs["INPUT WORKFLOWS"]
        RM["Rich Media<br/>photos, video, GIF"]
        FT["Free Text<br/>narrative description"]
        EX["Excel Sheet<br/>existing assessments"]
        FR["Fire Risk<br/>BETA"]
        CB["Cost-Benefit<br/>BETA"]
    end

    TABLE["MAIN RISK TABLE<br/>Steps, Hazard Group, Hazard List,<br/>Risk/Consequences, F / S / L,<br/>Risk Score, Controls"]

    subgraph outputs["OUTPUTS"]
        GX["GOEHS Batch Upload<br/>40-column XLSX"]
        PJ["Project JSON<br/>full state + images"]
        ZIP["Project ZIP<br/>images + report"]
        PDF["PDF report"]
    end

    RM --> TABLE
    FT --> TABLE
    EX --> TABLE
    FR --> TABLE
    CB -.->|"reads table"| TABLE

    TABLE --> GX
    TABLE --> PJ
    TABLE --> ZIP
    TABLE --> PDF

    GX --> REG["GOEHS Registry"]

    style TABLE fill:#fef3c7,stroke:#b45309,stroke-width:3px
    style REG fill:#dcfce7,stroke:#15803d
```

---

## 4. Workflow Data Flows

### 4.1 Rich Media — the most privacy-sensitive path

This is the only workflow that handles personal data (images of people). Face detection and blurring run **entirely in the browser** using locally hosted models; no image ever leaves the device via the network.

```mermaid
flowchart TB
    A["User uploads photo / video / GIF"] --> B["Browser object URL created<br/>held in memory"]
    B --> C["face-api.js loads models<br/>from local ./models/ directory"]
    C --> D["Face detection on canvas<br/>fully client-side"]
    D --> E{"Faces found?"}
    E -->|"Yes"| F["Auto-blur applied<br/>original kept in memory for undo"]
    E -->|"No"| G["Image unchanged"]
    F --> H["User adds notes:<br/>description, hazards, controls"]
    G --> H
    H --> I["TEXT ONLY extracted for AI"]
    I --> J["AI proxy → OpenRouter → LLM"]
    J --> K["Structured rows returned"]
    K --> L["Main risk table populated"]

    B -.->|"NEVER transmitted"| X["No image egress"]

    style X fill:#dcfce7,stroke:#15803d
    style I fill:#fef3c7,stroke:#b45309
    style J fill:#fee2e2,stroke:#b91c1c
```

**Privacy control:** face blur is applied before the image is embedded into any downloaded artefact, but it is a **user-verifiable** control, not an enforced one — the user can erase the blur. The blur protects downstream sharing of the ZIP/PDF/JSON, not transmission (images are never transmitted).

### 4.2 Excel Sheet — Multi-Tab AI wizard

The most complex path. A multi-sheet workbook is parsed in-browser, columns are mapped to the internal schema, each sheet is sent to the AI in batches, and results are reviewed before export.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant B as Browser app
    participant AI as AI proxy → OpenRouter
    participant D as Local disk

    U->>B: Upload .xlsx workbook
    B->>B: Parse sheets in memory (SheetJS)
    B->>B: Auto-detect column mapping
    U->>B: Select sheets, correct mapping, delete rows
    Note over B: STEP 1 — cleanup, no egress

    U->>B: Start AI processing
    loop Per sheet, batched, parallel lanes
        B->>AI: Text only: steps, hazards,<br/>controls, preset F/S/L
        AI-->>B: JSON rows
        B->>B: Preserve user F/S/L values
        B->>B: Match to hazard registry
    end
    Note over B: STEP 2 — AI transform

    B->>U: Review table, red = registry mismatch
    U->>B: AI Fix / Suggest Closest Match
    B->>AI: Unresolved values + task context
    AI-->>B: Registry-valid mappings
    Note over B: STEP 3 — review and correct

    U->>B: Set GOEHS header, download
    B->>D: GOEHS XLSX per sheet + batch ZIP
    B->>D: Project JSON
```

### 4.3 Free Text and Fire Risk

Both send narrative text to the AI and receive structured rows. Same egress profile as the Excel path, lower volume.

---

## 5. Data Movement and Egress — Privacy Focus

This is the diagram to anchor the privacy discussion. It classifies every outbound flow.

```mermaid
flowchart TB
    subgraph browser["BROWSER — data at rest and in use"]
        IMG["Images / video / GIF frames<br/>CLASS: may contain personal data"]
        TXT["Assessment text<br/>steps, hazards, controls"]
        RAT["Risk ratings F / S / L"]
        META["Project identity<br/>Plant, Process, Org, Location"]
    end

    subgraph egress["EGRESS CHANNELS"]
        E1["AI processing<br/>Vercel → OpenRouter → GPT-4o-mini"]
        E2["Translation<br/>MyMemory free API"]
        E3["CDN asset loading<br/>IP address exposed"]
        E4["Google Charts<br/>dashboard rendering"]
        E5["User download<br/>to local disk"]
    end

    subgraph dest["DESTINATION"]
        LOCAL["Local disk<br/>Goodyear-managed endpoint"]
        VENDOR["GOEHS Registry<br/>approved vendor"]
        THIRD["Third-party processors"]
    end

    IMG -->|"NEVER"| E1
    IMG --> E5
    TXT --> E1
    TXT --> E2
    RAT --> E1
    META --> E5

    E1 --> THIRD
    E2 --> THIRD
    E3 --> THIRD
    E4 --> THIRD
    E5 --> LOCAL
    LOCAL -->|"manual upload"| VENDOR

    style IMG fill:#fecaca,stroke:#b91c1c
    style E1 fill:#fed7aa,stroke:#c2410c
    style E2 fill:#fed7aa,stroke:#c2410c
    style THIRD fill:#fee2e2,stroke:#b91c1c
    style VENDOR fill:#dcfce7,stroke:#15803d
    style LOCAL fill:#dcfce7,stroke:#15803d
```

### Egress register

| # | Channel | Data sent | Processor | Contract / DPA | Phase 2 disposition |
|---|---|---|---|---|---|
| E1 | AI processing | Step text, hazard text, control text, F/S/L | OpenRouter → sub-provider | **None** | Replace with Amazon Bedrock |
| E2 | Translation | Steps, Hazard Source, Current Control | MyMemory free tier | **None** | Replace with Bedrock / Amazon Translate |
| E3 | CDN assets | IP, user agent | Cloudflare, unpkg, jsDelivr | None | Self-host in S3 |
| E4 | Google Charts | Aggregated chart values | Google | None | Replace with local charting library |
| E5 | Download | Everything, incl. base64 images | None — local | N/A | Retain, add classification labelling |

**In-app guidance today:** the Data Privacy notice instructs users not to enter personal information into text fields because they are processed externally. This is an **advisory control only** — nothing enforces it.

---

## 6. Browser Persistence — Detailed

This section matters because it determines what survives on a shared or kiosk machine.

### 6.1 What is actually persisted

```mermaid
flowchart LR
    subgraph vol["VOLATILE — lost on refresh or tab close"]
        V1["Uploaded images and object URLs"]
        V2["GIF frames and clip collections"]
        V3["Main risk table rows"]
        V4["AI results and review state"]
        V5["Excel workbook parse state"]
    end

    subgraph persist["PERSISTED — localStorage, survives restart"]
        P1["appLanguage — UI language"]
        P2["goehsAssessmentData —<br/>Org, Location, Department, Workstation"]
        P3["batchOrgName / batchLocation"]
        P4["CBA baseline dataset"]
        P5["guide_seen_* — onboarding flags"]
    end

    subgraph never["NEVER PERSISTED IN BROWSER"]
        N1["Images and video"]
        N2["Assessment text and hazards"]
        N3["Credentials — none exist"]
    end

    style vol fill:#fef3c7,stroke:#b45309
    style persist fill:#fed7aa,stroke:#c2410c
    style never fill:#dcfce7,stroke:#15803d
```

**Assessment content is not written to `localStorage`.** Only preferences and organisational metadata persist. There is no `sessionStorage`, no IndexedDB, no cookies, and no analytics or tracking.

### 6.2 Session lifecycle

```mermaid
stateDiagram-v2
    [*] --> Empty: Open application
    Empty --> Working: Upload media / Excel / enter text
    Working --> Working: Edit table, run AI, correct mappings
    Working --> Saved: Download Project JSON or ZIP
    Saved --> Working: Continue editing
    Working --> Exported: Download GOEHS XLSX
    Exported --> Registry: User uploads to GOEHS
    Registry --> [*]

    Working --> Lost: Refresh / close tab / crash
    Lost --> Empty: All in-memory work discarded
    Saved --> Restored: Load Project JSON
    Restored --> Working

    note right of Lost
        No autosave, no recovery.
        Only preferences survive.
    end note

    note right of Saved
        JSON contains base64 images.
        Treat as sensitive artefact.
    end note
```

### 6.3 Persistence risk assessment

| Risk | Current exposure | Severity | Phase 2 mitigation |
|---|---|---|---|
| Org/Location metadata left on shared PC | `localStorage` persists indefinitely | Low | Bind to SSO session, clear on logout |
| Unsaved work lost on refresh | No autosave | Medium (usability) | Optional server-side draft store |
| Project JSON contains base64 images | Large file, easily shared | **High** | Classification labelling + encryption at rest |
| No remote wipe on device loss | Nothing to wipe server-side, but local files remain | Medium | MDM policy; server-side store enables revocation |
| Browser extensions can read page memory | Inherent to client-side model | Medium | Managed browser policy |

---

## 7. Cybersecurity Assessment — Current Gaps

```mermaid
flowchart TB
    subgraph gaps["FINDINGS"]
        G1["NO AUTHENTICATION<br/>URL is the only access control"]
        G2["AI PROXY OPEN<br/>CORS allow-all, no API key,<br/>callable by anyone"]
        G3["THIRD-PARTY LLM ROUTING<br/>OpenRouter selects sub-provider,<br/>residency indeterminate"]
        G4["NO AUDIT TRAIL<br/>no record of who assessed what"]
        G5["NO DPA<br/>with OpenRouter or MyMemory"]
        G6["SUPPLY CHAIN<br/>runtime CDN dependencies,<br/>no SRI pinning"]
    end

    subgraph impact["IMPACT"]
        I1["Uncontrolled access to<br/>safety assessment tooling"]
        I2["API key abuse,<br/>uncapped inference cost"]
        I3["Potential GDPR transfer issue<br/>if personal data entered"]
        I4["No traceability for<br/>safety-critical records"]
    end

    G1 --> I1
    G2 --> I2
    G3 --> I3
    G5 --> I3
    G4 --> I4
    G6 --> I2

    style gaps fill:#fee2e2,stroke:#b91c1c
    style impact fill:#fef3c7,stroke:#b45309
```

**Priority ranking for remediation:** G1 and G2 are the highest priority and are addressed first in the migration sequence.

---

## 8. Phase 2 — AWS Migration

### 8.1 Target architecture

```mermaid
flowchart TB
    subgraph user["USER"]
        BR["Corporate browser"]
    end

    subgraph idp["IDENTITY"]
        SSO["Corporate IdP<br/>SAML / OIDC"]
    end

    subgraph aws["AWS — GOODYEAR ACCOUNT"]
        WAF["AWS WAF"]
        CF["CloudFront<br/>OAC to private bucket"]
        S3["S3<br/>static app + self-hosted libraries"]
        COG["Cognito user pool<br/>federated to corporate IdP"]
        APIGW["API Gateway<br/>JWT authoriser"]
        LAM["Lambda<br/>AI orchestration"]
        BR2["Amazon Bedrock<br/>in-region inference"]
        DDB["DynamoDB<br/>optional project drafts"]
        S3P["S3 project store<br/>KMS encrypted"]
        CT["CloudTrail + CloudWatch<br/>audit and monitoring"]
        SM["Secrets Manager"]
    end

    subgraph vendor["VENDOR"]
        GOEHS["GOEHS Risk Registry"]
    end

    BR --> WAF --> CF --> S3
    BR -->|"1. authenticate"| SSO
    SSO -->|"2. assertion"| COG
    COG -->|"3. JWT"| BR
    BR -->|"4. API call + JWT"| APIGW
    APIGW --> LAM
    LAM --> BR2
    LAM --> DDB
    LAM --> S3P
    LAM --> SM
    APIGW -.-> CT
    LAM -.-> CT

    BR -->|"GOEHS XLSX"| GOEHS

    style aws fill:#e0f2fe,stroke:#0369a1
    style idp fill:#f3e8ff,stroke:#7e22ce
    style vendor fill:#dcfce7,stroke:#15803d
```

### 8.2 SSO authentication flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant CF as CloudFront
    participant C as Cognito
    participant I as Corporate IdP
    participant A as API Gateway
    participant L as Lambda
    participant B as Bedrock

    U->>CF: Request application
    CF->>U: App shell, unauthenticated
    U->>C: Initiate sign-in
    C->>I: Redirect, SAML/OIDC request
    I->>I: Corporate credentials + MFA
    I-->>C: Assertion with group claims
    C-->>U: ID and access tokens
    Note over U: Session bound to identity

    U->>A: AI request + Bearer JWT
    A->>A: Validate JWT, check scope
    A->>L: Authorised invoke
    L->>B: Inference, in-region
    B-->>L: Completion
    L-->>U: Structured result
    Note over A,L: Every call logged to CloudTrail

    U->>C: Sign out
    C-->>U: Clear tokens
    Note over U: localStorage preferences cleared
```

### 8.3 What changes and what does not

```mermaid
flowchart LR
    subgraph unchanged["UNCHANGED — protects the investment"]
        U1["Client-side processing model"]
        U2["Face blur stays in browser"]
        U3["Images still never transmitted"]
        U4["Hazard and consequence registries"]
        U5["GOEHS 40-column output format"]
        U6["All five workflows"]
    end

    subgraph changed["CHANGED"]
        C1["Anonymous → SSO authenticated"]
        C2["OpenRouter → Amazon Bedrock"]
        C3["Public CDN → self-hosted S3"]
        C4["MyMemory → Bedrock / Translate"]
        C5["Google Charts → local library"]
        C6["No audit → full CloudTrail"]
        C7["Optional server-side drafts"]
    end

    style unchanged fill:#dcfce7,stroke:#15803d
    style changed fill:#dbeafe,stroke:#1d4ed8
```

**Migration principle:** the client-side privacy advantage is the application's strongest existing property. Phase 2 preserves it and adds identity, auditability, and contractual data control around it.

### 8.4 Migration sequence

```mermaid
flowchart TB
    S1["STAGE 1 — Lift and shift<br/>Static app to S3 + CloudFront + WAF<br/>Self-host all CDN libraries<br/>No functional change"]
    S2["STAGE 2 — Identity<br/>Cognito federated to corporate IdP<br/>SSO enforced at edge<br/>Closes finding G1"]
    S3["STAGE 3 — Private inference<br/>API Gateway + Lambda + Bedrock<br/>Decommission Vercel proxy<br/>Closes G2, G3, G5"]
    S4["STAGE 4 — Audit and governance<br/>CloudTrail, CloudWatch, alerting<br/>Prompt and response logging<br/>Closes G4"]
    S5["STAGE 5 — Optional enhancements<br/>Server-side project store<br/>Automated GOEHS submission<br/>Autosave and recovery"]

    S1 --> S2 --> S3 --> S4 --> S5

    style S1 fill:#dbeafe,stroke:#1d4ed8
    style S2 fill:#fef3c7,stroke:#b45309
    style S3 fill:#fed7aa,stroke:#c2410c
    style S4 fill:#e9d5ff,stroke:#7e22ce
    style S5 fill:#dcfce7,stroke:#15803d
```

### 8.5 Indicative timeline

```mermaid
gantt
    title Phase 2 Migration
    dateFormat YYYY-MM-DD
    axisFormat %b

    section Foundation
    AWS landing zone and accounts    :a1, 2026-09-01, 30d
    Static hosting, S3 + CloudFront  :a2, after a1, 21d
    Self-host third-party libraries  :a3, after a1, 21d

    section Identity
    Cognito and IdP federation       :b1, after a2, 30d
    SSO enforcement and RBAC         :b2, after b1, 21d

    section Inference
    Bedrock evaluation vs GPT-4o-mini :c1, after a2, 30d
    API Gateway and Lambda            :c2, after b1, 30d
    Prompt migration and validation   :c3, after c1, 30d
    Decommission Vercel proxy         :c4, after c2, 14d

    section Governance
    CloudTrail and audit logging      :d1, after c2, 21d
    DPIA and privacy sign-off         :d2, after c3, 21d

    section Cutover
    Parallel run                      :e1, after c4, 30d
    Production cutover                :e2, after e1, 14d
```

---

## 9. GOEHS Vendor Mapping

The output contract is fixed by the vendor template `Risk_Registry_Batch_Upload_Template.xlsx`.

### 9.1 Transformation pipeline

```mermaid
flowchart TB
    A["Internal risk table<br/>Goodyear schema"] --> B["Hazard Group → GOEHS Category<br/>10 vendor categories"]
    A --> C["Hazard List → GOEHS Sub-Hazard<br/>whitelist per category"]
    A --> D["Risk/Consequences → Potential Outcome"]
    A --> E["F / S / L → GOEHS scales<br/>Initial, Residual, Predictive"]
    A --> F["Controls → Countermeasure Ladder<br/>Level 1 to Level 6"]

    B --> G["Assessment header<br/>Organization, Site, Department,<br/>Workstation, Title, Date, Approver"]
    C --> G
    D --> G
    E --> G
    F --> G

    G --> H["40-column flat sheet<br/>'Batch Upload Template'"]
    H --> I["Header row duplicated<br/>rows 1 and 2, data from row 3"]
    I --> J["XLSX download"]
    J --> K["Manual upload to GOEHS Registry"]

    style H fill:#fef3c7,stroke:#b45309
    style K fill:#dcfce7,stroke:#15803d
```

### 9.2 Validation and correction loop

Registry mismatches are surfaced to the user rather than silently exported, which protects the integrity of the vendor submission.

```mermaid
flowchart LR
    A["AI-generated values"] --> B{"Matches vendor<br/>whitelist?"}
    B -->|"Yes"| C["Green — valid"]
    B -->|"No"| D["Red outline — flagged"]
    D --> E["Pass 1: AI Fix<br/>local fuzzy + AI with task context"]
    E --> F{"Resolved?"}
    F -->|"Yes"| G["Green outline — AI corrected"]
    F -->|"No"| H["Pass 2: Suggest Closest Match<br/>algorithmic nearest value"]
    H --> I["Amber dashed — needs review"]
    I --> J["User confirms or overrides"]
    C --> K["Export to GOEHS"]
    G --> K
    J --> K

    style D fill:#fecaca,stroke:#b91c1c
    style G fill:#dcfce7,stroke:#15803d
    style I fill:#fed7aa,stroke:#c2410c
```

**Control:** a live issue counter shows the number of non-whitelisted values remaining, so an assessment is never exported with silent vendor-format violations.

---

## 10. Data Classification Summary

| Data element | Classification | At rest | In transit to AI | In GOEHS export |
|---|---|---|---|---|
| Workplace photos / video | **Confidential — may contain personal data** | Browser memory; local file after download | **Never sent** | Not included |
| Faces in images | **Personal data** | Blurred client-side before download | **Never sent** | Not included |
| Step descriptions | Internal | Browser memory | **Sent** | Included |
| Hazard / control text | Internal | Browser memory | **Sent** | Included |
| Risk ratings F/S/L | Internal | Browser memory | Sent | Included |
| Org, Site, Department, Workstation | Internal | **`localStorage`** | Not sent | Included |
| Assessor identity | Not captured today | N/A | N/A | Approver field, free text |
| Credentials | None exist today | N/A | N/A | N/A |

**Note for Council:** assessor identity is currently a free-text field with no verification. Phase 2 SSO allows this to be populated authoritatively from the authenticated identity, which materially improves the evidentiary value of the record for a safety-critical system.

---

## 11. Recommendations to the Council

1. **Approve Stage 1–3 as a single work package.** Stages 1 and 2 without Stage 3 leave the open AI proxy in place; the security benefit is not realised until inference moves in-house.
2. **Treat the Vercel proxy as an interim control.** Apply an API key and origin restriction now, before migration, as a compensating control.
3. **Commission a DPIA** covering the AI text egress path, in parallel with Stage 3 rather than after it.
4. **Preserve the client-side image model as a design constraint.** It is the reason no image has ever left a Goodyear device, and it should be an explicit non-functional requirement of the AWS target.
5. **Adopt Bedrock in a pinned region** to make data residency contractual rather than indeterminate.
6. **Populate the GOEHS Approver field from SSO identity** once available, to close the traceability gap on safety-critical records.

---

## Appendix A — Technology Inventory

| Layer | Component | Hosting today | Phase 2 |
|---|---|---|---|
| UI | Single-page app, vanilla JS | Static files | S3 + CloudFront |
| Styling | Tailwind CSS | CDN | Self-hosted |
| Sanitisation | DOMPurify | CDN | Self-hosted |
| Spreadsheet | SheetJS (XLSX) | CDN | Self-hosted |
| Face detection | face-api.js + local models | **Already local** | Unchanged |
| Archive | JSZip | Local | Unchanged |
| PDF | PDFKit + blob-stream | Local | Unchanged |
| Charts | Google Charts | Google | Local library |
| AI inference | GPT-4o-mini via OpenRouter | Vercel | Amazon Bedrock |
| Translation | MyMemory | Free API | Bedrock / Translate |
| Registries | Hazard, consequence, GOEHS category | Local JS | Unchanged |

## Appendix B — localStorage Key Reference

| Key | Contents | Sensitivity | Lifetime |
|---|---|---|---|
| `appLanguage` | UI language code | None | Indefinite |
| `goehsAssessmentData` | Org, Location, Department, Workstation | Low — organisational | Indefinite |
| `batchOrgName` | Org for batch import | Low | Indefinite |
| `batchLocation` | Location for batch import | Low | Indefinite |
| CBA baseline key | Cost-benefit baseline dataset | Low — financial assumptions | Until cleared |
| `guide_seen_*` | Onboarding flags | None | Indefinite |

No key contains assessment content, personal data, or credentials.

---

## Appendix C — Standalone Architecture Diagrams

Two self-contained diagrams for direct reuse in slide decks. C.1 is the single-slide executive view; C.2 is the technical appendix view.

### C.1 High-Level Architecture — current state

```mermaid
flowchart LR
    USER["EHS Assessor<br/>corporate device"]

    subgraph TRUST["GOODYEAR TRUST BOUNDARY"]
        direction TB
        APP["RISK ASSESSMENT BUDDY<br/>browser-resident application<br/>———————————<br/>5 input workflows<br/>AI-assisted risk analysis<br/>GOEHS format mapping<br/>Face blur runs in-browser<br/>images never transmitted"]
        DISK["Local disk<br/>XLSX / JSON / ZIP / PDF"]
        GOEHS["GOEHS Risk Registry<br/>approved vendor"]
    end

    subgraph EXT["EXTERNAL PROCESSORS — outside Goodyear control"]
        direction TB
        AI["AI inference<br/>Vercel proxy → OpenRouter<br/>→ GPT-4o-mini"]
        AUX["Translation, CDN, Charts<br/>MyMemory, Tailwind, Google"]
    end

    USER --> APP
    APP --> DISK
    DISK -->|"manual upload"| GOEHS
    APP <-->|"assessment TEXT only"| AI
    APP -.->|"assets, IP exposed"| AUX

    style TRUST fill:#dcfce7,stroke:#15803d,stroke-width:2px
    style EXT fill:#fee2e2,stroke:#b91c1c,stroke-width:2px
    style APP fill:#dbeafe,stroke:#1d4ed8,stroke-width:3px
    style AI fill:#fed7aa,stroke:#c2410c
    style GOEHS fill:#bbf7d0,stroke:#15803d
```

**Single takeaway for the slide:** the application is entirely browser-resident. The only assessment data that crosses the trust boundary is free text sent for AI analysis. Images never leave the device.

### C.2 Detailed Architecture — current state

```mermaid
flowchart TB
    subgraph CLIENT["CLIENT TIER — browser runtime, no server-side session"]

        subgraph PRES["Presentation and workflow modules"]
            direction LR
            P1["index.html<br/>SPA shell, main risk table,<br/>Rich Media, Free Text"]
            P2["excel-mapper-core.js<br/>excel-mapper-ui.js<br/>column mapping engine"]
            P3["fire-risk-assessment.js<br/>fra/*.js<br/>fra-app, fra-ai, fra-data,<br/>fra-floorplan, click-mapper"]
            P4["cba/*.js<br/>cba-engine, cba-ai,<br/>cba-baseline, cba-ui"]
            P5["image-editor.js<br/>workflow-guides.js<br/>how-to-guide.js"]
        end

        AIC["AI ORCHESTRATION<br/>callAI / callAPI<br/>single egress choke point<br/>batching, prompt build,<br/>rating-preservation logic"]

        subgraph DOMAIN["Domain and mapping layer"]
            direction LR
            D1["ra-registry.js<br/>HAZARD_CATEGORIES<br/>COUNTERMEASURE_LADDER<br/>TRANSLATIONS"]
            D2["HAZARD_REGISTRY<br/>CONSEQUENCE_REGISTRY<br/>F / S / L scales"]
            D3["goehs-integration.js<br/>vendor mapping,<br/>buildGoehsBatchWorkbook,<br/>40-column export"]
        end

        subgraph LIBS["Client-side libraries"]
            direction LR
            L1["lib/face-api.min.js<br/>+ models/ SSD MobileNet,<br/>Tiny Face Detector<br/>RUNS FULLY LOCAL"]
            L2["lib/jszip.min.js<br/>lib/pdfkit.min.js<br/>lib/blob-stream.min.js"]
            L3["lib/gif.worker.js<br/>shareable_html_generator.js"]
            L4["Runtime CDN libraries<br/>Tailwind, DOMPurify,<br/>SheetJS, Google Charts"]
        end

        subgraph STATE["Browser state"]
            direction LR
            M1["IN-MEMORY — volatile<br/>images, GIF frames,<br/>risk table rows, AI results"]
            M2["localStorage — persisted<br/>appLanguage,<br/>goehsAssessmentData,<br/>batchOrgName, batchLocation,<br/>CBA baseline, guide_seen_*"]
        end
    end

    subgraph EXTERNAL["EXTERNAL SERVICES — outside Goodyear control"]
        direction TB
        X1["server.js on Vercel<br/>CORS allow-all, no auth<br/>holds OPENROUTER_API_KEY"]
        X2["OpenRouter<br/>routes to sub-provider"]
        X3["GPT-4o-mini"]
        X4["MyMemory translation API"]
        X5["CDNs — Tailwind, DOMPurify,<br/>SheetJS, Google Charts"]
    end

    subgraph OUT["OUTPUTS AND DESTINATION"]
        direction TB
        O1["GOEHS Batch Upload XLSX<br/>40 columns, header on rows 1-2,<br/>data from row 3"]
        O2["Project JSON<br/>full state + base64 images"]
        O3["Project ZIP / PDF report"]
        O4["GOEHS Risk Registry<br/>approved vendor"]
    end

    P1 --> AIC
    P2 --> AIC
    P3 --> AIC
    P4 --> AIC

    P1 --> D2
    P2 --> D2
    P3 --> D1
    P4 --> D2
    P1 --> L1
    P1 --> L2
    P5 --> L3

    D1 --> D3
    D2 --> D3

    P1 --> M1
    D3 --> M2
    P4 --> M2
    L1 -->|"blurred image<br/>stays in memory"| M1

    AIC -->|"TEXT ONLY"| X1
    AIC -.->|"text"| X4
    L4 -.->|"asset load, IP exposed"| X5
    X1 --> X2 --> X3

    D3 --> O1
    P1 --> O2
    L2 --> O3
    O1 -->|"manual upload"| O4

    style CLIENT fill:#e0f2fe,stroke:#0369a1,stroke-width:2px
    style EXTERNAL fill:#fee2e2,stroke:#b91c1c,stroke-width:2px
    style OUT fill:#dcfce7,stroke:#15803d,stroke-width:2px
    style M2 fill:#fed7aa,stroke:#c2410c
    style M1 fill:#fef3c7,stroke:#b45309
    style X1 fill:#fecaca,stroke:#b91c1c
    style D3 fill:#fef3c7,stroke:#b45309,stroke-width:2px
    style O4 fill:#bbf7d0,stroke:#15803d
    style L1 fill:#dcfce7,stroke:#15803d
    style AIC fill:#fed7aa,stroke:#c2410c,stroke-width:3px
```

**Reading the detailed view:**

| Layer | Purpose | Security relevance |
|---|---|---|
| Presentation | Five workflow modules, all client-side | No auth gate on any of them |
| Domain | Hazard/consequence registries and GOEHS vendor mapping | Enforces vendor whitelist before export |
| Libraries | Face blur, archive, PDF, GIF — all local | Face models local, so no image egress |
| Browser state | Volatile memory vs. `localStorage` | Only preferences persist; no content, no credentials |
| External | Vercel proxy → OpenRouter → LLM | Open CORS, no auth, no DPA — findings G2, G3, G5 |
| Outputs | XLSX to vendor, JSON/ZIP to disk | JSON carries base64 images — treat as sensitive |
