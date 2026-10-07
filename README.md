# Nirman — Evidence-Based Career & Hiring Intelligence

Nirman is an evidence-based **Career & Hiring Intelligence** platform built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and deterministic scoring algorithms.

The product is **NOT** a chatbot, **NOT** a resume builder, and **NOT** a black-box AI assistant.

---

## 🏛 Core Architectural Principle

```
REAL INPUT (Job Descriptions / Resumes)
       ↓
AI STRUCTURED EXTRACTION (Local Open-Weight / Offline Extractor)
       ↓
STRUCTURED DATA SCHEMAS
       ↓
CANONICAL NORMALIZATION (Skills, Titles, Dates)
       ↓
RETRIEVAL / MARKET EVIDENCE (Job Postings Repository)
       ↓
DETERMINISTIC MATCHING & SCORING (Mathematical Weighted Engine)
       ↓
DETERMINISTIC ROUTING (Strong Match / Review / Needs Verification)
       ↓
EXPLAINABLE RESULT (Citations & Requirement Matrix)
       ↓
HUMAN DECISION (Recruiter Shortlist / Hold / Not Recommended)
```

**Key Rule**: LLMs are never used to make final hiring decisions or calculate percentages. AI only structures and extracts data. Application logic deterministically computes all match scores and requirement alignments.

---

## 🎯 Hackathon AI Architecture Mapping

The platform demonstrates all 6 meaningful forms of AI usage defined by the organizer across one unified recruitment workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 01. STRUCTURED EXTRACTION                                                   │
│ Location: /lib/ai/ (schemas.ts, mock-provider.ts, ollama-provider.ts)       │
│ Function: Unstructured job descriptions and candidate resumes are parsed    │
│           into strictly validated JSON schemas (StructuredJobRequirements,  │
│           CandidateProfile) consumed downstream by application code.        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 02. DECISION / ROUTING LOGIC                                                │
│ Location: /lib/routing/ (index.ts)                                          │
│ Function: Application logic deterministically classifies candidate records  │
│           into actionable recruiter queues (STRONG_MATCH, REVIEW,           │
│           NEEDS_VERIFICATION) based on score, coverage, and evidence depth. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 03. TOOL / FUNCTION CALLING                                                 │
│ Location: /lib/tools/ (index.ts)                                            │
│ Function: Internal tool registry exposing deterministic utilities:          │
│           normalize_skill(), calculate_experience(),                        │
│           retrieve_market_requirements(), search_skill_taxonomy().          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 04. MULTI-STEP PIPELINE                                                     │
│ Location: /lib/pipeline/ (index.ts)                                         │
│ Function: Unstructured Input → AI Extraction → Canonical Normalization →    │
│           RAG Grounding → Matching → Deterministic Scoring → Routing.       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 05. RAG / RETRIEVAL-GROUNDED REASONING                                      │
│ Location: /lib/retrieval/ (index.ts)                                        │
│ Function: Market requirements and candidate evaluations are grounded        │
│           against retrieved structured job postings (JobPosting, Company). │
├─────────────────────────────────────────────────────────────────────────────┤
│ 06. DATA TRANSFORMATION AT SCALE (BATCH PROCESSING)                         │
│ Location: /lib/batch/ (index.ts)                                            │
│ Function: Manages screening runs (ScreeningRun, CandidateProcessingJob)     │
│           processing 10 to 200+ resumes independently and aggregating       │
│           deterministic scores into an explainable shortlist.               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Database Sync
```bash
npx prisma generate
npx prisma db push
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Structure

```
/app
  /(dashboard)
    /dashboard            # Main dashboard overview
    /career-intelligence  # Role intelligence & market demand
      /[role]             # Dynamic role & skill gap view
    /recruitment          # Screening workspace
      /new                # 4-step structured extraction & screening workflow
      /[jobId]            # Job screening candidate table & weight tuning
        /candidate/[id]   # Candidate detail with requirement citations
    /candidates           # Global candidate pool
    /insights             # Observed company requirements
    /settings             # AI provider & default scoring weights
  /layout.tsx
  /page.tsx               # Restrained B2B SaaS landing page
  /globals.css

/components
  /layout
    /AppShell.tsx         # Persistent 240px sidebar & header shell
  /ui
    /WorkflowStatus.tsx   # Reusable pipeline stage progress component
    /Button.tsx, /Badge.tsx, /Card.tsx, /Input.tsx, /Progress.tsx
  /recruitment
    /CandidateTable.tsx   # Candidate table with sorting, filters, and status badges
    /CandidateDetailView.tsx # Requirement comparison & citation inspector
    /NewScreeningWorkflow.tsx # 4-step extraction, review, and screening pipeline
  /career
    /RoleSelector.tsx     # Role cards
    /MarketRequirementsView.tsx # Distribution charts & gap analysis

/lib
  /ai
    /provider.ts          # AIProvider base interface & factory
    /schemas.ts           # Strongly typed schemas & validator
    /mock-provider.ts     # High-fidelity offline pattern extractor
    /ollama-provider.ts   # Local Ollama open-weight integration
    /prompts/             # Structured JSON prompts
  /matching
    /index.ts             # Deterministic CandidateMatch evaluator
  /routing
    /index.ts             # Deterministic queue classifier (STRONG_MATCH / REVIEW)
  /tools
    /index.ts             # Internal tool registry & deterministic handlers
  /retrieval
    /index.ts             # RAG retrieval module for job postings & market data
  /batch
    /index.ts             # Scalable batch processing queue architecture
  /pipeline
    /index.ts             # Multi-step coordinator
  /scoring
    /index.ts             # Deterministic scoring engine (Skills, Exp, Preferred, Evidence)
  /normalization
    /skills.ts            # Canonical taxonomy mapper & alias resolver
  /data
    /sample-data.ts       # Rich verified sample dataset
  /store
    /screening-store.ts   # Client/Server reactive state store
  /tests
    /engine.test.ts       # Automated unit test suite

/prisma
  /schema.prisma          # PostgreSQL / SQLite relational data schema
  /seed.js                # Database initialization script
```

---

## 🤖 Zero Proprietary AI Lock-In

Nirman uses zero proprietary cloud LLM APIs (no OpenAI, Anthropic, Gemini). It features an extensible `AIProvider` interface supporting:
1. **Local Offline Pattern & Keyword Extractor**: Instant, 100% offline, zero latency.
2. **Ollama Open-Weight Models**: Direct local HTTP integration with `llama3.2`, `mistral`, `gemma2`, or `qwen2.5`.

---

## ⚖️ Deterministic Scoring Engine

Scores are computed in [`lib/scoring/index.ts`](file:///Users/rashmin/Documents/nirmaan/lib/scoring/index.ts):

* **Required Skills (50%)**: Exact match against required technical capabilities.
* **Experience Duration (25%)**: Mathematical ratio of verified candidate years to minimum role years.
* **Preferred Skills (15%)**: Bonus points for nice-to-have capabilities.
* **Evidence Quality (10%)**: Verification of concrete project artifacts and documented timeline entries.

Every evaluated claim is backed by a **cited excerpt** from the source document.
