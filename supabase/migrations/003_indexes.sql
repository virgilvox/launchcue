-- ============================================================================
-- 003_indexes.sql — Performance indexes mirroring MongoDB indexes
-- ============================================================================

-- ─── Users ───
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);

-- ─── Teams ───
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_not_deleted ON teams(id) WHERE deleted_at IS NULL;

-- ─── Team Members ───
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ─── Team Invites ───
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX idx_team_invites_email ON team_invites(email);
CREATE INDEX idx_team_invites_status ON team_invites(status) WHERE status = 'pending';

-- ─── Clients ───
CREATE INDEX idx_clients_team_id ON clients(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_name ON clients(team_id, name);

-- ─── Client Contacts ───
CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);

-- ─── Projects ───
CREATE INDEX idx_projects_team_id ON projects(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- ─── Tasks ───
CREATE INDEX idx_tasks_team_id ON tasks(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- ─── Campaigns ───
CREATE INDEX idx_campaigns_team_id ON campaigns(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX idx_campaigns_status ON campaigns(team_id, status) WHERE deleted_at IS NULL;

-- ─── Notes ───
CREATE INDEX idx_notes_team_id ON notes(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_client_id ON notes(client_id);
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);

-- ─── Brain Dumps ───
CREATE INDEX idx_brain_dumps_team_id ON brain_dumps(team_id);
CREATE INDEX idx_brain_dumps_user_id ON brain_dumps(user_id);

-- ─── Calendar Events ───
CREATE INDEX idx_calendar_events_team_id ON calendar_events(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_dates ON calendar_events(start_time, end_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_task_id ON calendar_events(task_id);

-- ─── Resources ───
CREATE INDEX idx_resources_team_id ON resources(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_type ON resources(team_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);

-- ─── Scope Templates ───
CREATE INDEX idx_scope_templates_team_id ON scope_templates(team_id) WHERE deleted_at IS NULL;

-- ─── Scopes ───
CREATE INDEX idx_scopes_team_id ON scopes(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_scopes_client_id ON scopes(client_id);
CREATE INDEX idx_scopes_project_id ON scopes(project_id);
CREATE INDEX idx_scopes_status ON scopes(team_id, status) WHERE deleted_at IS NULL;

-- ─── Invoices ───
CREATE INDEX idx_invoices_team_id ON invoices(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE deleted_at IS NULL AND status IN ('sent', 'viewed');

-- ─── API Keys ───
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_keys_team_id ON api_keys(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- ─── Comments ───
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id);
CREATE INDEX idx_comments_team_id ON comments(team_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- ─── Notifications ───
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_team_id ON notifications(team_id);

-- ─── Client Invitations ───
CREATE INDEX idx_client_invitations_team_id ON client_invitations(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_invitations_token_prefix ON client_invitations(token_hash) WHERE status = 'pending';
CREATE INDEX idx_client_invitations_email ON client_invitations(email);

-- ─── Onboarding Checklists ───
CREATE INDEX idx_onboarding_team_id ON onboarding_checklists(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_onboarding_client_id ON onboarding_checklists(client_id);

-- ─── Audit Logs ───
CREATE INDEX idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(team_id, created_at DESC);

-- ─── Webhooks ───
CREATE INDEX idx_webhooks_team_id ON webhooks(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_webhooks_active ON webhooks(team_id, active) WHERE deleted_at IS NULL AND active = TRUE;

-- ─── Webhook Queue ───
CREATE INDEX idx_webhook_queue_pending ON webhook_queue(next_retry_at)
  WHERE completed_at IS NULL AND failed_at IS NULL;
CREATE INDEX idx_webhook_queue_webhook_id ON webhook_queue(webhook_id);

-- ─── Password Reset Tokens ───
CREATE INDEX idx_password_reset_prefix ON password_reset_tokens(token_prefix)
  WHERE used_at IS NULL;

-- ─── Full-text search indexes ───
CREATE INDEX idx_tasks_fts ON tasks USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_projects_fts ON projects USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_clients_fts ON clients USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_notes_fts ON notes USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
CREATE INDEX idx_campaigns_fts ON campaigns USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_resources_fts ON resources USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
