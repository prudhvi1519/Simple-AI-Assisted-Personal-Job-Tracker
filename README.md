# Simple AI-Assisted Personal Job Tracker

Track job applications + files + AI extraction on a lightweight stack.

![Repo](https://img.shields.io/badge/Status-Active-success)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://simple-job-tracker-ai.netlify.app)

## 🔗 Live Demo & Repo
- **Production URL**: [https://simple-job-tracker-ai.netlify.app](https://simple-job-tracker-ai.netlify.app)
- **Repository**: [https://github.com/prudhvi1519/Simple-AI-Assisted-Personal-Job-Tracker](https://github.com/prudhvi1519/Simple-AI-Assisted-Personal-Job-Tracker)

## ⚡ At a Glance
- **Smart Tracking**: Job CRUD with advanced optional fields (Priority, Work Mode, Compensation).
- **Status Workflow**: Custom statuses with auto-bump from "Saved" to "Applied" on upload.
- **File Management**: Upload Resumes and Descriptions securely to Supabase Storage.
- **AI Assist**: Extract details from raw JDs/URLs, Diff Preview, and Selective Apply.
- **Search & Filter**: Instant filtering by Status, Priority, and Work Mode.
- **Data Portability**: Full CSV/JSON exports + Manifest backup (Single Source of Truth).
- **Production Ready**: Built-in health checks for Environment, Storage, and Schema.
- **Mobile Optimized**: Responsive Card layouts and Drawer sidebars.

## 📑 Table of Contents
- [Simple AI-Assisted Personal Job Tracker](#simple-ai-assisted-personal-job-tracker)
  - [🔗 Live Demo \& Repo](#-live-demo--repo)
  - [⚡ At a Glance](#-at-a-glance)
  - [📑 Table of Contents](#-table-of-contents)
  - [📷 Screenshots](#-screenshots)
  - [✨ Features](#-features)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🧱 Architecture](#-architecture)
  - [📦 Data Model](#-data-model)
  - [🔌 API Endpoints](#-api-endpoints)
  - [🚀 Quickstart (Local)](#-quickstart-local)
  - [🔐 Environment Variables](#-environment-variables)
  - [🗄️ Supabase Setup](#️-supabase-setup)
  - [📁 Storage Paths](#-storage-paths)
  - [🧠 AI Contract](#-ai-contract)
  - [📤 Export \& Backup](#-export--backup)
  - [✅ Health Checks](#-health-checks)
  - [🧰 Deployment (Netlify)](#-deployment-netlify)
  - [🧯 Troubleshooting](#-troubleshooting)
  - [📚 Documentation Index](#-documentation-index)

## 📷 Screenshots
*Screenshots to be added.*
<details>
<summary>Contribution Instructions</summary>
Place screenshots in `docs/screens/` and reference them here.
</details>

## ✨ Features

### A) Jobs & Status
- **Rich Data**: Track more than just titles. Store Recruiter info, compensation ranges, follow-up dates, and source.
- **Visuals**: Priority Pills (High/Medium/Low) and Status Badges.

### B) Files
- **Resume Hosting**: PDF/DOCX support.
- **Context Awareness**: Files are strictly linked to `job_id`.

### C) AI Assist
- **Gemini Pro Integration**: Analyzing job descriptions with high accuracy.
- **Safety First**: "Diff View" ensures no AI hallucination overwrites your data without approval.

### D) Exports & Backup
- **CSV**: for spreadsheet analysis.
- **Manifest**: Deep JSON export of Database + File metadata.

### E) Mobile UX
- **Card Layout**: Specialized view for small screens.
- **Drawers**: Smooth slide-overs for adding jobs and viewing details.

### F) Health & Guardrails
- **Schema Validation**: Endpoints to warn if DB migrations are missing.
- **Environment Checks**: Boot-time verification of API keys.

## 🛠️ Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Framework** | Next.js 14 | App Router, Server Actions |
| **Database** | Supabase | Postgres + Auth (Inactive) |
| **Storage** | Supabase Storage | File hosting |
| **AI** | Google Gemini | Generative Language API |
| **Styling** | Tailwind CSS | Utility-first styling |
| **Hosting** | Netlify | Static + Edge/Serverless |

## 🧱 Architecture

```mermaid
graph TD
    User[User] -->|Browser| Next[Next.js App]
    Next -->|API Routes| Supabase[Supabase DB]
    Next -->|API Routes| Storage[Supabase Storage]
    Next -->|Server| Gemini[Gemini API]
    Gemini -->|Extract| Next
    Next -->|Log| AIRuns[ai_runs Table]
```

## 📦 Data Model

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `jobs` | Core Application Data | `id`, `title`, `status`, `primary_skills` |
| `job_files` | File References | `id`, `job_id`, `file_type`, `path` |
| `ai_runs` | Interaction Logs | `id`, `job_id`, `prompt`, `response` |

**Migrations**: `supabase/migrations/20260128170000_jobs_fields_upgrade.sql`

## 🔌 API Endpoints

| Category | Endpoint | Notes |
|----------|----------|-------|
| **Jobs** | `/api/jobs` | GET list, POST create |
| **Jobs** | `/api/jobs/:id` | GET detail, PUT update, DELETE |
| **Files** | `/api/jobs/:id/files` | POST upload |
| **Files** | `/api/files/:fileId` | GET download, DELETE |
| **AI** | `/api/jobs/:id/ai-extract` | POST text/url to extract |
| **AI** | `/api/jobs/:id/ai-apply` | POST apply suggestions |
| **Export** | `/api/export/manifest.json` | GET full backup |
| **Health** | `/api/health/schema` | GET check DB columns |

## 🚀 Quickstart (Local)

```powershell
# 1. Install dependencies
npm install

# 2. Set up environment (see below)
cp .env.example .env.local

# 3. Run development server
npm run dev

# 4. Build for production (test)
npm run build
```

## 🔐 Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
GEMINI_API_KEY=AIzaSy...
```

## 🗄️ Supabase Setup

1. **Create Project**: [database.new](https://database.new)
2. **Create Bucket**: `job-files` (Public)
3. **Apply Migrations**:
   Run `supabase/migrations/20260128170000_jobs_fields_upgrade.sql` in SQL Editor.
4. **Reload Schema**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

## 📁 Storage Paths
Files are stored with the following convention:
- **Resumes**: `jobs/<jobId>/resume/<fileId>-<originalName>`
- **Docs**: `jobs/<jobId>/document/<fileId>-<originalName>`

## 🧠 AI Contract

We enforce a Strict JSON response from Gemini:

```json
{
  "confidence": { "skills": 0.9 },
  "suggested": { ... },
  "unknown_fields": ["salary"]
}
```

- **No Guessing**: Unknown fields return `null`.
- **Validation**: Enums (Remote/Hybrid) are strictly validated.
- **Fail-safe**: URL fetch failures fall back to user-pasted text.

## 📤 Export & Backup

- **CSV**: `/api/export/jobs.csv`
- **JSON**: `/api/export/jobs.json`
- **Manifest**: `/api/export/manifest.json` (Primary Backup)

**Download Backup:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/export/manifest.json" -OutFile "backup.json"
```

## ✅ Health Checks

| Endpoint | Checks |
|----------|--------|
| `/api/health/env` | API Keys presence |
| `/api/health/storage` | Bucket accessibility |
| `/api/health/schema` | **Critical**: Verifies DB migration applied |

## 🧰 Deployment (Netlify)

1. **Build Command**: `npm run build`
2. **Environment**: Set variables in Site Settings.
3. **Deploy**:
   ```powershell
   netlify deploy --prod
   ```
4. **Verify**: Check `/api/health/env`.

## 🧯 Troubleshooting

### PowerShell `curl` pitfalls (use this instead)

Using `curl` in PowerShell often invokes `Invoke-WebRequest` which corrupts JSON payloads.

**Correct Way (Invoke-RestMethod):**
```powershell
$body = @{ title = "Job" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "url" -Body $body -ContentType "application/json"
```

**If using curl.exe:**
```powershell
curl.exe -H "Content-Type: application/json" -d '@body.json' "url"
```

## 📚 Documentation Index
- [STATUS_PACK.md](./STATUS_PACK.md) - Feature implementation status.
- [Database Schema](./supabase/schema.sql)
