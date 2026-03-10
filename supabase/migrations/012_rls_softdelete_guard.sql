-- ============================================================================
-- 012_rls_softdelete_guard.sql — RLS audit fixes
-- 1. Add deleted_at IS NULL to UPDATE/DELETE policies on soft-delete tables
-- 2. Fix webhook_queue RLS (USING(FALSE) blocks service_role)
-- 3. Add comments/brain_dumps cascade on team soft-delete
-- ============================================================================

-- ─── Issue 1: Soft-delete guards on UPDATE/DELETE policies ───
-- Prevents updating or deleting already-soft-deleted records

-- clients
DROP POLICY clients_update ON clients;
CREATE POLICY clients_update ON clients FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY clients_delete ON clients;
CREATE POLICY clients_delete ON clients FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- projects
DROP POLICY projects_update ON projects;
CREATE POLICY projects_update ON projects FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY projects_delete ON projects;
CREATE POLICY projects_delete ON projects FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- tasks
DROP POLICY tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY tasks_delete ON tasks;
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- campaigns
DROP POLICY campaigns_update ON campaigns;
CREATE POLICY campaigns_update ON campaigns FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY campaigns_delete ON campaigns;
CREATE POLICY campaigns_delete ON campaigns FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- notes
DROP POLICY notes_update ON notes;
CREATE POLICY notes_update ON notes FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY notes_delete ON notes;
CREATE POLICY notes_delete ON notes FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- calendar_events
DROP POLICY calendar_events_update ON calendar_events;
CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY calendar_events_delete ON calendar_events;
CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- resources
DROP POLICY resources_update ON resources;
CREATE POLICY resources_update ON resources FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY resources_delete ON resources;
CREATE POLICY resources_delete ON resources FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- scope_templates
DROP POLICY scope_templates_update ON scope_templates;
CREATE POLICY scope_templates_update ON scope_templates FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY scope_templates_delete ON scope_templates;
CREATE POLICY scope_templates_delete ON scope_templates FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- scopes
DROP POLICY scopes_update ON scopes;
CREATE POLICY scopes_update ON scopes FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY scopes_delete ON scopes;
CREATE POLICY scopes_delete ON scopes FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- invoices
DROP POLICY invoices_update ON invoices;
CREATE POLICY invoices_update ON invoices FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY invoices_delete ON invoices;
CREATE POLICY invoices_delete ON invoices FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- onboarding_checklists
DROP POLICY onboarding_checklists_update ON onboarding_checklists;
CREATE POLICY onboarding_checklists_update ON onboarding_checklists FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);
DROP POLICY onboarding_checklists_delete ON onboarding_checklists;
CREATE POLICY onboarding_checklists_delete ON onboarding_checklists FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write() AND deleted_at IS NULL);

-- api_keys (special: user_id check + is_admin)
DROP POLICY api_keys_update ON api_keys;
CREATE POLICY api_keys_update ON api_keys FOR UPDATE
  USING (team_id = auth.current_team_id() AND (user_id = auth.app_user_id() OR auth.is_admin()) AND deleted_at IS NULL);
DROP POLICY api_keys_delete ON api_keys;
CREATE POLICY api_keys_delete ON api_keys FOR DELETE
  USING (team_id = auth.current_team_id() AND (user_id = auth.app_user_id() OR auth.is_admin()) AND deleted_at IS NULL);

-- webhooks (special: is_admin)
DROP POLICY webhooks_update ON webhooks;
CREATE POLICY webhooks_update ON webhooks FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin() AND deleted_at IS NULL);
DROP POLICY webhooks_delete ON webhooks;
CREATE POLICY webhooks_delete ON webhooks FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.is_admin() AND deleted_at IS NULL);

-- client_invitations (special: is_admin)
DROP POLICY client_invitations_update ON client_invitations;
CREATE POLICY client_invitations_update ON client_invitations FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin() AND deleted_at IS NULL);
DROP POLICY client_invitations_delete ON client_invitations;
CREATE POLICY client_invitations_delete ON client_invitations FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.is_admin() AND deleted_at IS NULL);

-- ─── Issue 1b: client_contacts soft-delete edge case ───
-- Subquery didn't filter deleted clients — contacts of soft-deleted clients were still visible

DROP POLICY client_contacts_select ON client_contacts;
CREATE POLICY client_contacts_select ON client_contacts FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id() AND deleted_at IS NULL));

DROP POLICY client_contacts_insert ON client_contacts;
CREATE POLICY client_contacts_insert ON client_contacts FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id() AND deleted_at IS NULL) AND auth.can_write());

DROP POLICY client_contacts_update ON client_contacts;
CREATE POLICY client_contacts_update ON client_contacts FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id() AND deleted_at IS NULL) AND auth.can_write());

DROP POLICY client_contacts_delete ON client_contacts;
CREATE POLICY client_contacts_delete ON client_contacts FOR DELETE
  USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id() AND deleted_at IS NULL) AND auth.can_write());

-- ─── Issue 2: webhook_queue RLS fix ───
-- USING(FALSE) blocks ALL roles including service_role.
-- Disable RLS entirely since only service_role accesses this table.

DROP POLICY webhook_queue_service ON webhook_queue;
ALTER TABLE webhook_queue DISABLE ROW LEVEL SECURITY;

-- ─── Issue 4: Cascade soft-delete orphans comments and brain_dumps ───
-- Add hard-delete cascade for comments and brain_dumps on team soft-delete

CREATE OR REPLACE FUNCTION cascade_soft_delete_team()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Cascade soft delete to all team-scoped tables with deleted_at
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
    -- Hard delete ephemeral + non-soft-delete data
    DELETE FROM comments WHERE team_id = NEW.id;
    DELETE FROM brain_dumps WHERE team_id = NEW.id;
    DELETE FROM notifications WHERE team_id = NEW.id;
    DELETE FROM team_invites WHERE team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
