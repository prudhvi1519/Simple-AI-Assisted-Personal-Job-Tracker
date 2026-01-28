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

- Track job applications with company, role, status, URL, and notes
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
- **Auto-status rule**: Uploading a resume sets status to "Applied" only if current status is "Saved" or empty

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- Gemini API key

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### jobs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| company | text | Company name (optional) |
| role | text | Job title (optional) |
| status | text | Application status |
| url | text | Job posting URL (optional) |
| notes | text | Notes (optional) |
| created_at | timestamp | Created timestamp |
| updated_at | timestamp | Updated timestamp |

### job_files
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| job_id | uuid | Foreign key to jobs |
| file_name | text | Original file name |
| file_type | text | 'resume' or 'document' |
| storage_path | text | Supabase Storage path |
| created_at | timestamp | Upload timestamp |

## Status Values

1. Saved
2. Applied
3. Recruiter Screen
4. Technical
5. Final
6. Offer
7. Rejected
8. Ghosted

## AI Assist

The AI pencil icon on each job row opens an AI assistant that can:
- Parse job posting URLs to extract company, role, and details
- Parse pasted job description text
- Return structured JSON with confidence scores per field
- **Never hallucinates** - unknown fields remain empty/null

## License

Private project - not for distribution
