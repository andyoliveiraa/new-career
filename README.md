# 💼 New Career — Intelligent Job Platform & AI Career Ops

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Unslop-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**New Career** is a multi-user platform for intelligent job aggregation, real-time availability verification (*liveness check*), zero-hallucination ATS resume tailoring, and active application pipeline management.

The project combines the speed and resilience of asynchronous monitoring from [**V2-BOT_EMPREGO**](https://github.com/andyoliveiraa/V2-BOT_EMPREGO) and the evaluation and liveness rigor of [**career-ops**](https://github.com/career-ops-hq/career-ops), with a high-craft productivity interface built under [**Unslop**](.agents/skills/unslop/SKILL.md) design standards.

Designed for both **local** execution and remote hosting on a **VPS (Linux / Docker)** with full multi-tenant user isolation and **7 interface languages** (English, Portuguese, German, Spanish, Simplified Chinese, Arabic with RTL, and Korean).

---

## ✨ Key Features

### 1. 👥 Multi-User Architecture, i18n & Secure Authentication
- **JWT Session Management & Cryptographic Hashing**:
  - Salted password hashing via `PBKDF2-HMAC-SHA256`.
  - Authenticated sessions with JWT tokens (`PyJWT`) and credential rotation.
- **Multi-Tenant Data Isolation**:
  - Each user has a strictly isolated partition in **Firebase Firestore** (`users/{user_id}/profile`, `jobs`, `applications`, `scan_history`, `cv_templates`, `settings`).
  - Different users operate 100% privately and independently.
- **Multilingual UI & Per-User Language Persistence**:
  - Supports **English** (default on Sign In & Sign Up), **Portuguese**, **German**, **Spanish**, **Mandarin Chinese**, **Arabic (RTL)**, and **Korean**.
  - Users choose their preferred language during registration (`preferred_language`) and can update it anytime from the navbar or Settings.
- **Dedicated Unslop Auth Views**:
  - Clean **Sign In** and **Sign Up** screens with ergonomic typography, a calm neutral ramp, and real-time validation.

### 2. 📦 Career-Ops Onboarding with VPS Support
Enables instant migration for existing Career-Ops users and works seamlessly on remote servers (VPS):
- **Privacy Mode (File-by-File Upload)**:
  - 📝 **`cv.md`** (root) ➔ **Master Base CV** used as the foundation for all AI customizations.
  - 📄 **`config/profile.yml`** ➔ Personal profile, skills, and verified facts.
  - 📊 **`data/applications.md`** ➔ History of submitted jobs, fit scores, and notes.
  - 📑 **`output.zip`** ➔ Compress only the `output/` folder of PDFs for secure upload.
- **Fast Mode (Full Folder ZIP)**:
  - Drag-and-drop your entire Career-Ops folder compressed as `.zip`. The VPS server unpacks it in a secure sandbox with *Zip Slip* protection, locates the files, and indexes everything automatically.
- **Manual Mode (Start from Scratch)**:
  - Quick setup for new users without prior history.

### 3. 🚀 Multi-Source Scraping Engine
- **Net-Empregos (Portugal)**: Native dedicated scraper supporting categories, districts/cities, sorting, and full job description extraction with `iso-8859-1` decoding.
- **Career-Ops ATS Portals**: Direct queries to major tech companies' public job boards (Greenhouse, Lever, Ashby, Workday).
- **Google Jobs**: Aggregation with smart fallbacks (SerpApi, JSearch).
- **JobSpy Engine**: Aggregated scraping across LinkedIn, Indeed, Glassdoor, and ZipRecruiter.
- **Duplicate Prevention**: Deterministic job hashing so listings are never duplicated.
- **Geographic Filter**: Physical distance calculation in km via OpenStreetMap Nominatim and the Haversine formula.

### 4. 🟢 Real-Time Availability Check (Liveness Engine)
- **Zero-Token Layer**: Direct queries to public ATS JSON endpoints for instant closure checks without spending AI quotas or launching heavy browsers.
- **Headless / HTTP Layer**: Inspection of closing markers ("job closed", "applications closed", "404 Not Found").
- Immediate status badges: **Active**, **Expired**, or **Check**.

### 5. 🎨 Modular CV Builder & Real-Time ATS Audit
- **Multiple Saved CV Templates**:
  - Create, duplicate, and switch between multiple CV templates (e.g., *Classic ATS*, *Modern Executive*, *Tech Minimalist*, *Compact Symmetrical*).
  - Set a default template automatically used when tailoring applications.
- **Interactive Block Builder**:
  - Reorder sections (Summary, Skills, Work Experience, Education, Projects, Certifications, Languages) with arrow controls.
  - Show or hide any block individually in one click.
- **Full Color & Google Fonts Freedom**:
  - Pick any color using `<input type="color">`, custom HEX values, or curated presets.
  - **Google Fonts** typography: choose from popular options (Inter, Roboto, DM Sans, Plus Jakarta Sans, Outfit, Space Grotesk, Poppins, Montserrat, Lora, Merriweather) or enter **any font from the Google Fonts library** with dynamic loading.
  - Optional photo (circular/rounded via URL or data URI) with automatic EEOC anti-discrimination compliance notice.
- **Real-Time ATS Auditor (Score 0 to 100)**:
  - Continuous compatibility evaluation against corporate ATS systems (Taleo, Workday, Greenhouse, Lever).
  - Checks essential contact details, skill density, quantified metrics in bullet points, and layout safety.
  - Instant alerts and pass/warning checklist with **Golden CV Tips** (Google XYZ formula, 6-second recruiter rule, etc.).

### 6. 🎯 AI Career Studio & Zero-Hallucination CV Tailoring
- **Template Selection**: Choose which CV design template to use when tailoring your resume for a specific job.
- **Fit Audit & Match Score (0 to 100%)**: Detailed breakdown of aligned strengths and technical gaps relative to the posting.
- **Surgical CV Tailoring**: Aligns your professional summary and real experience bullets to the posting's keywords while strictly respecting verified facts in your master profile.
- **ATS-Friendly PDF Export**: Generates professional A4 PDF resumes via Playwright/HTML using the selected template's typography and accent colors.
- **Cover Letter & LinkedIn Outreach**: Concise, persuasive cover letters free of corporate clichés, plus short recruiter connection notes.
- **Interview Simulator (STAR+R)**: Likely behavioral and technical questions with structured STAR+R response angles.

### 7. 📋 Application Pipeline ("Applied" Tracking)
- Switch between **Dense List View** and a full **8-Column Kanban Board**.
- Full workflow: *Available ➔ Evaluated ➔ Preparing ➔ Applied ➔ Interview ➔ Offer / Positive ➔ Rejected ➔ Discarded*.
- **Manual Job Addition by URL**, **Batch Liveness Verification**, advanced filters (remote, liveness, sorting by match score/distance), and **CSV/JSON Export**.
- One-click quick action to mark as applied and record the submission date.

### 8. ⚙️ Settings Hub, Discord Webhook & Security
- **Encryption at Rest & Masking**: API keys and webhook URLs are encrypted at rest (`Fernet`) and never exposed again in plaintext after saving.
- **Real-Time Discord Webhook Notifications**:
  - Automatic alerts when new jobs are discovered during scans **and** when an application advances to *Interview* or *Offer*.
  - One-click **"Test Webhook"** button that sends a formatted embed and confirms delivery with Discord.
- **Live API Key Validation & Automatic Fallback Cascade**:
  - Real-time testing for **Google Gemini**, **OpenAI**, **Groq Cloud**, **SerpApi**, and **RapidAPI JSearch**.
  - Automatic fallback cascade across configured AI providers before falling back to offline heuristic mode.
- **Real-Time Scan Status**:
  - Live progress tracking via `GET /api/scrapers/scan/{scan_id}` with real backend execution logs.

### 9. 💎 Unslop Design Standard & Responsive Layout
- **Single-Row Navbar & Mobile Menu**:
  - Fixed height and restrained typography with `whitespace-nowrap` and smart truncation for long usernames.
  - Expandable drawer menu for tablets and mobile devices.
- **Collision-Free Kanban Pipeline**:
  - Card headers protected against overflow (`min-w-0`, `truncate`, `shrink-0`) to prevent collisions between job titles, long company names, and location badges.
- **Adaptive CV Studio**:
  - Balanced 3-column responsive grid (Controls, A4 Preview, and ATS Audit) across laptops and ultra-wide displays.
- **Comprehensive Master Profile**:
  - Manages personal info, executive summary, technical skills, experiences, projects, certifications, languages, verified facts, and **Education**.

---

## 🏗️ Repository Architecture

```text
new-career/
├── .agents/skills/                   # Integrated UI/UX, Design Tokens, and Unslop skills
├── AGENTS.md                         # Active project design, deploy, and GitHub sync rules
├── Caddyfile                         # Reverse proxy & automatic HTTPS config for career.andydias.pt
├── deploy.sh                         # Automated test, build, service restart & health check script
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI entrypoint with CORS and routers
│   │   ├── config.py                 # Environment, JWT, and Firebase settings
│   │   ├── firebase.py               # Multi-Tenant Firestore manager (Users, Jobs, CVs, Settings)
│   │   ├── auth_utils.py             # PBKDF2 hashing and JWT helpers
│   │   ├── database.py               # Async SQLite (SQLAlchemy + aiosqlite)
│   │   ├── models/                   # Entity models
│   │   ├── schemas/                  # Pydantic V2 schemas (Auth, Jobs, Profile, CV Templates, Settings)
│   │   ├── scrapers/                 # Scrapers (Net-Empregos, Google, JobSpy, ATS)
│   │   ├── services/                 # Services: ATS Auditor, Discord Notifier, Key Tester, PDF Generator, AI Tailor
│   │   ├── api/                      # REST routes (/auth, /jobs, /applications, /scrapers, /ai, /profile, /cv-templates, /settings)
│   │   └── scripts/                  # Migration, reset, and Cloud Firestore sync scripts
│   ├── tests/                        # Automated pytest suite (27 tests with multi-tenant isolation)
│   └── requirements.txt              # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── i18n/                     # Multilingual dictionaries (en, pt, de, es, zh, ar, ko)
│   │   ├── components/               # LoginView, RegisterView, OnboardingWizard, Navbar, DashboardView, JobsView, CVBuilderView, SettingsView, AIStudioModal
│   │   ├── context/                  # AuthContext, LanguageContext, ToastContext
│   │   ├── api.ts                    # Bearer-authenticated HTTP API client
│   │   ├── types.ts                  # Strict TypeScript definitions
│   │   └── App.tsx                   # Main application
│   ├── tailwind.config.js            # Unslop style tokens
│   └── package.json                  # React 19 + Tailwind CSS dependencies
├── storage/                          # Partitioned per-user storage
├── firebase-credentials.example.json # Google Cloud Firestore service account template
├── sync-firebase.bat                 # 1-click Firebase Cloud sync script
├── start.bat                         # Windows quick launcher
├── start.ps1                         # PowerShell quick launcher
└── README.md                         # Project documentation
```

---

## 🚀 Getting Started

### 0. Configure Environment Variables
Copy the configuration template in the project root and set a strong `JWT_SECRET`:
```bash
cp .env.example .env
```
> In production (`APP_ENV=production`), be sure to set a strong `JWT_SECRET` (>= 32 characters) and restrict `CORS_ORIGINS`.

### 1. Local Quick Start (Windows)
Double-click `start.bat` or run in PowerShell:
```powershell
.\start.ps1
```
The script starts the backend at `http://localhost:8000` and opens the frontend at `http://localhost:5173`.

### 2. Manual Setup

#### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
PYTHONPATH=. uvicorn backend.app.main:app --reload --port 8000
```
Interactive Swagger documentation is available at `http://localhost:8000/docs`.

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 VPS Hosting (Linux / Ubuntu + Caddy)

Because the platform uses direct browser uploads and relative storage (`storage/users/{user_id}/`), it is ready to run on any VPS:

1. **Clone the repository on your VPS**:
   ```bash
   git clone https://github.com/andyoliveiraa/new-career.git
   cd new-career
   ```

2. **Configure the Backend**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   playwright install chromium --with-deps
   ```

3. **Build & Deploy with Caddy**:
   ```bash
   cd ..
   ./deploy.sh
   ```
   `deploy.sh` runs the backend test suite, builds `frontend/dist`, validates/reloads `Caddyfile`, restarts `new-career-backend`, and verifies health checks.

---

## 🔥 Firebase Firestore Configuration

The platform stores its database on **Google Cloud Firestore (Firebase)**:
- Structured collections: `users`, `users/{user_id}/jobs`, `applications`, `profile`, `cv_templates`, `settings`, `scan_history`.
- Includes an **automatic persistent local fallback** (`storage/local_firestore.json`) so everything works out of the box even offline or without cloud credentials.

### Connecting to Your Firebase Cloud Project:
1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project (e.g., `new-career-9289e`).
2. Enable Firestore under **Build > Firestore Database > Create database**.
3. Go to **Project Settings (Gear icon) > Service Accounts > Generate new private key**.
4. Save the downloaded JSON file to the repository root as `firebase-credentials.json`.
5. Run [`sync-firebase.bat`](sync-firebase.bat) (or `PYTHONPATH=. python -m backend.app.scripts.sync_to_cloud_firestore`) to sync existing local data to Cloud Firestore.

---

## 🧪 Automated Tests

The platform includes an automated suite of **27 pytest tests** covering JWT authentication, multi-tenant isolation, per-user language persistence, Career-Ops ZIP/privacy onboarding, Zip Slip and Path Traversal protection, API key encryption/masking, AI fallback cascade, STAR+R interview prep, CSV/JSON export, batch liveness checks, CV builder/ATS auditor, and scrapers:

```bash
PYTHONPATH=. backend/.venv/bin/pytest backend/tests/ -v
```

---

## 📄 License
Distributed under the MIT License. See [LICENSE](LICENSE) for details.
