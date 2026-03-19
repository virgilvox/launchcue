-- ============================================================================
-- 017 — Add assigned_members to projects
-- ============================================================================
-- Tracks which team members are assigned to a project as a UUID array.
-- Simpler than a join table for the current use case.

ALTER TABLE projects
  ADD COLUMN assigned_members UUID[] DEFAULT '{}';

-- Recreate the view so it picks up the new column
CREATE OR REPLACE VIEW active_projects AS
  SELECT * FROM projects WHERE deleted_at IS NULL;

-- Preserve security_invoker setting (PostgreSQL 15+)
ALTER VIEW active_projects SET (security_invoker = true);
