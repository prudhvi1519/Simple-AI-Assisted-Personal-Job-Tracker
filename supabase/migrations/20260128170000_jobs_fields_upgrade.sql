-- Migration: Add new optional fields to jobs table
-- Timestamp: 20260128170000
-- Description: Skills, Location, Work Mode, Compensation, Follow-up, Priority, Source, Recruiter Name

-- Step 1: Add new columns (all optional with safe defaults)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS primary_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location text NULL,
  ADD COLUMN IF NOT EXISTS work_mode text NULL,
  ADD COLUMN IF NOT EXISTS compensation_text text NULL,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS priority text NULL,
  ADD COLUMN IF NOT EXISTS source text NULL,
  ADD COLUMN IF NOT EXISTS recruiter_name text NULL;

-- Step 2: Add CHECK constraint for work_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_work_mode_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_work_mode_check
      CHECK (work_mode IS NULL OR work_mode IN ('Remote', 'Hybrid', 'Onsite', 'Unknown'));
  END IF;
END $$;

-- Step 3: Add CHECK constraint for priority
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_priority_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_priority_check
      CHECK (priority IS NULL OR priority IN ('Low', 'Medium', 'High'));
  END IF;
END $$;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN public.jobs.primary_skills IS 'Primary required skills for the job';
COMMENT ON COLUMN public.jobs.secondary_skills IS 'Nice-to-have or secondary skills';
COMMENT ON COLUMN public.jobs.location IS 'Job location (city/country)';
COMMENT ON COLUMN public.jobs.work_mode IS 'Remote | Hybrid | Onsite | Unknown';
COMMENT ON COLUMN public.jobs.compensation_text IS 'Salary/compensation as free text';
COMMENT ON COLUMN public.jobs.next_followup_at IS 'When to follow up on this application';
COMMENT ON COLUMN public.jobs.priority IS 'Low | Medium | High priority for applying';
COMMENT ON COLUMN public.jobs.source IS 'Where the job was found (LinkedIn, Referral, etc.)';
COMMENT ON COLUMN public.jobs.recruiter_name IS 'Name of recruiter or hiring manager';
