-- ============================================================================
-- 005_views.sql — Active views filtering soft-deleted rows
-- Supabase repos query these views instead of base tables for reads
-- ============================================================================

CREATE OR REPLACE VIEW active_clients AS
  SELECT * FROM clients WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_projects AS
  SELECT * FROM projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_tasks AS
  SELECT * FROM tasks WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_campaigns AS
  SELECT * FROM campaigns WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_notes AS
  SELECT * FROM notes WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_calendar_events AS
  SELECT * FROM calendar_events WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_resources AS
  SELECT * FROM resources WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_scope_templates AS
  SELECT * FROM scope_templates WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_scopes AS
  SELECT * FROM scopes WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_invoices AS
  SELECT * FROM invoices WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_api_keys AS
  SELECT * FROM api_keys WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_webhooks AS
  SELECT * FROM webhooks WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_client_invitations AS
  SELECT * FROM client_invitations WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_onboarding_checklists AS
  SELECT * FROM onboarding_checklists WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_teams AS
  SELECT * FROM teams WHERE deleted_at IS NULL;

-- ─── Dashboard Summary View ───
-- Pre-computed counts for the dashboard stats grid

CREATE OR REPLACE VIEW dashboard_stats AS
  SELECT
    t.team_id,
    COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) AS total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'Done') AS completed_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status != 'Done' AND t.due_date < CURRENT_DATE) AS overdue_tasks,
    COUNT(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL) AS total_projects,
    COUNT(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL AND p.status = 'In Progress') AS active_projects,
    COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) AS total_clients,
    COUNT(DISTINCT i.id) FILTER (WHERE i.deleted_at IS NULL AND i.status IN ('sent', 'viewed')) AS outstanding_invoices,
    COALESCE(SUM(i.total) FILTER (WHERE i.deleted_at IS NULL AND i.status IN ('sent', 'viewed')), 0) AS outstanding_amount
  FROM tasks t
  FULL OUTER JOIN projects p ON p.team_id = t.team_id
  FULL OUTER JOIN clients c ON c.team_id = t.team_id
  FULL OUTER JOIN invoices i ON i.team_id = t.team_id
  GROUP BY t.team_id;

-- ─── Upcoming Deadlines View ───

CREATE OR REPLACE VIEW upcoming_deadlines AS
  SELECT
    id,
    title,
    'task' AS entity_type,
    due_date,
    status::TEXT,
    team_id,
    assignee_id AS owner_id
  FROM tasks
  WHERE deleted_at IS NULL
    AND due_date IS NOT NULL
    AND due_date >= CURRENT_DATE
    AND status != 'Done'
  UNION ALL
  SELECT
    id,
    title,
    'project' AS entity_type,
    due_date,
    status::TEXT,
    team_id,
    owner_id
  FROM projects
  WHERE deleted_at IS NULL
    AND due_date IS NOT NULL
    AND due_date >= CURRENT_DATE
    AND status NOT IN ('Completed', 'Cancelled')
  ORDER BY due_date ASC;
