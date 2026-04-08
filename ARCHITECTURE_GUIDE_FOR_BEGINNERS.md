# Architecture Diagram - Beginner's Guide
## Understanding Risk Assessment Buddy Smart 3.0 in Simple Terms

---

## Table of Contents
1. [What is This Diagram About?](#what-is-this-diagram-about)
2. [Key Concepts Explained](#key-concepts-explained)
3. [The Client Layer (Your Computer)](#the-client-layer-your-computer)
4. [Security Boundaries (Protecting Data)](#security-boundaries-protecting-data)
5. [Current State (How It Works Now)](#current-state-how-it-works-now)
6. [Future State (How It Will Work Later)](#future-state-how-it-will-work-later)
7. [Data Flow: How Information Moves](#data-flow-how-information-moves)
8. [Compliance & Audit (Keeping Records)](#compliance--audit-keeping-records)
9. [The Migration Path (Moving Forward)](#the-migration-path-moving-forward)
10. [FAQ for Non-Technical Users](#faq-for-non-technical-users)

---

## What is This Diagram About?

**Simple Answer:** This diagram shows how your Risk Assessment application works, where your data goes, and how it's protected. Think of it like a map of a city showing roads, buildings, and security checkpoints.

**Why It Matters:** 
- Your company needs to understand how the app keeps information safe
- Your IT security team needs to know all the steps data takes
- It helps plan for the future when the app grows bigger

**What You're Looking At:**
- Different colored boxes represent different parts of the system
- Lines show how information flows from one part to another
- Orange boxes = "What we have now"
- Blue boxes = "What we'll have in the future"

---

## Key Concepts Explained

### 1. **What is an "Application" or "App"?**
- A computer program you use to do a job (like Microsoft Word or Excel)
- Our app: **Risk Assessment Buddy** - helps you document workplace hazards
- It runs in a web browser (Chrome, Edge, Safari)

### 2. **What is the "Cloud"?**
- NOT a real cloud in the sky! 
- It's computer servers owned by companies, located in data centers
- Think of it like renting storage space in a warehouse instead of building your own
- Examples: Microsoft Azure, Amazon AWS, Google Cloud

### 3. **What is a "Server"?**
- A powerful computer that runs 24/7 and responds to requests
- Think of it like a restaurant waiter who takes your order and brings food
- It processes your requests and sends back results

### 4. **What is "Data"?**
- Information you enter into the app:
  - Your risk assessment results
  - Photos you upload
  - Your name and ID
  - Any other details you provide

### 5. **What is "Security"?**
- Ways to protect data from being stolen or seen by unauthorized people
- Like locks on doors, passwords, and security cameras
- Multiple layers = harder for bad people to break in

### 6. **What is "Encryption"?**
- Scrambling data so only authorized people can read it
- Like writing a secret code that only you know
- Even if someone intercepts it, they can't understand it

### 7. **What is "API"?**
- **API = Application Programming Interface**
- A way for two programs to talk to each other
- Like a menu at a restaurant - you request what you want, they give it to you
- In our case: your app requests AI help, the AI service responds

### 8. **What is "Authentication" or "SSO"?**
- **Authentication** = Proving who you are (like showing an ID card)
- **SSO (Single Sign-On)** = One login for everything (like your Goodyear badge opening all doors)
- Instead of many passwords, you have one

---

## The Client Layer (Your Computer)

**What Does "Client" Mean?**
- Your device (laptop, desktop, tablet)
- The application running in your browser
- Think of it like the customer in a restaurant

```
YOUR GOODYEAR LAPTOP (Encrypted with BitLocker)
├── Browser (Chrome/Edge)
│   ├── 📱 HTML5 SPA Interface (What You See)
│   ├── 💾 Storage Layer (Saves Your Work)
│   ├── ✓ Input Validator (Checks Your Data)
│   └── ⚙️ Client-Side Processing (Work Done On Your Device)
│       ├── 👤 Face Detection (Blurs faces in photos)
│       ├── 📄 PDF Generator (Creates PDF files)
│       └── 📊 Excel Export (Creates spreadsheets)
```

### **📱 HTML5 SPA Interface - What You See**
- **What:** The screens and buttons you interact with
- **Made From:** 
  - HTML = Structure (like skeleton of a house)
  - CSS/Tailwind = Design and layout (like paint and furniture)
  - JavaScript = Logic (like the brain making things work)
- **What You Do:** 
  - Click buttons
  - Fill in forms
  - Upload photos
  - See results

**Example Workflow:**
1. You open the app in your browser
2. You see a form with fields for "Hazard Type," "Location," "Severity"
3. You fill in the information
4. You click "Analyze"
5. The computer processes this and shows you results

---

### **💾 Storage Layer - Saving Your Work**
- **What:** Where your information is saved on your device
- **Three Types:**
  
  **a) localStorage** 
  - Saves information permanently (until you clear it manually)
  - Works even if you close and reopen the browser
  - Stores: Your preferences, recent assessments, settings
  
  **b) sessionStorage**
  - Saves only while you're using the app
  - Gets deleted when you close the browser
  - Stores: Temporary data while you're working
  
  **c) IndexedDB**
  - Like a mini database on your computer
  - Can store large amounts of data
  - Stores: Large files, assessments, images

**Why This Matters:** You can use the app even offline!

**Real-World Example:**
- You're on an airplane with no internet
- You can still open the app and fill out a risk assessment
- When you land and get internet back, your work syncs to the server

---

### **✓ Input Validator - Checking Your Data**
- **What:** A safety guard that checks everything you type
- **Why:** Prevents bad data or harmful code from entering the system
- **What It Checks:**
  - Did you spell the hazard category correctly?
  - Is the date in the right format?
  - Did you enter numbers where numbers are expected?
  - Did you enter any malicious code (hacking attempts)?

**Tool Used: DOMPurify**
- Special software that removes dangerous code
- Cleans up any risky information before it goes anywhere

**Example:**
- You paste text from the internet into the assessment form
- DOMPurify removes any hidden code that could cause problems
- You get clean, safe text only

---

### **⚙️ Client-Side Processing - Work Done On Your Device**

#### **👤 Face Detection (face-api.js)**
- **What:** Finds and recognizes faces in photos you upload
- **Why:** For security - to blur faces so people's privacy is protected
- **Process:**
  1. You upload a photo of a workplace accident
  2. The app finds all faces in the photo
  3. It blurs those faces
  4. You can now share the photo without revealing identities
- **Key Point:** The photo stays on YOUR computer - never sent to the internet!

**Libraries Used:**
- face-api.js = Face detection software
- TensorFlow.js = AI library that recognizes patterns

#### **📄 PDF Generator (PDFKit)**
- **What:** Creates downloadable PDF files
- **Why:** Lets you save and print your assessments
- **What It Does:**
  1. Takes all your assessment data
  2. Formats it nicely with headers, tables, images
  3. Creates a PDF file
  4. Downloads it to your computer
- **Example:** Your risk assessment becomes a professional-looking report

#### **📊 Excel Export (XLSX Library)**
- **What:** Creates Excel spreadsheets
- **Why:** Lets you analyze data in Excel and share with others
- **What It Does:**
  1. Takes all your assessments
  2. Converts to Excel format
  3. Creates charts and summaries
  4. You can open in Microsoft Excel and modify

**Why All This Happens On Your Computer:**
- ✅ Faster (doesn't need to wait for internet)
- ✅ More Private (photos don't leave your device)
- ✅ Works Offline (no internet needed)
- ✅ Reduces Load on Servers (servers don't do unnecessary work)

---

## Security Boundaries (Protecting Data)

**What Are "Security Boundaries"?**
- Different layers of protection around your data
- Like the walls, locks, and guards around a bank vault
- Each layer stops different types of attacks

```
🛡️ CORS POLICY
   └─ Only let specific websites talk to our servers
   └─ Blocks requests from unknown websites
   └─ Example: Only GitHub Pages and Azure can talk to our API
   
🔐 TLS 1.3 (HTTPS)
   └─ Encrypts everything you send and receive
   └─ Like a secret code between you and the server
   └─ The "S" in "HTTPS" means "Secure"
   
📋 CONTENT SECURITY POLICY (CSP)
   └─ Prevents unauthorized code from running
   └─ Blocks "cross-site scripting" attacks
   └─ Only allows scripts from approved sources
   
⏱️ RATE LIMITING
   └─ Stops too many requests from one person
   └─ Like a bouncer limiting how many people enter a club
   └─ Prevents overload and misuse
```

### **🛡️ CORS Policy - Only Friends Can Enter**
- **What:** CORS = Cross-Origin Resource Sharing
- **Translation:** "Who is allowed to access our servers?"
- **How It Works:**
  1. Your app asks: "Can I access this data?"
  2. Server checks: "Are you from an approved website?"
  3. If Yes: "Here's your data"
  4. If No: "Go away, you're not authorized"
- **Example:** Only your company's app can access your company's data

### **🔐 TLS 1.3 / HTTPS - Secret Tunnel**
- **What:** A secure communication channel
- **Simple Analogy:** 
  - Without encryption: Sending a postcard through mail (everyone can read it)
  - With encryption: Sending a locked box (only the recipient has the key)
- **What It Does:**
  - Scrambles your data before sending
  - Only the recipient can unscramble it
  - The "S" in HTTPS = Secure
- **Real-World Example:**
  - You send: "Employee John Smith at Building A has back injury"
  - With TLS 1.3: Becomes random gibberish on the internet
  - Server receives and unscrambles it
  - Nobody in between can read it

### **📋 Content Security Policy - No Unauthorized Code**
- **What:** Rules about what code can run
- **Why:** Prevents hackers from injecting malicious code
- **Example:**
  - Hacker tries to insert: `<script>steal_passwords()</script>`
  - CSP says: "That script isn't from an approved source, BLOCKED"
  - Malicious code never runs

### **⏱️ Rate Limiting - Slowing Down Attackers**
- **What:** Limits how many requests one person can make
- **How It Works:**
  - Person A: Makes 100 requests/minute = Approved
  - Bot C: Makes 10,000 requests/minute = BLOCKED
- **Why:** 
  - Protects against automated attacks
  - Prevents servers from getting overloaded
  - Saves money on computing costs

---

## Current State (How It Works Now)

**Timeline:** Right Now (January 2026)

```
YOUR APP (GitHub Pages)
         ↓ (Secure HTTPS Connection)
    API GATEWAY (Vercel)
         ↓ (Request Routing)
    EXPRESS SERVER
         ↓ (Validates & Processes)
    OPENROUTER API (Third-Party AI)
         ↓ (Generates Tasks)
    Response back to Your App
```

### **🌐 Edge Layer (Vercel)**

**What is Vercel?**
- A company that hosts web applications
- Like renting space on a giant server in the cloud
- Your app runs there 24/7

**What It Does:**
1. **API Gateway:** 
   - First stop for all requests
   - Decides where to send them
   - Like a mail sorting facility
   
2. **Middleware Stack:**
   - Checks requests for problems
   - Validates your authentication token
   - Logs what happens
   - Like a security checkpoint
   
3. **Session Manager:**
   - Keeps track of who you are
   - Uses JWT tokens (digital ID cards)
   - Knows if you're still logged in
   - Works across requests

**Real Example:**
1. You click "Analyze Hazard"
2. Vercel receives the request
3. Middleware checks: "Is this person authorized?"
4. Session Manager confirms: "Yes, this is John Smith"
5. Request continues to Express Server

---

### **🖥️ Backend Services - The Brain**

#### **Express.js Server**
- **What:** The application running on Vercel
- **What It Does:**
  - Receives your requests
  - Validates the information
  - Calls the AI service
  - Sends you back results
- **Why Separate:** 
  - Protects your API keys (not visible in your browser)
  - Can do processing that's too heavy for browsers
  - Can access external services securely

#### **Error Handler**
- **What:** Catches problems
- **Sends Back:**
  - Status codes (like 200 = success, 404 = not found, 500 = server error)
  - Error messages telling you what went wrong
- **Example:** 
  - If AI service is down: "Error 503 - Service Unavailable"
  - If you forgot required info: "Error 400 - Missing required fields"

#### **Local Logger**
- **What:** Records everything that happens
- **What It Logs:**
  - Every request received
  - Every response sent
  - All errors
  - Timestamps
- **Why:** 
  - Helps debug problems
  - Creates audit trail
  - Helps understand system behavior

---

### **🤖 External Services - OpenRouter API**

**What is OpenRouter?**
- A company that provides access to many AI models
- Like a taxi service - you don't own the car, but you can use it
- Aggregates: Mistral, Claude, GPT, and others

**Models Available:**
- Mistral-7b: Fast, free tier
- Claude: Powerful, good reasoning
- GPT: Versatile, expensive

**What It Does:**
- You send: "Generate safety tasks for a warehouse"
- It processes: Using AI algorithms
- You get back: A JSON response with structured tasks

**JSON Response Example:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Inspect fire extinguishers",
      "priority": "High",
      "category": "Fire Safety"
    },
    {
      "id": 2,
      "title": "Check emergency exit signs",
      "priority": "High",
      "category": "Emergency Procedures"
    }
  ]
}
```

---

### **📦 Data Storage - Current State**

#### **📋 Legal Registry JSON**
- **What:** A file containing regulations and standards
- **Format:** JSON (structured text format)
- **Regions:** US (OSHA), UK (HSE), UAE, Luxembourg
- **Contains:**
  - Regulation titles and IDs
  - Hazard categories it applies to
  - Specific requirements
  - Reference links
  - Penalties for non-compliance

**Example Entry:**
```json
{
  "id": "OSHA_1910.132",
  "title": "Personal Protective Equipment (PPE)",
  "hazardCategories": ["Workplace Infrastructure", "Physical health"],
  "requirements": [
    "Employers must provide appropriate PPE",
    "Employees must wear PPE when required",
    "PPE must be properly maintained"
  ],
  "penalties": "$7,000 - $15,000 per violation",
  "version": "1.0"
}
```

#### **💾 Client-Side Storage (localStorage)**
- **What:** Your assessment results stored on your computer
- **Stored Items:**
  - Completed risk assessments
  - User preferences
  - Temporary work in progress
  - Audit trail of actions
- **Privacy:** Lives only on your computer, unless you export it

---

## Future State (How It Will Work Later)

**Timeline:** Q2 2026 (About 6 months from now)

**Big Changes:**
- Move from Vercel to Microsoft Azure (more secure for enterprise)
- Add Microsoft Entra ID (company single sign-on)
- Move from OpenRouter to Azure OpenAI (more control)
- Add real database (SQL Server)
- Add audit logging (for compliance)

---

### **🔐 Microsoft Entra ID (Azure AD) - Company Login**

**What is Entra ID?**
- Microsoft's identity and access management system
- Your company already uses it! (probably for email, Office 365)
- One password for everything (SSO)

**What It Provides:**

#### **SSO Integration**
- **Before:** 
  - Login to Risk Assessment app with separate username/password
  - Another password to remember
  
- **After:** 
  - Click "Login with Goodyear"
  - Redirects to your company login
  - Automatic access to Risk Assessment app
  - No new password needed!

#### **OAuth 2.0 + OIDC**
- **OAuth 2.0:** The protocol that enables secure login
- **OIDC:** OpenID Connect - verifies your identity
- **What They Do:** Create and exchange secure tokens (digital ID cards)

#### **MFA Support**
- **MFA = Multi-Factor Authentication**
- **Current:** Username + Password (1 factor)
- **Future:** Username + Password + Phone Approval (2+ factors)
- **Process:**
  1. You enter username and password
  2. App sends code to your phone
  3. You enter the code
  4. Now you're truly verified to be you
- **Why:** Much harder for hackers to break in

#### **Token Service - Digital ID Cards**
- **What:** Creates digital proof of who you are
- **JWT Token:** A special encoded string that says:
  - "This is John Smith"
  - "From Sales Department"
  - "Valid until 3 PM today"
  - "Signed by Entra ID"
- **How It Works:**
  1. You login successfully
  2. Entra ID creates a JWT token
  3. You carry this token in every request
  4. Servers verify: "Is this token real? Haven't expired?"
  5. Access granted or denied

#### **Token Refresh**
- **What:** Getting a new ID card when yours expires
- **Process:**
  - Your token expires after 1 hour
  - App automatically gets a new one
  - You never have to re-login
  - Seamless experience

#### **Audit Logging**
- **What:** Tracking all login activity
- **Records:**
  - Who logged in and when
  - From which device/IP address
  - Failed login attempts
  - When they logged out
- **Why:** 
  - Security compliance
  - Detect unauthorized access
  - Track suspicious behavior

---

### **☁️ Azure Infrastructure - The Cloud Home**

#### **🛡️ API Management Gateway**
- **What:** Microsoft Azure's request router
- **What It Does:**
  - All requests go through here first
  - Applies consistent policies
  - Limits rate of requests
  - Logs everything
  - Transforms requests/responses

**Features:**
1. **Rate Limiting:**
   - Employee: Max 100 requests/minute (reasonable)
   - Bot: 10,000 requests/minute (BLOCKED - suspicious)
   
2. **Request Throttling:**
   - If server gets overloaded, slow down incoming requests
   - Like a traffic light during rush hour
   
3. **Usage Analytics:**
   - How many API calls per day?
   - Who uses it most?
   - What endpoints are most popular?
   - Help plan for growth

#### **💻 App Service - Your Application**
- **What:** Where your application runs in Azure
- **What It Does:**
  - Runs Node.js (same as current)
  - But in Microsoft's data centers
  - More secure, more reliable

**Features:**
1. **Node.js Runtime:**
   - Same code as Vercel
   - Just running on Azure instead
   
2. **Auto-Scaling:**
   - More users = More servers automatically start
   - Fewer users = Some servers shut down
   - Saves money and keeps speed consistent
   
3. **Health Checks:**
   - Constantly monitors: "Is the app still running?"
   - If it crashes, automatically restarts
   - 99.99% uptime guarantee

#### **🔑 Key Vault - Secret Lockbox**
- **What:** Microsoft's secure storage for secrets
- **Secrets Stored:**
  - API keys for Azure OpenAI
  - Database connection strings
  - Certificates
  - Any sensitive information
- **How It's Different:**
  - Not in code (like current situation)
  - Not in environment variables (less secure)
  - In Microsoft's secure vault with encryption
- **Access Process:**
  1. App Service needs an API key
  2. Asks Key Vault: "May I have the OpenAI API key?"
  3. Key Vault checks: "Are you allowed? Yes"
  4. Returns the key (encrypted)
  5. Uses the key, returns it immediately
  
**Benefits:**
- ✅ No accidental key leaks in code
- ✅ Keys rotate automatically
- ✅ Audit trail of who accessed what
- ✅ Revoke access instantly if compromised

---

### **🤖 Azure OpenAI - Powerful AI**

**What is Azure OpenAI?**
- Microsoft's version of OpenAI services
- Same technology as ChatGPT, but hosted on Azure
- Your company controls it completely
- Private - data doesn't go to OpenAI servers

**Models Available:**
- GPT-4: Most powerful, most expensive, best reasoning
- GPT-3.5: Cheaper, still very good
- Both are better than Mistral for complex tasks

**Capabilities:**
- Generate safety tasks
- Analyze hazard descriptions
- Create compliance reports
- Answer questions about regulations

**Example Request:**
```
Input: "Warehouse with stacks 10 feet high, no barriers"
Output: 
{
  "primary_hazard": "Fall from Height",
  "secondary_hazards": ["Struck by Object", "Crush Hazard"],
  "osha_standards": ["1910.24", "1910.132"],
  "recommended_controls": ["Barriers", "PPE", "Training"]
}
```

---

### **📊 Azure Storage - The Database**

**What Changed:**
- Current: JSON file (readable text)
- Future: Structured database (organized, secure)

#### **SQL Database**
- **What:** Organized data storage
- **Like:** Excel spreadsheets but much more powerful
- **Contains:**
  - Assessment Records: Every assessment ever done
  - User Profiles: Name, role, department
  - Session Data: Current login info
  
**Why Better:**
- Fast queries (find something instantly)
- Secure (encrypted, backed up)
- Multi-user (many people can use simultaneously)
- Version control (track changes over time)

**7-Year Retention:**
- OSHA requires keeping records 7 years
- Database automatically archives old records
- Can be retrieved for audits

#### **Blob Storage**
- **What:** Storage for large files
- **Stores:**
  - PDF exports you generate
  - Excel reports
  - Photos from assessments
  - Archived assessments
  
**Why Separate:**
- SQL Database is for structured data (tables)
- Blob Storage is for files
- Each optimized for its job

#### **Table Storage**
- **What:** Quick storage for logs
- **Stores:**
  - Audit logs (who did what when)
  - Event history (all changes)
  - Quick lookup
  
**Example Entry:**
```
Timestamp: 2026-01-16 14:30:45
User: John.Smith@goodyear.com
Action: ASSESSMENT_CREATED
Assessment_ID: ASS-2026-0001
Location: Building A
Status: SUCCESS
```

---

### **📊 Monitoring & Logging - Watching the System**

#### **📈 Application Insights**
- **What:** Microsoft's monitoring service
- **Watches:**
  - How fast the app responds (performance)
  - Which features are used most
  - What errors happen
  - Where connections go (dependency mapping)

**Real-Time Dashboards Show:**
- Server response time: 200ms (good!)
- Error rate: 0.05% (excellent)
- Users online now: 47
- API calls per minute: 340

**Alerts Set Up:**
- If response time > 2 seconds: Alert
- If error rate > 1%: Alert
- If anyone accesses after midnight: Alert

#### **📝 Log Analytics**
- **What:** Microsoft's log search and analysis
- **What You Can Do:**
  1. **Query:** "Show me all login failures from today"
  2. **Analyze:** "When did the most errors occur?"
  3. **Alert:** "If error rate exceeds 1%, notify the team"
  4. **Report:** "Generate compliance report showing who accessed what"

**Example Report:**
```
Compliance Report - Week of Jan 16, 2026
- Total assessments: 247
- Assessments by region: US (120), UK (87), UAE (40)
- Users with access: 34
- Failed login attempts: 2
- Data exported: 5 reports
```

---

## Data Flow: How Information Moves

**Think of It Like Water Through Pipes**
- Different paths for different types of requests
- Filters and checkpoints along the way
- Always flows in secure channels

### **REQUEST FLOW - Getting Information**

```
YOU (Your Computer)
   ↓ Click "Analyze This Hazard"
   ↓
YOUR BROWSER
   ↓ Validates your input
   ↓ Checks: "Is all required info present?"
   ↓
SECURITY CHECKPOINT
   ↓ TLS 1.3 encryption
   ↓ CORS verification
   ↓ Rate limit check
   ↓
VERCEL API GATEWAY (Current) or AZURE API MANAGEMENT (Future)
   ↓ Routes the request
   ↓ Logs the request
   ↓
EXPRESS SERVER (Current) or APP SERVICE (Future)
   ↓ Receives: { hazard_type: "Fall", severity: "High" }
   ↓ Validates: "Is severity a valid option?"
   ↓
OPENROUTER (Current) or AZURE OPENAI (Future)
   ↓ Processes request with AI
   ↓ Generates: "Top 5 safety tasks for fall prevention"
   ↓
RESPONSE BACK
   ↓ Server formats response as JSON
   ↓ Encrypts with TLS 1.3
   ↓
YOUR BROWSER
   ↓ Receives encrypted response
   ↓ Decrypts it
   ↓ Shows you the results
   ↓
YOU SEE
   ✓ "Task 1: Install guardrails"
   ✓ "Task 2: Provide safety training"
   ✓ etc.
```

**Time This Takes:** Usually less than 3 seconds!

---

### **AI TASK GENERATION FLOW**

```
1. INPUT VALIDATION
   You type: "Slippery floor in kitchen"
   App checks: "Is this a valid hazard? Is location filled in?"
   ✓ Valid → Continue
   ✗ Invalid → Show error, ask to fix

2. PROMPT ENGINEERING
   App creates a detailed request for AI:
   "Hazard: Slippery floor
    Location: Kitchen
    Industry: Food Service
    Generate 5 specific safety tasks"

3. API CALL
   Sends to OpenAI or Azure OpenAI:
   POST /completions
   Body: { prompt: "...", model: "GPT-3.5" }

4. AI PROCESSING
   AI model analyzes and generates:
   - Task 1: Non-slip mat installation
   - Task 2: Regular floor inspection schedule
   - Task 3: Spill cleanup procedures
   - Task 4: Employee training
   - Task 5: Incident reporting system

5. RESULT PROCESSING
   App receives response:
   - Parses JSON
   - Validates fields
   - Sanitizes text with DOMPurify
   - Stores in localStorage

6. USER SEES RESULTS
   Beautiful formatted task list appears
```

---

### **EXPORT FLOW - Saving Your Work**

```
YOU click "Export as PDF"
   ↓
DATA RETRIEVAL
   App gathers all assessment data:
   - Assessment header (date, location, assessor)
   - Hazard descriptions
   - Generated tasks
   - Associated images
   ↓
FORMAT
   Organizes data into report format:
   - Title page
   - Executive summary
   - Detailed hazard analysis
   - Task list
   - Appendices
   ↓
GENERATE
   PDFKit library creates PDF file:
   - Formats text
   - Embeds images (with blurred faces)
   - Adds page numbers
   - Creates table of contents
   ↓
DOWNLOAD
   PDF saved to your Downloads folder
   File name: "RA_2026-01-16_Building-A.pdf"
   ↓
YOU GET
   Professional PDF report ready to:
   - Print
   - Email to team
   - Archive for compliance
```

---

### **AUDIT FLOW - Tracking Everything**

```
USER DOES SOMETHING (e.g., Creates Assessment)
   ↓
ACTION CAPTURE
   App records:
   - What: Assessment Created
   - Who: John.Smith@goodyear.com
   - When: 2026-01-16 14:30:45
   - Where: API /assessments endpoint
   - What data: Assessment_ID, Location, Hazard_Type
   ↓
SANITIZE
   Remove sensitive details:
   - Photos → Remove
   - Exact PII → Hash
   - Keep: Action, user, timestamp, general info
   ↓
STORE
   Write to audit log:
   - Current: In local logging (Vercel)
   - Future: In Azure Table Storage (immutable)
   ↓
QUERY & REPORT
   Later, compliance team asks:
   "Show me who created assessments in Building A in January"
   Log Analytics runs query:
   SELECT * FROM AuditLog 
   WHERE Location = "Building A" 
   AND Month = "January"
   ↓
COMPLIANCE REPORT
   Generated automatically:
   - 47 assessments created
   - By 12 different employees
   - Top risks identified
   - Actions taken
```

---

## Compliance & Audit (Keeping Records)

**Why This Matters:**
- OSHA requires records for 7 years
- Regulatory audits need proof of work
- Legal requirements for data protection (GDPR)
- Company governance and risk management

### **📊 Audit Trail**
- **What:** Complete record of everything
- **Records:**
  - User actions (who did what when)
  - API calls (requests and responses)
  - Data changes (who modified what)
  - Timestamps (exact times)
  - IP addresses (where from)

**Example Audit Log Entry:**
```
DateTime: 2026-01-16 14:30:45
User: john.smith@goodyear.com
Action: CREATE_ASSESSMENT
ResourceType: Assessment
ResourceID: ASS-2026-0001234
Status: SUCCESS
Changes: Created assessment for Building A, Warehouse
IPAddress: 192.168.1.100
UserRole: Safety Engineer
```

### **✓ Compliance Tracking**
- **GDPR (European Privacy Laws):**
  - Right to access your data
  - Right to delete your data
  - Right to data portability
  - App supports all these
  
- **Data Retention:**
  - How long to keep data
  - When to delete old data
  - Archival procedures
  
- **Export Requests:**
  - User can request all their data
  - System generates ZIP file
  - Contains all assessments, photos, results

**Example Export Package:**
```
john.smith_export_2026-01-16.zip
├── personal_data.json
├── assessments/
│   ├── ASS-001_2025-06-15.json
│   ├── ASS-002_2025-07-22.json
│   └── ASS-003_2025-11-03.json
├── photos/
│   ├── ASS-001_photo1.jpg
│   └── ASS-001_photo2.jpg
└── exports/
    └── Report_2025-Q2.pdf
```

### **📈 Usage Analytics**
- **API Call Volume:**
  - Day 1: 340 calls
  - Day 2: 428 calls
  - Growing trend
  
- **Storage Usage:**
  - Assessments: 2.3 GB
  - Photos: 5.1 GB
  - Total: 7.4 GB
  - Trend: +0.5 GB per week
  
- **Cost Tracking:**
  - Azure compute: $120/month
  - API calls: $45/month
  - Storage: $25/month
  - Total: $190/month

**Why Track This:**
- Budget planning
- Capacity planning (do we need more servers?)
- Anomaly detection (sudden spike = problem?)
- Resource optimization

---

## The Migration Path (Moving Forward)

**Timeline:**

### **Phase 0 - NOW (January 2026)**
**Status:** Current deployment on Vercel

**What You Have:**
- ✅ Working Risk Assessment app
- ✅ AI task generation
- ✅ Legal registry
- ✅ PDF/Excel export
- ✅ Basic security

**What's Missing:**
- ❌ Single sign-on (separate login)
- ❌ Audit logging (not tracking everything)
- ❌ Database (just JSON files)
- ❌ MFA (two-factor authentication)

---

### **Phase 1 - WEEKS 1-4 (January-February 2026)**
**Status:** Pilot with current technology, add monitoring

**What You'll Get:**
- ✅ Enhanced logging (more details recorded)
- ✅ Monitoring (watch for problems)
- ✅ Automated legal database updates
- ✅ Usage tracking (who uses what)
- ✅ Basic audit trail (limited)

**How It Works:**
- Still using Vercel and OpenRouter
- But now recording everything
- Can see problems before they happen
- Ready for bigger usage

**Example:** You can now answer:
- "How many assessments created this week?"
- "Which hazard types are most common?"
- "Are there any errors in the system?"
- "What's our API usage trend?"

---

### **Phase 2 - Q2 2026 (April-June 2026)**
**Status:** Full migration to Azure with Entra ID

**Major Changes:**
1. **Authentication:**
   - Old: Separate login for app
   - New: One click with your Goodyear ID
   
2. **Infrastructure:**
   - Old: Vercel
   - New: Azure App Service (Microsoft cloud)
   
3. **AI:**
   - Old: OpenRouter (third-party)
   - New: Azure OpenAI (your company's)
   
4. **Database:**
   - Old: JSON files
   - New: SQL Server (proper database)
   
5. **Logging:**
   - Old: Local logs
   - New: Azure Log Analytics (enterprise-grade)

**User Experience:**
- Faster loading
- More secure
- Compliant with company policies
- Better performance during peak times

**For Employees:**
- Login with Goodyear badge
- Seamless experience
- MFA adds extra security
- Faster response times

---

### **Phase 3 - Q3 2026 (July-September 2026)**
**Status:** Full enterprise deployment with RBAC

**Advanced Features:**
1. **Role-Based Access Control (RBAC):**
   - Safety Engineer role: Full access to create/edit
   - Manager role: Can view and approve
   - Admin role: Can manage users
   - Auditor role: Can view only
   
2. **Integration:**
   - SharePoint: Export assessments to company cloud
   - Teams: Notifications about critical hazards
   - Exchange: Email alerts
   
3. **Governance:**
   - Data retention policies enforced
   - Compliance reports automated
   - Risk dashboard for executives
   
4. **Advanced Security:**
   - IP whitelisting (only company networks)
   - Advanced threat protection
   - DLP (Data Loss Prevention)
   - Encryption at rest and in transit

---

## FAQ for Non-Technical Users

### **Q: Is my data safe?**
**A:** Yes, multiple ways:
- Encrypted in transit (TLS 1.3)
- Your photos stay on your computer (face detection local)
- API keys not visible anywhere
- Audit trail tracks all access
- Future: Encryption at rest in database

### **Q: What happens if the internet goes out?**
**A:** 
- You can still use the app offline
- Create assessments
- Take photos
- Generate PDFs
- When internet comes back, data syncs automatically

### **Q: Who can see my assessments?**
**A:** 
- You (creator)
- Your manager (if shared)
- Compliance/audit team (if required)
- Not third-party companies
- Not visible on internet

### **Q: How much does this cost?**
**A:**
- Employees: FREE (employer pays)
- Current setup: ~$100-150/month
- Future Azure setup: ~$180-250/month
- Very cheap per user for enterprise

### **Q: What if I make a mistake?**
**A:**
- You can delete assessments
- Audit log still records deletion (for compliance)
- IT admin can recover from backup
- Future: Version history to restore previous versions

### **Q: How often is the app updated?**
**A:**
- Vercel: Can update instantly, often without downtime
- Azure: Can schedule updates
- You see improvements, not downtime

### **Q: What about privacy?**
**A:**
- Your photos stay on your computer
- Personal info encrypted
- You can export all your data anytime
- You can request deletion (with legal restrictions)
- Complies with GDPR

### **Q: Can I share assessments?**
**A:**
- Export PDF: Works today
- Export Excel: Works today
- Share link: Coming in Phase 2
- Permission controls: Coming in Phase 3

### **Q: How do I get my data if you shut down?**
**A:**
- Export all assessments as PDF/Excel
- Can download raw data as JSON
- Export at any time
- No lock-in

### **Q: Is this like Slack or Teams?**
**A:**
- Similar: Web-based app
- Different: Specialized for risk assessments
- Similar: Works offline sometimes
- Different: More secure for sensitive data

### **Q: Do I need training?**
**A:**
- Basic use: Very intuitive
- Advanced: Optional training
- Help videos: Available
- Documentation: Available

### **Q: What if there's a bug?**
**A:**
- Report to IT support
- They tell development team
- Fixed in next update
- Critical bugs: Fixed same day
- Regular bugs: Fixed within week

### **Q: Will I lose my work?**
**A:**
- Auto-saved constantly
- Multiple backups
- Data recovery available
- Virtually no risk of loss

### **Q: Can I use it on my phone?**
**A:**
- Current: Limited support
- Future: Full mobile app coming
- Can use browser on phone now
- Works better on computer for now

---

## Summary: The Big Picture

**What This App Does:**
```
You Fill In Hazard Info
         ↓
App Analyzes with AI
         ↓
AI Generates Safety Tasks
         ↓
You Create Report
         ↓
Export for Team/Compliance
```

**How It Stays Secure:**
```
Encryption        (scrambles data)
      +
Authentication    (proves who you are)
      +
Validation        (checks everything)
      +
Audit Trail       (records everything)
      +
Compliance Rules  (follows laws)
      =
SAFE SYSTEM
```

**The Journey:**
```
TODAY (Phase 0)
├─ Works!
├─ Basic security
└─ Room to improve

WEEKS 1-4 (Phase 1)
├─ More monitoring
├─ Better tracking
└─ Ready for pilot

6 MONTHS (Phase 2)
├─ Azure cloud
├─ SSO login
└─ Enterprise-ready

9 MONTHS (Phase 3)
├─ Full rollout
├─ Advanced features
└─ Governed system
```

---

## Next Steps

**For Non-Technical Users:**
1. ✅ You've read and understood this guide
2. Ask questions about anything unclear
3. Help test the app (Phase 1)
4. Provide feedback

**For IT/Compliance:**
1. Review security architecture
2. Validate compliance requirements
3. Approve Phase 1 pilot
4. Plan Phase 2 migration

**For Developers:**
1. Implement Azure migration
2. Add Entra ID authentication
3. Deploy to Azure App Service
4. Set up monitoring and logging

---

**Questions?** 

Ask your manager or IT support. This is new technology, so it's normal to have questions!

