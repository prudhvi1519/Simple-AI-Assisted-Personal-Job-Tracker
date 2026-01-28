# Simple AI-Assisted Personal Job Tracker

A powerful, self-hosted job application tracker built with Next.js, Supabase, and Gemini AI to streamline your job search with automated data extraction and management.

## 🚀 Live Demo & Repo
- **Production Stats**: [https://simple-job-tracker-ai.netlify.app](https://simple-job-tracker-ai.netlify.app)
- **Repo**: [https://github.com/prudhvi1519/Simple-AI-Assisted-Personal-Job-Tracker](https://github.com/prudhvi1519/Simple-AI-Assisted-Personal-Job-Tracker)

## ✨ Feature Highlights
- **Jobs CRUD**: Manage job applications with advanced fields (Priority, Work Mode, Compensation, etc.).
- **Smart Status Flow**: Tracking from "Applied" to "Offer" with automated status bumps on file uploads.
- **File Management**: Upload, view, and delete Resumes and Descriptions securely linked to jobs.
- **AI Assist**: 
  - **Extract**: Auto-fill job details (Skills, Location, Emails) from raw text or URLs using Gemini.
  - **Selective Apply**: Choose which AI suggestions to commit to your database.
- **Advanced Search & Filters**: Filter by Status, Priority, and Work Mode instantly.
- **Data Portability**: Full JSON/Manifest exports for backups and CSV exports for reporting.
- **Health Checks**: Built-in endpoints to verify Environment, Storage, and Database Schema integrity.
- **Responsive UI**: Optimized Desktop Table and Mobile Card layouts with specialized drawers.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), TailwindCSS, TypeScript
- **Backend**: Supabase (Postgres Database, Auth, Storage)
- **AI**: Google Gemini Pro (via API)
- **Deployment**: Netlify

## ⚡ Quickstart (Local)

1. **Install Dependencies** (Requires Node 18+)
   ```powershell
   npm install
   ```

2. **Run Development Server**
   ```powershell
   npm run dev
   ```
   Access at `http://localhost:3000`.

3. **Build for Production**
   ```powershell
   npm run build
   ```

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
```

**Note:** Never commit `.env.local` to version control.

## 🗄️ Supabase Setup

1. **Create Project**: Start a new project at [database.new](https://database.new).
2. **Setup Storage**: Create a public bucket named `job-files`.
3. **Apply Migrations**: 
   - Open specific migration file `supabase/migrations/20260128170000_jobs_fields_upgrade.sql`
   - Copy contents and run in the Supabase **SQL Editor**.
4. **Reload Schema**:
   After applying migrations, force a schema cache reload:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

### Data Model Overview
- **jobs**: Core table storing application details (Title, Company, Status, Skills, etc).
- **job_files**: Links uploaded files (Resumes, JDs) to jobs.
- **ai_runs** (planned): Logs AI interaction history.

See `supabase/schema.sql` for the baseline structure.

## 📂 Storage Paths
Files are organized strictly by logical hierarchy:
- `jobs/<jobId>/resume/<fileId>-<originalName>`
- `jobs/<jobId>/document/<fileId>-<originalName>`

## 🔌 API Endpoints (High-Level)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | GET, POST | List all jobs / Create new job |
| `/api/jobs/:id` | GET, PUT, DELETE | Manage specific job |
| `/api/jobs/:id/files` | POST | Upload file to job |
| `/api/jobs/:id/ai-extract` | POST | Extract fields from text/URL |
| `/api/jobs/:id/ai-apply` | POST | Apply AI suggestions to DB |
| `/api/export/manifest.json` | GET | Full backup of DB + File references |
| `/api/health/schema` | GET | Verify DB columns match code expectations |

## 🤖 AI Behavior Contract
The AI is strictly engineered to provide **factual data only**:
- **No Guessing**: Unknown fields return `null` or `[]`.
- **Validation**: "Work Mode" and "Priority" values are validated against allowed enums.
- **Extraction**: Only extract what is explicitly present in the source text.
- **Manual Override**: AI suggestions are presented in a Diff View; user has final authority to apply changes.

## 💾 Backup & Restore
The **Manifest Export** acts as the source of truth for your data state.
- **Backup**: Download `/api/export/manifest.json` regularly.
- **Files**: Ensure you have copies of files referenced in the manifest (or download via `/api/files/:fileId`).

## 🚀 Deployment (Netlify)

1. **Build Settings**:
   - Build Command: `npm run build`
   - Publish Directory: `.next` (or default)
2. **Environment**: Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` to Site Settings.
3. **CLI Deploy**:
   ```powershell
   netlify deploy --prod
   ```
4. **Verification**:
   Check `https://<site>.netlify.app/api/health/env` after deploy.

## ⚠️ Troubleshooting (Windows PowerShell)

**PowerShell `curl` Pitfall:**
In PowerShell, `curl` is an alias for `Invoke-WebRequest`, which parses response HTML and breaks on JSON/Binary inputs often.

**Recommended: Use `Invoke-RestMethod`**
```powershell
$body = @{ title = "New Job" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/jobs" -ContentType "application/json" -Body $body
```

**If using `curl.exe`:**
Always quote JSON or use a file:
```powershell
curl.exe -X POST ... -d '@body.json'
```

## 📚 Docs Index
- [STATUS_PACK.md](./STATUS_PACK.md) - Current feature implementation status.
