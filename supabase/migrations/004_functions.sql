-- ============================================================================
-- 004_functions.sql — Database functions and triggers
-- ============================================================================

-- ─── updated_at trigger ───
-- Automatically sets updated_at on every UPDATE

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- ─── Soft Delete ───
-- Sets deleted_at + deleted_by instead of actual deletion

CREATE OR REPLACE FUNCTION soft_delete(
  p_table TEXT,
  p_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
    p_table
  ) USING p_user_id, p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Cascade Soft Delete Team ───
-- When a team is soft-deleted, cascade to all team-scoped entities

CREATE OR REPLACE FUNCTION cascade_soft_delete_team()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Cascade to all team-scoped tables
    UPDATE clients SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE projects SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE tasks SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE campaigns SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE notes SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE calendar_events SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE resources SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE scope_templates SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE scopes SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE invoices SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE api_keys SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE webhooks SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE client_invitations SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    UPDATE onboarding_checklists SET deleted_at = NOW(), deleted_by = NEW.deleted_by WHERE team_id = NEW.id AND deleted_at IS NULL;
    -- Hard delete ephemeral data
    DELETE FROM notifications WHERE team_id = NEW.id;
    DELETE FROM team_invites WHERE team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER cascade_team_soft_delete
  AFTER UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION cascade_soft_delete_team();

-- ─── Auto Invoice Number ───
-- Generates INV-001, INV-002, etc. per team

CREATE OR REPLACE FUNCTION generate_invoice_number(p_team_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE team_id = p_team_id;

  RETURN 'INV-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Task Status ↔ Completed Sync ───
-- Keep `completed` boolean in sync with `status`

CREATE OR REPLACE FUNCTION sync_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Done' AND NOT NEW.completed THEN
    NEW.completed = TRUE;
  ELSIF NEW.status != 'Done' AND NEW.completed THEN
    NEW.completed = FALSE;
  END IF;

  IF NEW.completed AND NEW.status != 'Done' THEN
    NEW.status = 'Done';
  ELSIF NOT NEW.completed AND NEW.status = 'Done' THEN
    NEW.status = 'To Do';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_task_completed_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_completed();

-- ─── Global Search (full-text) ───
-- Searches across tasks, projects, clients, notes, campaigns, resources

CREATE OR REPLACE FUNCTION global_search(
  p_team_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  title TEXT,
  description TEXT,
  rank REAL
) AS $$
DECLARE
  ts_query TSQUERY;
BEGIN
  -- Build tsquery from input (handles multi-word gracefully)
  ts_query := plainto_tsquery('english', p_query);

  RETURN QUERY
  (
    SELECT t.id, 'task'::TEXT, t.title, t.description,
      ts_rank(to_tsvector('english', coalesce(t.title, '') || ' ' || coalesce(t.description, '')), ts_query)
    FROM tasks t
    WHERE t.team_id = p_team_id AND t.deleted_at IS NULL
      AND to_tsvector('english', coalesce(t.title, '') || ' ' || coalesce(t.description, '')) @@ ts_query
  )
  UNION ALL
  (
    SELECT p.id, 'project'::TEXT, p.title, p.description,
      ts_rank(to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.description, '')), ts_query)
    FROM projects p
    WHERE p.team_id = p_team_id AND p.deleted_at IS NULL
      AND to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.description, '')) @@ ts_query
  )
  UNION ALL
  (
    SELECT c.id, 'client'::TEXT, c.name, c.description,
      ts_rank(to_tsvector('english', coalesce(c.name, '') || ' ' || coalesce(c.description, '')), ts_query)
    FROM clients c
    WHERE c.team_id = p_team_id AND c.deleted_at IS NULL
      AND to_tsvector('english', coalesce(c.name, '') || ' ' || coalesce(c.description, '')) @@ ts_query
  )
  UNION ALL
  (
    SELECT n.id, 'note'::TEXT, n.title, LEFT(n.content, 200),
      ts_rank(to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content, '')), ts_query)
    FROM notes n
    WHERE n.team_id = p_team_id AND n.deleted_at IS NULL
      AND to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content, '')) @@ ts_query
  )
  UNION ALL
  (
    SELECT ca.id, 'campaign'::TEXT, ca.title, ca.description,
      ts_rank(to_tsvector('english', coalesce(ca.title, '') || ' ' || coalesce(ca.description, '')), ts_query)
    FROM campaigns ca
    WHERE ca.team_id = p_team_id AND ca.deleted_at IS NULL
      AND to_tsvector('english', coalesce(ca.title, '') || ' ' || coalesce(ca.description, '')) @@ ts_query
  )
  UNION ALL
  (
    SELECT r.id, 'resource'::TEXT, r.name, r.description,
      ts_rank(to_tsvector('english', coalesce(r.name, '') || ' ' || coalesce(r.description, '')), ts_query)
    FROM resources r
    WHERE r.team_id = p_team_id AND r.deleted_at IS NULL
      AND to_tsvector('english', coalesce(r.name, '') || ' ' || coalesce(r.description, '')) @@ ts_query
  )
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── Audit Log Trigger ───
-- Auto-creates audit log entries on INSERT/UPDATE/DELETE of key entities

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  p_action TEXT;
  p_changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    p_action := 'created';
    INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
    VALUES (
      COALESCE(auth.app_user_id(), NEW.created_by, NEW.user_id),
      NEW.team_id,
      p_action,
      TG_TABLE_NAME,
      NEW.id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      p_action := 'deleted';
    ELSE
      p_action := 'updated';
    END IF;
    INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
    VALUES (
      COALESCE(auth.app_user_id(), NEW.created_by, NEW.user_id),
      NEW.team_id,
      p_action,
      TG_TABLE_NAME,
      NEW.id
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit log triggers to key entities
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_scopes AFTER INSERT OR UPDATE ON scopes FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ─── Webhook Queue Trigger ───
-- When an entity changes, queue webhooks for delivery

CREATE OR REPLACE FUNCTION queue_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  event_name TEXT;
  payload JSONB;
BEGIN
  -- Build event name
  IF TG_OP = 'INSERT' THEN
    event_name := TG_TABLE_NAME || '.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      event_name := TG_TABLE_NAME || '.deleted';
    ELSE
      event_name := TG_TABLE_NAME || '.updated';
    END IF;
  END IF;

  payload := jsonb_build_object(
    'event', event_name,
    'timestamp', NOW(),
    'data', row_to_json(NEW)::jsonb
  );

  -- Queue for each matching active webhook
  FOR webhook_record IN
    SELECT id FROM webhooks
    WHERE team_id = NEW.team_id
      AND active = TRUE
      AND deleted_at IS NULL
      AND event_name = ANY(events)
  LOOP
    INSERT INTO webhook_queue (webhook_id, event, payload)
    VALUES (webhook_record.id, event_name, payload);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply webhook triggers to key entities
CREATE TRIGGER webhook_tasks AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION queue_webhooks();
CREATE TRIGGER webhook_projects AFTER INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION queue_webhooks();
CREATE TRIGGER webhook_clients AFTER INSERT OR UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION queue_webhooks();
CREATE TRIGGER webhook_invoices AFTER INSERT OR UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION queue_webhooks();
CREATE TRIGGER webhook_scopes AFTER INSERT OR UPDATE ON scopes FOR EACH ROW EXECUTE FUNCTION queue_webhooks();

-- ─── Notification on Task Assignment ───

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id) THEN
    INSERT INTO notifications (user_id, type, title, message, resource_type, resource_id, team_id)
    VALUES (
      NEW.assignee_id,
      'task_assigned',
      'Task Assigned',
      'You have been assigned to: ' || NEW.title,
      'task',
      NEW.id,
      NEW.team_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_task_assign
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();
