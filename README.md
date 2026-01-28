# Job Tracker

A simple personal job application tracker with AI-assist powered by Google Gemini.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **AI**: Google Gemini API (server-side only)
- **Deployment**: Netlify

## Features

- Track job applications with title, company, status, URLs, and notes
- Status tracking: Saved → Applied → Recruiter Screen → Technical → Final → Offer/Rejected/Ghosted
- Upload resumes and documents per job (multiple files allowed)
- AI-assist to auto-fill job details from job posting URLs or text
- Export data as CSV
- Dark mode support

## MVP Notes

- **No authentication** - This is a private, personal app
- **No RLS (Row Level Security)** - Single user, no multi-tenant concerns
- **No document versioning** - Duplicate file names allowed, multiple files per job
- **Optional fields** - All job fields are optional except status
- **Auto-status rule**: Uploading a resume sets status to "Applied" only if current status is "Saved"

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- Gemini API key

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. **Database**: Go to **SQL Editor** and run the contents of `supabase/schema.sql`
   - This creates the `jobs`, `job_files`, and `ai_runs` tables
   - **Important**: RLS (Row Level Security) must be DISABLED on all tables for MVP

3. **Storage**: Go to **Storage** and create a new bucket:
   - Bucket name: `job-files`
   - Public bucket: Either public or private is fine (downloads are proxied via API)
   - File size limit: 10MB recommended

4. **API Keys**: Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Storage Path Convention**:
- Resumes: `jobs/<jobId>/resume/<fileId>-<originalName>`
- Documents: `jobs/<jobId>/document/<fileId>-<originalName>`

### Environment Setup

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Health Check

Verify your env vars are correctly set:

```bash
curl http://localhost:3000/api/health/env
```

Expected response:
```json
{"ok": true, "missing": [], "present": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "GEMINI_API_KEY"]}
```

### Security Notes

- **Never commit `.env.local`** - it's gitignored by default
- **GEMINI_API_KEY is server-side only** - never exposed to client
- For production (Netlify), set env vars in dashboard or via CLI
- API routes fail fast with clear errors if env vars are missing

## Database Schema

### jobs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Job title (optional) |
| company_name | text | Company name (optional) |
| req_id | text | Requisition ID (optional) |
| job_post_url | text | Job posting URL (optional) |
| apply_url | text | Application URL (optional) |
| recruiter_emails | text[] | Array of recruiter emails |
| status | text | Application status (required) |
| notes | text | Notes (optional) |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

### job_files
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| job_id | uuid | Foreign key to jobs |
| file_type | text | 'resume' or 'document' |
| original_name | text | Original file name |
| storage_path | text | Supabase Storage path |
| mime_type | text | MIME type (optional) |
| size_bytes | int | File size in bytes (optional) |
| created_at | timestamptz | Upload timestamp |

### ai_runs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| job_id | uuid | Foreign key to jobs |
| input_text | text | Raw input (job posting text) |
| extracted | jsonb | Extracted field values |
| confidence | jsonb | Confidence scores per field |
| sources | jsonb | Source/evidence per field |
| warnings | jsonb | Array of warnings |
| created_at | timestamptz | Run timestamp |

## Status Values

1. Saved
2. Applied
3. Recruiter Screen
4. Technical
5. Final
6. Offer
7. Rejected
8. Ghosted

## API Endpoints

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (query, status filters) |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/[id]` | Get job details + file counts |
| PUT | `/api/jobs/[id]` | Update job (partial) |
| DELETE | `/api/jobs/[id]` | Delete job |

## AI Assist

The AI pencil icon on each job row opens an AI assistant that can:
- Parse job posting URLs to extract company, role, and details
- Parse pasted job description text
- Return structured JSON with confidence scores per field
- **Never hallucinates** - unknown fields remain empty/null

## License

Private project - not for distribution
