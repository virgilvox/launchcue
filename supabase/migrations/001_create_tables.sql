-- ============================================================================
-- 001_create_tables.sql — LaunchCue PostgreSQL Schema
-- Migrated from MongoDB (19 collections) to relational PostgreSQL
-- Key change: teams.members[] → team_members join table
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Custom ENUM Types ───

CREATE TYPE task_status AS ENUM ('To Do', 'In Progress', 'Blocked', 'Done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE project_status AS ENUM ('Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer', 'client');
CREATE TYPE event_color AS ENUM ('blue', 'green', 'orange', 'red', 'purple');
CREATE TYPE notification_type AS ENUM ('task_assigned', 'deadline_approaching', 'team_invite', 'mention', 'comment');
CREATE TYPE scope_status AS ENUM ('draft', 'sent', 'approved', 'revised');
CREATE TYPE deliverable_status AS ENUM ('pending', 'in-progress', 'completed', 'approved');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'overdue');
CREATE TYPE onboarding_step_type AS ENUM ('info', 'form', 'upload', 'approval');
CREATE TYPE onboarding_status AS ENUM ('not-started', 'in-progress', 'completed');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- ─── Users ───
-- Maps to MongoDB users collection
-- Supabase Auth handles auth.users; this is the app-level profile

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE, -- links to auth.users.id (Supabase Auth)
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  job_title TEXT,
  bio TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{"theme": "system", "notifications": {"email": true, "inApp": true}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Teams ───

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Team Members (join table — replaces teams.members[] array) ───

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ─── Team Invites ───

CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  status invite_status NOT NULL DEFAULT 'pending',
  role team_role NOT NULL DEFAULT 'member',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Clients ───

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  description TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  color TEXT,
  team_id UUID NOT NULL REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Client Contacts (replaces clients.contacts[] embedded array) ───

CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Projects ───

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'Planning',
  client_id UUID REFERENCES clients(id),
  start_date DATE,
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  budget NUMERIC(12,2),
  goals TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tasks ───

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'To Do',
  type TEXT,
  priority task_priority DEFAULT 'medium',
  project_id UUID REFERENCES projects(id),
  assignee_id UUID REFERENCES users(id),
  parent_task_id UUID REFERENCES tasks(id),
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  checklist JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  time_estimate INTEGER, -- minutes
  time_spent INTEGER, -- minutes
  team_id UUID NOT NULL REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Campaigns ───

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status campaign_status DEFAULT 'draft',
  types TEXT[] DEFAULT '{}',
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  start_date DATE,
  end_date DATE,
  steps JSONB DEFAULT '[]'::jsonb,
  budget NUMERIC(12,2),
  metrics JSONB DEFAULT '{"reach": 0, "engagement": 0, "conversions": 0}'::jsonb,
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notes ───

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Brain Dumps ───

CREATE TABLE brain_dumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Calendar Events ───

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  description TEXT,
  color event_color DEFAULT 'blue',
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  recurrence JSONB, -- {frequency, interval, endDate}
  reminders JSONB DEFAULT '[]'::jsonb, -- [{type, minutesBefore}]
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Resources ───

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  team_id UUID NOT NULL REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Scope Templates ───

CREATE TABLE scope_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  deliverables JSONB DEFAULT '[]'::jsonb,
  terms TEXT,
  tags TEXT[] DEFAULT '{}',
  team_id UUID NOT NULL REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Scopes (project-bound instances) ───

CREATE TABLE scopes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  template_id UUID REFERENCES scope_templates(id),
  deliverables JSONB DEFAULT '[]'::jsonb,
  terms TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status scope_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  team_id UUID NOT NULL REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Invoices ───

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  scope_id UUID REFERENCES scopes(id),
  invoice_number TEXT NOT NULL,
  line_items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2),
  tax_rate NUMERIC(5,4), -- e.g. 0.0825 = 8.25%
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status invoice_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC(12,2),
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, invoice_number)
);

-- ─── API Keys ───

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL, -- first 8 chars, for lookup
  key_hash TEXT NOT NULL, -- bcrypt hash of full key
  scopes TEXT[] NOT NULL DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Comments ───

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('task', 'project', 'client', 'note')),
  resource_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ───
-- Ephemeral — hard deleted when dismissed (not soft deleted)

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  resource_type TEXT,
  resource_id UUID,
  team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Client Invitations ───

CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  project_ids UUID[] DEFAULT '{}',
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT,
  token_hash TEXT, -- bcrypt hash for secure lookup
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Onboarding Checklists ───

CREATE TABLE onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  status onboarding_status NOT NULL DEFAULT 'not-started',
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Logs ───

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB, -- {field: {from, to}}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Webhooks ───

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Webhook Queue (for reliable delivery) ───

CREATE TABLE webhook_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id),
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Password Reset Tokens ───
-- Single-use, hard-deleted after use

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_prefix TEXT NOT NULL, -- first 8 chars for lookup
  token_hash TEXT NOT NULL, -- bcrypt hash
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Email Verification Tokens ───
-- Single-use, hard-deleted after use

CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
