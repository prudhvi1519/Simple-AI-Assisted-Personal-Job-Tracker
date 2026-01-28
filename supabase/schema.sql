-- ============================================================================
-- Job Tracker MVP - Supabase Schema
-- ============================================================================
-- Run this file in your Supabase SQL Editor to create all tables.
-- No RLS (Row Level Security) - this is a private personal app.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- TABLE: jobs
-- Main table for tracking job applications
-- ============================================================================
create table jobs (
  id uuid primary key default gen_random_uuid(),
  
  -- Job details (all optional)
  title text null,
  company_name text null,
  req_id text null,
  job_post_url text null,
  apply_url text null,
  
  -- Contact info (array of emails, duplicates allowed)
  recruiter_emails text[] not null default '{}',
  recruiter_name text null,
  
  -- Skills (primary = required, secondary = nice-to-have)
  primary_skills text[] not null default '{}',
  secondary_skills text[] not null default '{}',
  
  -- Location & Work Mode
  location text null,
  work_mode text null
    constraint jobs_work_mode_check check (
      work_mode is null or work_mode in ('Remote', 'Hybrid', 'Onsite', 'Unknown')
    ),
  
  -- Compensation (free text, avoids currency/min/max complexity)
  compensation_text text null,
  
  -- Status tracking
  status text not null default 'Saved'
    constraint jobs_status_check check (
      status in (
        'Saved',
        'Applied',
        'Recruiter Screen',
        'Technical',
        'Final',
        'Offer',
        'Rejected',
        'Ghosted'
      )
    ),
  
  -- Priority & Source
  priority text null
    constraint jobs_priority_check check (
      priority is null or priority in ('Low', 'Medium', 'High')
    ),
  source text null,
  
  -- Follow-up tracking
  next_followup_at timestamptz null,
  
  -- Notes (free text)
  notes text null,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for common queries
create index jobs_status_idx on jobs(status);
create index jobs_updated_at_idx on jobs(updated_at desc);

-- ============================================================================
-- TABLE: job_files
-- Stores file metadata for resumes and documents attached to jobs.
-- Actual files stored in Supabase Storage bucket 'job-files'.
-- Multiple files per job allowed, duplicate names allowed.
-- ============================================================================
create table job_files (
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to jobs (cascade delete)
  job_id uuid not null references jobs(id) on delete cascade,
  
  -- File type: 'resume' or 'document'
  file_type text not null
    constraint job_files_type_check check (file_type in ('resume', 'document')),
  
  -- File metadata
  original_name text not null,
  storage_path text not null,
  mime_type text null,
  size_bytes int null,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

-- Index for file lookups by job
create index job_files_job_id_idx on job_files(job_id);

-- ============================================================================
-- TABLE: ai_runs
-- Records each AI extraction run for audit and transparency.
-- Stores raw input, extracted fields, confidence scores, and sources.
-- ============================================================================
create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to jobs (cascade delete)
  job_id uuid not null references jobs(id) on delete cascade,
  
  -- Input text (job posting or pasted content)
  input_text text null,
  
  -- AI extraction results (JSONB for flexibility)
  -- extracted: { title: "...", company_name: "...", ... }
  extracted jsonb not null default '{}'::jsonb,
  
  -- Confidence per field: { title: 0.95, company_name: 0.8, ... }
  confidence jsonb not null default '{}'::jsonb,
  
  -- Sources per field: { title: "Found in <h1> tag", ... }
  sources jsonb not null default '{}'::jsonb,
  
  -- Warnings: ["Could not find salary info", ...]
  warnings jsonb not null default '[]'::jsonb,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

-- Index for AI run lookups by job
create index ai_runs_job_id_idx on ai_runs(job_id);

-- ============================================================================
-- TRIGGER: Automatically update jobs.updated_at on UPDATE
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger jobs_set_updated_at
  before update on jobs
  for each row
  execute function set_updated_at();

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================
comment on table jobs is 'Main table for tracking job applications';
comment on table job_files is 'Files (resumes, documents) attached to jobs';
comment on table ai_runs is 'AI extraction run history for audit';
comment on column jobs.status is 'Saved → Applied → Recruiter Screen → Technical → Final → Offer/Rejected/Ghosted';
comment on column jobs.recruiter_emails is 'Array of recruiter email addresses';
comment on column job_files.storage_path is 'Path in Supabase Storage bucket job-files';
comment on column ai_runs.confidence is 'Confidence score (0-1) per extracted field';
comment on column ai_runs.sources is 'Source/evidence for each extracted field';
