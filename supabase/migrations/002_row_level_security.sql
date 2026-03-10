-- ============================================================================
-- 002_row_level_security.sql — RLS policies for team isolation + RBAC
-- Replaces all 33+ app-level teamId checks with database-enforced isolation
-- ============================================================================

-- Helper: Get current user's active team ID from JWT metadata
-- Supabase Auth stores custom claims in raw_user_meta_data
CREATE OR REPLACE FUNCTION auth.current_team_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'current_team_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get current user's app-level user ID
CREATE OR REPLACE FUNCTION auth.app_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get current user's role in their active team
CREATE OR REPLACE FUNCTION auth.current_team_role()
RETURNS team_role AS $$
  SELECT role FROM public.team_members
  WHERE team_id = auth.current_team_id()
    AND user_id = auth.app_user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Check if current user can write (owner, admin, or member)
CREATE OR REPLACE FUNCTION auth.can_write()
RETURNS BOOLEAN AS $$
  SELECT auth.current_team_role() IN ('owner', 'admin', 'member');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Check if current user is admin or owner
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.current_team_role() IN ('owner', 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Users — can read own profile, update own profile
-- ============================================================================

CREATE POLICY users_select ON users FOR SELECT
  USING (id = auth.app_user_id() OR id IN (
    SELECT user_id FROM team_members WHERE team_id = auth.current_team_id()
  ));

CREATE POLICY users_update ON users FOR UPDATE
  USING (id = auth.app_user_id());

-- ============================================================================
-- Teams — members can read, owner/admin can update
-- ============================================================================

CREATE POLICY teams_select ON teams FOR SELECT
  USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.app_user_id()));

CREATE POLICY teams_insert ON teams FOR INSERT
  WITH CHECK (owner_id = auth.app_user_id());

CREATE POLICY teams_update ON teams FOR UPDATE
  USING (id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY teams_delete ON teams FOR DELETE
  USING (owner_id = auth.app_user_id());

-- ============================================================================
-- Team Members — team isolation, admin manages members
-- ============================================================================

CREATE POLICY team_members_select ON team_members FOR SELECT
  USING (team_id = auth.current_team_id());

CREATE POLICY team_members_insert ON team_members FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY team_members_update ON team_members FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY team_members_delete ON team_members FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

-- ============================================================================
-- Team Invites — team isolation, admin manages
-- ============================================================================

CREATE POLICY team_invites_select ON team_invites FOR SELECT
  USING (team_id = auth.current_team_id());

CREATE POLICY team_invites_insert ON team_invites FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY team_invites_update ON team_invites FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY team_invites_delete ON team_invites FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

-- ============================================================================
-- Standard team-scoped entity policies (macro pattern)
-- Read: team members | Write: owner/admin/member | Delete: owner/admin/member
-- ============================================================================

-- Clients
CREATE POLICY clients_select ON clients FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY clients_insert ON clients FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY clients_update ON clients FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY clients_delete ON clients FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Client Contacts (via client's team_id)
CREATE POLICY client_contacts_select ON client_contacts FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id()));

CREATE POLICY client_contacts_insert ON client_contacts FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id()) AND auth.can_write());

CREATE POLICY client_contacts_update ON client_contacts FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id()) AND auth.can_write());

CREATE POLICY client_contacts_delete ON client_contacts FOR DELETE
  USING (client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id()) AND auth.can_write());

-- Projects
CREATE POLICY projects_select ON projects FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY projects_update ON projects FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY projects_delete ON projects FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Tasks
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Campaigns
CREATE POLICY campaigns_select ON campaigns FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY campaigns_insert ON campaigns FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY campaigns_update ON campaigns FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY campaigns_delete ON campaigns FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Notes
CREATE POLICY notes_select ON notes FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY notes_insert ON notes FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY notes_update ON notes FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY notes_delete ON notes FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Brain Dumps
CREATE POLICY brain_dumps_select ON brain_dumps FOR SELECT
  USING (team_id = auth.current_team_id());

CREATE POLICY brain_dumps_insert ON brain_dumps FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY brain_dumps_update ON brain_dumps FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY brain_dumps_delete ON brain_dumps FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Calendar Events
CREATE POLICY calendar_events_select ON calendar_events FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY calendar_events_insert ON calendar_events FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Resources
CREATE POLICY resources_select ON resources FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY resources_insert ON resources FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY resources_update ON resources FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY resources_delete ON resources FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Scope Templates
CREATE POLICY scope_templates_select ON scope_templates FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY scope_templates_insert ON scope_templates FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY scope_templates_update ON scope_templates FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY scope_templates_delete ON scope_templates FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Scopes
CREATE POLICY scopes_select ON scopes FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY scopes_insert ON scopes FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY scopes_update ON scopes FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY scopes_delete ON scopes FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Invoices
CREATE POLICY invoices_select ON invoices FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY invoices_insert ON invoices FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY invoices_update ON invoices FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY invoices_delete ON invoices FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- ============================================================================
-- API Keys — user can manage own, admin can see team's
-- ============================================================================

CREATE POLICY api_keys_select ON api_keys FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY api_keys_insert ON api_keys FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND user_id = auth.app_user_id());

CREATE POLICY api_keys_update ON api_keys FOR UPDATE
  USING (team_id = auth.current_team_id() AND (user_id = auth.app_user_id() OR auth.is_admin()));

CREATE POLICY api_keys_delete ON api_keys FOR DELETE
  USING (team_id = auth.current_team_id() AND (user_id = auth.app_user_id() OR auth.is_admin()));

-- ============================================================================
-- Comments — team-scoped
-- ============================================================================

CREATE POLICY comments_select ON comments FOR SELECT
  USING (team_id = auth.current_team_id());

CREATE POLICY comments_insert ON comments FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY comments_update ON comments FOR UPDATE
  USING (team_id = auth.current_team_id() AND user_id = auth.app_user_id());

CREATE POLICY comments_delete ON comments FOR DELETE
  USING (team_id = auth.current_team_id() AND (user_id = auth.app_user_id() OR auth.is_admin()));

-- ============================================================================
-- Notifications — user sees own only
-- ============================================================================

CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (user_id = auth.app_user_id() AND team_id = auth.current_team_id());

CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (team_id = auth.current_team_id());

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (user_id = auth.app_user_id());

CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (user_id = auth.app_user_id());

-- ============================================================================
-- Client Invitations — team-scoped, admin manages
-- ============================================================================

CREATE POLICY client_invitations_select ON client_invitations FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY client_invitations_insert ON client_invitations FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY client_invitations_update ON client_invitations FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY client_invitations_delete ON client_invitations FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

-- ============================================================================
-- Onboarding Checklists — team-scoped
-- ============================================================================

CREATE POLICY onboarding_checklists_select ON onboarding_checklists FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY onboarding_checklists_insert ON onboarding_checklists FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY onboarding_checklists_update ON onboarding_checklists FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY onboarding_checklists_delete ON onboarding_checklists FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- ============================================================================
-- Audit Logs — team-scoped, read-only (admin only)
-- ============================================================================

CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (team_id = auth.current_team_id());

-- ============================================================================
-- Webhooks — team-scoped, admin manages
-- ============================================================================

CREATE POLICY webhooks_select ON webhooks FOR SELECT
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);

CREATE POLICY webhooks_insert ON webhooks FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY webhooks_update ON webhooks FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

CREATE POLICY webhooks_delete ON webhooks FOR DELETE
  USING (team_id = auth.current_team_id() AND auth.is_admin());

-- ============================================================================
-- Webhook Queue — service role only (no user access)
-- ============================================================================

CREATE POLICY webhook_queue_service ON webhook_queue FOR ALL
  USING (FALSE); -- Only service_role key can access

-- ============================================================================
-- Password Reset / Email Verification Tokens — user sees own only
-- ============================================================================

CREATE POLICY password_reset_tokens_select ON password_reset_tokens FOR SELECT
  USING (user_id = auth.app_user_id());

CREATE POLICY password_reset_tokens_insert ON password_reset_tokens FOR INSERT
  WITH CHECK (TRUE); -- System creates these

CREATE POLICY email_verification_tokens_select ON email_verification_tokens FOR SELECT
  USING (user_id = auth.app_user_id());

CREATE POLICY email_verification_tokens_insert ON email_verification_tokens FOR INSERT
  WITH CHECK (TRUE); -- System creates these
