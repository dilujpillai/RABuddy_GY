# Risk Assessment Buddy Smart 3.0 — Architecture Diagrams

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Purpose:** Visual architecture and workflow diagrams for IT Security Review

---

## Table of Contents

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [Detailed Technical Architecture](#2-detailed-technical-architecture)
3. [User Workflow - Complete Journey](#3-user-workflow---complete-journey)
4. [Media Processing Workflow](#4-media-processing-workflow)
5. [Excel Import Workflow](#5-excel-import-workflow)
6. [End-to-End Flow (All Inputs → GOEHS)](#6-end-to-end-flow)
7. [GOEHS Integration Flow](#7-goehs-integration-flow)
8. [Authentication Flow (Phase 2)](#8-authentication-flow-phase-2)
9. [Data Security Flow](#9-data-security-flow)

---

## 1. High-Level System Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1e3a5f', 'primaryTextColor': '#fff', 'primaryBorderColor': '#7C0000', 'lineColor': '#F8B229', 'secondaryColor': '#006100', 'tertiaryColor': '#fff'}}}%%
flowchart TB
    subgraph USER["👤 USER LAYER"]
        Browser["🌐 Web Browser<br/>(Chrome/Edge/Firefox)"]
    end

    subgraph FRONTEND["📱 FRONTEND (GitHub Pages)"]
        UI["Risk Assessment Buddy<br/>Single Page Application"]
        LocalProcess["Local Processing<br/>• Face Detection<br/>• PDF Generation<br/>• Excel Parsing"]
        LocalStorage["💾 localStorage<br/>User Preferences"]
    end

    subgraph BACKEND["⚙️ BACKEND (Vercel → Azure)"]
        API["API Gateway<br/>/api/ai endpoint"]
        Auth["🔐 Authentication<br/>(Phase 2: Entra ID)"]
        Secrets["🔑 Secrets<br/>(API Keys)"]
    end

    subgraph AI["🤖 AI SERVICES"]
        OpenRouter["OpenRouter API<br/>(Current)"]
        AzureAI["Azure OpenAI<br/>(Phase 2)"]
    end

    subgraph OUTPUT["📤 OUTPUT"]
        PDF["📄 PDF Reports"]
        Excel["📊 Excel Files"]
        CSV["📋 CSV/TSV"]
        GOEHS["🏭 GOEHS Import Files"]
    end

    Browser --> UI
    UI --> LocalProcess
    UI --> LocalStorage
    UI --> API
    API --> Auth
    API --> Secrets
    API --> OpenRouter
    API -.-> AzureAI
    LocalProcess --> PDF
    LocalProcess --> Excel
    LocalProcess --> CSV
    LocalProcess --> GOEHS

    style USER fill:#e3f2fd
    style FRONTEND fill:#fff3e0
    style BACKEND fill:#f3e5f5
    style AI fill:#e8f5e9
    style OUTPUT fill:#fce4ec
```

---

## 2. Detailed Technical Architecture

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    subgraph INPUT["📥 INPUT LAYER"]
        FreeText["📝 Free Text Input<br/>Field Notes"]
        Photo["📷 Photo Upload<br/>JPG/PNG/WebP"]
        Video["🎥 Video Upload<br/>MP4/WebM"]
        LegacyExcel["📊 Legacy Excel<br/>Custom Format"]
        RA2025["📋 RA 2025 Template<br/>Standard Format"]
    end

    subgraph PREPROCESSING["🔧 PREPROCESSING (Client-Side)"]
        TextSanitize["DOMPurify<br/>Sanitize Text"]
        ImageProcess["Image Processing<br/>• Resize<br/>• Face Detection<br/>• Blur PII"]
        VideoProcess["Video Processing<br/>• Frame Extraction<br/>• Thumbnail Gen"]
        ExcelParse["SheetJS Parser<br/>• Read Cells<br/>• No Macros"]
        ColumnMapper["Column Mapper UI<br/>• Map Fields<br/>• Validate Types"]
    end

    subgraph AIPROCESS["🤖 AI PROCESSING"]
        PromptBuilder["Prompt Builder<br/>• Context Assembly<br/>• Few-shot Examples"]
        APICall["API Request<br/>POST /api/ai<br/>HTTPS/TLS 1.3"]
        ResponseParse["Response Parser<br/>• JSON Validation<br/>• Schema Check"]
    end

    subgraph BACKEND["⚙️ BACKEND SERVICES"]
        Vercel["Vercel Serverless<br/>(Current)"]
        Azure["Azure App Service<br/>(Phase 2)"]
        KeyVault["Key Vault<br/>API Key Storage"]
        RateLimit["Rate Limiter<br/>100 req/min"]
        AuditLog["Audit Logger<br/>(Phase 2)"]
    end

    subgraph EXTERNAL["🌐 EXTERNAL AI"]
        OpenRouter["OpenRouter<br/>GPT-4o-mini"]
        AzureOpenAI["Azure OpenAI<br/>GPT-4"]
    end

    subgraph TABLEBUILDER["📊 TABLE BUILDER (Client-Side)"]
        DataTransform["Data Transformer<br/>• Normalize Fields<br/>• Calculate Scores"]
        TableRender["Table Renderer<br/>• Dynamic Rows<br/>• Editable Cells"]
        Validation["Validation Engine<br/>• Required Fields<br/>• Range Checks"]
    end

    subgraph OUTPUT["📤 OUTPUT LAYER"]
        RiskTable["Risk Assessment Table<br/>(In-Browser)"]
        GOEHSModal["GOEHS Integration<br/>Modal"]
        PDFGen["PDFKit<br/>Report Generator"]
        ExcelExport["JSZip + SheetJS<br/>Excel Export"]
    end

    FreeText --> TextSanitize
    Photo --> ImageProcess
    Video --> VideoProcess
    LegacyExcel --> ExcelParse
    RA2025 --> ExcelParse
    ExcelParse --> ColumnMapper

    TextSanitize --> PromptBuilder
    ImageProcess --> PromptBuilder
    VideoProcess --> PromptBuilder
    ColumnMapper --> DataTransform

    PromptBuilder --> APICall
    APICall --> Vercel
    APICall -.-> Azure
    Vercel --> KeyVault
    Vercel --> RateLimit
    Azure --> AuditLog
    Vercel --> OpenRouter
    Azure -.-> AzureOpenAI
    OpenRouter --> ResponseParse
    AzureOpenAI -.-> ResponseParse

    ResponseParse --> DataTransform
    DataTransform --> TableRender
    TableRender --> Validation
    Validation --> RiskTable
    RiskTable --> GOEHSModal
    RiskTable --> PDFGen
    RiskTable --> ExcelExport

    style INPUT fill:#e3f2fd
    style PREPROCESSING fill:#fff8e1
    style AIPROCESS fill:#f3e5f5
    style BACKEND fill:#e8eaf6
    style EXTERNAL fill:#e8f5e9
    style TABLEBUILDER fill:#fff3e0
    style OUTPUT fill:#fce4ec
```

---

## 3. User Workflow - Complete Journey

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    Start([🚀 Start]) --> InputChoice{Choose Input<br/>Method}

    %% Free Text Path
    InputChoice -->|"📝 Free Text"| FreeTextInput["Enter Field Notes<br/>in Text Area"]
    FreeTextInput --> FreeTextAI["Click 'Generate with AI'<br/>Send to OpenRouter"]
    FreeTextAI --> TableGen["AI Generates<br/>Risk Table"]

    %% Photo Path
    InputChoice -->|"📷 Photo"| PhotoUpload["Upload Photo(s)<br/>JPG/PNG/WebP"]
    PhotoUpload --> FaceDetect{"Face<br/>Detected?"}
    FaceDetect -->|Yes| AutoBlur["Auto-Blur Faces<br/>(face-api.js)"]
    FaceDetect -->|No| PhotoReady["Photo Ready"]
    AutoBlur --> PhotoReady
    PhotoReady --> PhotoAI["Click 'Describe & Analyze'<br/>AI describes hazards"]
    PhotoAI --> TableGen

    %% Video Path
    InputChoice -->|"🎥 Video"| VideoUpload["Upload Video<br/>MP4/WebM"]
    VideoUpload --> FrameExtract["Extract Key Frames<br/>(Every N seconds)"]
    FrameExtract --> VideoFaceDetect{"Faces in<br/>Frames?"}
    VideoFaceDetect -->|Yes| VideoBlur["Blur Faces<br/>in Frames"]
    VideoFaceDetect -->|No| FramesReady["Frames Ready"]
    VideoBlur --> FramesReady
    FramesReady --> VideoAI["AI Analyzes<br/>Selected Frames"]
    VideoAI --> TableGen

    %% Legacy Excel Path
    InputChoice -->|"📊 Legacy Excel"| LegacyUpload["Upload Excel File<br/>(Any Format)"]
    LegacyUpload --> ParseExcel["Parse Excel<br/>(SheetJS)"]
    ParseExcel --> ShowColumns["Display Column<br/>Headers"]
    ShowColumns --> ColumnMapper["Column Mapper UI<br/>Map to RA Fields"]
    ColumnMapper --> ValidateMap{"Mapping<br/>Valid?"}
    ValidateMap -->|No| ColumnMapper
    ValidateMap -->|Yes| TransformData["Transform to<br/>Table Format"]
    TransformData --> TableGen

    %% RA 2025 Template Path
    InputChoice -->|"📋 RA 2025"| RA2025Upload["Upload RA 2025<br/>Template Excel"]
    RA2025Upload --> AutoParse["Auto-Parse<br/>Zone A + Zone B"]
    AutoParse --> ExtractData["Extract:<br/>• Plant Info<br/>• Tasks<br/>• Hazards<br/>• Controls"]
    ExtractData --> MapHierarchy["Map Control Hierarchy<br/>to Countermeasure Ladder"]
    MapHierarchy --> TableGen

    %% Table Generation & Editing
    TableGen --> DisplayTable["Display Risk<br/>Assessment Table"]
    DisplayTable --> EditTable{"Edit<br/>Required?"}
    EditTable -->|Yes| ManualEdit["Manual Edits:<br/>• Add/Delete Rows<br/>• Edit Cells<br/>• Adjust Ratings"]
    ManualEdit --> DisplayTable
    EditTable -->|No| ExportChoice{Choose<br/>Export}

    %% Export Options
    ExportChoice -->|"📄 PDF"| GenPDF["Generate PDF<br/>(PDFKit)"]
    ExportChoice -->|"📊 Excel"| GenExcel["Generate Excel<br/>(JSZip + SheetJS)"]
    ExportChoice -->|"🏭 GOEHS"| OpenGOEHS["Open GOEHS<br/>Integration Modal"]

    GenPDF --> Download["💾 Download<br/>to User PC"]
    GenExcel --> Download

    %% GOEHS Flow
    OpenGOEHS --> Tab1["Tab 1: Assessment<br/>Fill Metadata"]
    Tab1 --> Tab2["Tab 2: Tasks<br/>AI Assist Available"]
    Tab2 --> Tab3["Tab 3: Hazards<br/>Countermeasure Ladder"]
    Tab3 --> GOEHSExport["Export for GOEHS:<br/>• Copy TSV<br/>• Download CSV<br/>• Download Excel"]
    GOEHSExport --> PasteGOEHS["User Pastes to<br/>GOEHS System"]

    Download --> End([✅ Complete])
    PasteGOEHS --> End

    style Start fill:#4caf50,color:#fff
    style End fill:#4caf50,color:#fff
    style InputChoice fill:#2196f3,color:#fff
    style TableGen fill:#ff9800,color:#fff
    style ExportChoice fill:#9c27b0,color:#fff
```

---

## 4. Media Processing Workflow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart LR
    subgraph PHOTO["📷 PHOTO WORKFLOW"]
        P1["Upload Image"] --> P2["Validate:<br/>• File Type<br/>• Size < 10MB"]
        P2 --> P3["Load to Canvas"]
        P3 --> P4["face-api.js<br/>Detect Faces"]
        P4 --> P5{"Faces<br/>Found?"}
        P5 -->|Yes| P6["Apply Blur Filter<br/>(25px Gaussian)"]
        P5 -->|No| P7["Image Ready"]
        P6 --> P7
        P7 --> P8["Display Preview"]
        P8 --> P9["User Confirms"]
        P9 --> P10["Send to AI<br/>(Optional)"]
    end

    subgraph VIDEO["🎥 VIDEO WORKFLOW"]
        V1["Upload Video"] --> V2["Validate:<br/>• MP4/WebM<br/>• Size < 100MB"]
        V2 --> V3["Load Video<br/>Element"]
        V3 --> V4["Extract Frames<br/>Every 2 seconds"]
        V4 --> V5["For Each Frame:<br/>Detect Faces"]
        V5 --> V6["Blur Detected<br/>Faces"]
        V6 --> V7["Display Frame<br/>Gallery"]
        V7 --> V8["User Selects<br/>Key Frames"]
        V8 --> V9["Send Selected<br/>to AI"]
    end

    subgraph AI_DESCRIBE["🤖 AI DESCRIPTION"]
        A1["Receive Image/<br/>Frame Data"]
        A1 --> A2["Build Prompt:<br/>'Describe workplace<br/>hazards visible...'"]
        A2 --> A3["API Call<br/>OpenRouter"]
        A3 --> A4["Parse Response:<br/>Hazard descriptions"]
        A4 --> A5["Add to<br/>Risk Table"]
    end

    P10 --> A1
    V9 --> A1

    style PHOTO fill:#e3f2fd
    style VIDEO fill:#fff3e0
    style AI_DESCRIBE fill:#e8f5e9
```

---

## 5. Excel Import Workflow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    subgraph UPLOAD["📤 FILE UPLOAD"]
        Upload["User Uploads<br/>Excel File"]
        Validate["Validate:<br/>• .xlsx/.xls<br/>• Size < 5MB<br/>• No macros"]
    end

    subgraph DETECT["🔍 FORMAT DETECTION"]
        ReadFile["SheetJS<br/>Read Workbook"]
        CheckFormat{"Is RA 2025<br/>Template?"}
        RA2025Path["RA 2025<br/>Auto-Parse"]
        LegacyPath["Legacy Excel<br/>Column Mapper"]
    end

    subgraph RA2025["📋 RA 2025 PARSING"]
        ParseZoneA["Parse Zone A<br/>(Rows 1-10)"]
        ParseZoneB["Parse Zone B<br/>(Rows 11+)"]
        ExtractMeta["Extract:<br/>• Plant Name<br/>• RA Reference<br/>• Department<br/>• Area<br/>• Workstation<br/>• Assessor<br/>• Approver"]
        ExtractRisks["Extract Per Row:<br/>• Task/Activity<br/>• Hazard<br/>• Consequence<br/>• Controls<br/>• Hierarchy<br/>• L/S Ratings"]
        MapLadder["Map Hierarchy →<br/>Countermeasure Ladder"]
    end

    subgraph LEGACY["📊 LEGACY EXCEL PARSING"]
        ShowHeaders["Display All<br/>Column Headers"]
        MapperUI["Column Mapper UI"]
        MapTask["Map: Task Name →<br/>Column ?"]
        MapHazard["Map: Hazard →<br/>Column ?"]
        MapControl["Map: Controls →<br/>Column ?"]
        MapRatings["Map: L/S/F →<br/>Columns ?"]
        ValidateMapping["Validate All<br/>Required Mapped"]
    end

    subgraph TRANSFORM["🔄 DATA TRANSFORMATION"]
        Normalize["Normalize Data:<br/>• Clean text<br/>• Parse numbers<br/>• Format dates"]
        Calculate["Calculate:<br/>• Risk Scores<br/>• Priorities"]
        BuildTable["Build Table<br/>Data Structure"]
    end

    subgraph OUTPUT["📊 TABLE OUTPUT"]
        RenderTable["Render in<br/>Risk Table UI"]
        EnableEdit["Enable Editing:<br/>• Add Rows<br/>• Edit Cells<br/>• Delete Rows"]
        ReadyExport["Ready for:<br/>• PDF Export<br/>• GOEHS Export"]
    end

    Upload --> Validate
    Validate --> ReadFile
    ReadFile --> CheckFormat
    CheckFormat -->|"Yes<br/>(Zone A header found)"| RA2025Path
    CheckFormat -->|"No<br/>(Unknown format)"| LegacyPath

    RA2025Path --> ParseZoneA
    RA2025Path --> ParseZoneB
    ParseZoneA --> ExtractMeta
    ParseZoneB --> ExtractRisks
    ExtractRisks --> MapLadder
    ExtractMeta --> Normalize
    MapLadder --> Normalize

    LegacyPath --> ShowHeaders
    ShowHeaders --> MapperUI
    MapperUI --> MapTask
    MapperUI --> MapHazard
    MapperUI --> MapControl
    MapperUI --> MapRatings
    MapTask --> ValidateMapping
    MapHazard --> ValidateMapping
    MapControl --> ValidateMapping
    MapRatings --> ValidateMapping
    ValidateMapping --> Normalize

    Normalize --> Calculate
    Calculate --> BuildTable
    BuildTable --> RenderTable
    RenderTable --> EnableEdit
    EnableEdit --> ReadyExport

    style UPLOAD fill:#e3f2fd
    style DETECT fill:#fff8e1
    style RA2025 fill:#e8f5e9
    style LEGACY fill:#f3e5f5
    style TRANSFORM fill:#fff3e0
    style OUTPUT fill:#fce4ec
```

---

## 6. End-to-End Flow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    subgraph INPUTS["📥 ALL INPUT SOURCES"]
        I1["📝 Free Text<br/>Field Notes"]
        I2["📷 Photos<br/>(Face Blurred)"]
        I3["🎥 Video Frames<br/>(Face Blurred)"]
        I4["📊 Legacy Excel<br/>(Column Mapped)"]
        I5["📋 RA 2025<br/>(Auto-Parsed)"]
    end

    subgraph PROCESS["🔄 PROCESSING"]
        Sanitize["Sanitize All Input<br/>(DOMPurify)"]
        AIGen["AI Generation<br/>(if needed)"]
        Transform["Data Transformation"]
    end

    subgraph TABLE["📊 RISK ASSESSMENT TABLE"]
        MainTable["Main Risk Table<br/>• Task/Activity<br/>• Hazard Description<br/>• Current Controls<br/>• Severity (1-10)<br/>• Likelihood (1-10)<br/>• Frequency (1-10)<br/>• Risk Score<br/>• Recommended Controls"]
        Edit["User Edits<br/>& Validates"]
    end

    subgraph GOEHS["🏭 GOEHS INTEGRATION"]
        OpenModal["Open GOEHS Modal"]

        subgraph TAB1["Tab 1: Assessment Batch"]
            T1A["Assessment Title"]
            T1B["Assessment Type"]
            T1C["Approver"]
            T1D["Status"]
            T1E["Date (DD-MMM-YYYY)"]
            T1F["OrgName → Location → Dept<br/>(Cascading)"]
        end

        subgraph TAB2["Tab 2: Task Batch"]
            T2A["Task Name"]
            T2B["Core Activity<br/>(AI Assist)"]
            T2C["Job Title<br/>(AI Assist)"]
            T2D["Description"]
        end

        subgraph TAB3["Tab 3: Hazard Batch"]
            T3A["Task (from Tab 2)"]
            T3B["Hazard ID"]
            T3C["Current Control"]
            T3D["Countermeasure Ladder<br/>(Multi-select, AI Assist)"]
            T3E["Predicted Control"]
            T3F["Pred CM Ladder"]
            T3G["Residual F/S/L"]
        end
    end

    subgraph EXPORT["📤 GOEHS EXPORT"]
        E1["📋 Copy Assessment TSV"]
        E2["📋 Copy Tasks TSV"]
        E3["📋 Copy Hazards TSV"]
        E4["📥 Download All CSV"]
        E5["📊 Download Excel<br/>(3 Sheets)"]
    end

    subgraph FINAL["✅ FINAL DESTINATION"]
        UserPC["User's PC<br/>(Downloaded Files)"]
        GOEHSSystem["GOEHS Risk Registry<br/>(User Pastes Data)"]
    end

    I1 --> Sanitize
    I2 --> Sanitize
    I3 --> Sanitize
    I4 --> Sanitize
    I5 --> Sanitize

    Sanitize --> AIGen
    AIGen --> Transform
    Transform --> MainTable
    MainTable --> Edit
    Edit --> OpenModal

    OpenModal --> TAB1
    TAB1 --> TAB2
    TAB2 --> TAB3
    TAB3 --> E1
    TAB3 --> E2
    TAB3 --> E3
    TAB3 --> E4
    TAB3 --> E5

    E1 --> UserPC
    E2 --> UserPC
    E3 --> UserPC
    E4 --> UserPC
    E5 --> UserPC
    UserPC --> GOEHSSystem

    style INPUTS fill:#e3f2fd
    style PROCESS fill:#fff8e1
    style TABLE fill:#fff3e0
    style GOEHS fill:#e8f5e9
    style EXPORT fill:#f3e5f5
    style FINAL fill:#fce4ec
```

---

## 7. GOEHS Integration Flow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    subgraph TRIGGER["🚀 ENTRY POINT"]
        MainTable["Risk Assessment<br/>Table Complete"]
        ClickBtn["User Clicks<br/>'GOEHS Integration'"]
    end

    subgraph MODAL["🏭 GOEHS MODAL"]
        subgraph T1["📋 Tab 1: Assessment"]
            A1["Assessment Title"]
            A2["Assessment Type<br/>(Dropdown)"]
            A3["Approver"]
            A4["Status"]
            A5["Date DD-MMM-YYYY"]
            A6["OrgName"]
            A7["Location<br/>(Filtered by OrgName)"]
            A8["Department<br/>(Filtered by Location)"]
        end

        subgraph T2["📝 Tab 2: Tasks"]
            B1["Task Name<br/>(from main table)"]
            B2["Core Activity<br/>(Dropdown)"]
            B3["Job Title<br/>(Dropdown)"]
            B4["Description"]
            B5["⚡ Intelligent Fill<br/>(Keyword Match)"]
            B6["🤖 AI Assist<br/>(GPT-4o-mini)"]
        end

        subgraph T3["⚠️ Tab 3: Hazards"]
            C1["Task<br/>(from Tab 2)"]
            C2["Hazard ID"]
            C3["Current Control"]
            C4["Countermeasure Ladder<br/>(Multi-select 6 levels)"]
            C5["Predicted Control"]
            C6["Pred CM Ladder"]
            C7["Residual F/S/L<br/>(1-10 each)"]
            C8["⚡ Intelligent Fill<br/>(Control Keywords)"]
            C9["🤖 AI Assist<br/>(Hierarchy Classification)"]
        end
    end

    subgraph VALIDATE["✅ VALIDATION"]
        V1["Check Required Fields"]
        V2["Validate Date Format"]
        V3["Validate Dropdown Values"]
        V4["Validate CM Ladder<br/>(Exact Match)"]
        V5["Validate Ratings<br/>(1-10 Range)"]
    end

    subgraph EXPORT["📤 EXPORT OPTIONS"]
        E1["📋 Copy to Clipboard<br/>(TSV, no headers)"]
        E2["📥 Download CSV<br/>(with headers)"]
        E3["📊 Download Excel<br/>(3 sheets)"]
    end

    subgraph DEST["🎯 DESTINATION"]
        D1["User's PC<br/>(Files)"]
        D2["GOEHS System<br/>(Paste/Upload)"]
    end

    MainTable --> ClickBtn
    ClickBtn --> T1
    T1 --> T2
    T2 --> T3
    
    B5 -.-> B2
    B5 -.-> B3
    B6 -.-> B2
    B6 -.-> B3
    
    C8 -.-> C4
    C9 -.-> C4
    C8 -.-> C6
    C9 -.-> C6

    T3 --> V1
    V1 --> V2
    V2 --> V3
    V3 --> V4
    V4 --> V5
    V5 --> E1
    V5 --> E2
    V5 --> E3

    E1 --> D1
    E2 --> D1
    E3 --> D1
    D1 --> D2

    style TRIGGER fill:#e3f2fd
    style MODAL fill:#fff3e0
    style VALIDATE fill:#e8f5e9
    style EXPORT fill:#f3e5f5
    style DEST fill:#fce4ec
```

---

## 8. Authentication Flow (Phase 2)

```mermaid
%%{init: {'theme': 'base'}}%%
sequenceDiagram
    participant User as 👤 User
    participant Browser as 🌐 Browser
    participant EntraID as 🔐 Microsoft Entra ID
    participant Gateway as 🚪 API Gateway
    participant AppService as ⚙️ App Service
    participant KeyVault as 🔑 Key Vault
    participant AI as 🤖 Azure OpenAI

    User->>Browser: Click "Login with Goodyear"
    Browser->>EntraID: Redirect to login page
    User->>EntraID: Enter credentials
    EntraID->>EntraID: Validate credentials
    EntraID->>EntraID: MFA prompt (if configured)
    EntraID->>Browser: Return JWT token
    Browser->>Browser: Store token in sessionStorage

    Note over Browser,AI: Subsequent API Requests

    User->>Browser: Use AI feature
    Browser->>Gateway: API request + JWT token
    Gateway->>Gateway: Validate token signature
    Gateway->>Gateway: Check token expiration
    Gateway->>Gateway: Rate limit check
    Gateway->>AppService: Forward request
    AppService->>AppService: Validate token again
    AppService->>KeyVault: Get API key
    KeyVault->>AppService: Return API key
    AppService->>AI: Call Azure OpenAI
    AI->>AppService: Return response
    AppService->>AppService: Log audit event
    AppService->>Gateway: Return response
    Gateway->>Browser: Return to client
    Browser->>User: Display results

    Note over User,AI: Token Refresh (before expiry)

    Browser->>EntraID: Request new token (silent)
    EntraID->>Browser: New JWT token
    Browser->>Browser: Update sessionStorage
```

---

## 9. Data Security Flow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    subgraph INPUT["📥 USER INPUT"]
        Text["Text Input"]
        Photo["Photo Upload"]
        Excel["Excel Upload"]
    end

    subgraph SANITIZE["🧹 SANITIZATION (Client-Side)"]
        DOMPurify["DOMPurify<br/>• Remove scripts<br/>• Escape HTML<br/>• Validate structure"]
        FaceBlur["Face Detection<br/>• TinyFaceDetector<br/>• 25px Gaussian blur<br/>• PII protection"]
        ExcelParse["Excel Parser<br/>• Values only<br/>• No macros<br/>• No formulas"]
    end

    subgraph TRANSPORT["🔒 SECURE TRANSPORT"]
        TLS["HTTPS/TLS 1.3<br/>• AES-256-GCM<br/>• Perfect Forward Secrecy<br/>• Certificate Validation"]
    end

    subgraph BACKEND["⚙️ BACKEND SECURITY"]
        RateLimit["Rate Limiting<br/>100 req/min/user"]
        TokenValidate["JWT Validation<br/>• Signature check<br/>• Expiry check<br/>• Audience check"]
        SecretMgmt["Key Vault<br/>• Encrypted storage<br/>• RBAC access<br/>• Audit trail"]
    end

    subgraph AI_SECURITY["🤖 AI SECURITY"]
        PromptSafe["Prompt Safety<br/>• User input delimited<br/>• No instruction injection<br/>• Output validation"]
        ResponseValid["Response Validation<br/>• JSON schema check<br/>• Whitelist values<br/>• Type validation"]
    end

    subgraph OUTPUT_SEC["📤 OUTPUT SECURITY"]
        HTMLEscape["HTML Encoding<br/>• Prevent XSS<br/>• Safe rendering"]
        CSVEscape["CSV Escaping<br/>• Quote fields<br/>• Prevent injection"]
        LocalOnly["Local Storage Only<br/>• User's PC<br/>• No server retention"]
    end

    subgraph AUDIT["📝 AUDIT (Phase 2)"]
        AuditLog["Audit Logging<br/>• User ID<br/>• Timestamp<br/>• Action type<br/>• NOT content"]
        Retention["7-Year Retention<br/>• Immutable logs<br/>• Encrypted storage<br/>• Query via Log Analytics"]
    end

    Text --> DOMPurify
    Photo --> FaceBlur
    Excel --> ExcelParse

    DOMPurify --> TLS
    FaceBlur --> TLS
    ExcelParse --> TLS

    TLS --> RateLimit
    RateLimit --> TokenValidate
    TokenValidate --> SecretMgmt

    SecretMgmt --> PromptSafe
    PromptSafe --> ResponseValid

    ResponseValid --> HTMLEscape
    ResponseValid --> CSVEscape
    HTMLEscape --> LocalOnly
    CSVEscape --> LocalOnly

    TokenValidate --> AuditLog
    AuditLog --> Retention

    style INPUT fill:#e3f2fd
    style SANITIZE fill:#fff8e1
    style TRANSPORT fill:#e8f5e9
    style BACKEND fill:#e8eaf6
    style AI_SECURITY fill:#f3e5f5
    style OUTPUT_SEC fill:#fff3e0
    style AUDIT fill:#fce4ec
```

---

## Rendering Instructions

### VS Code
1. Install extension: "Markdown Preview Mermaid Support" or "Mermaid Markdown Syntax Highlighting"
2. Open this file
3. Press `Ctrl+Shift+V` to preview

### GitHub
- Mermaid diagrams render automatically in markdown files

### Online Editor
- Visit https://mermaid.live
- Paste diagram code to edit interactively

### Export to Image
1. Use https://mermaid.live
2. Paste diagram code
3. Click "Export" → PNG/SVG

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Related Document:** IT_SECURITY_REVIEW_PREPARATION.md
