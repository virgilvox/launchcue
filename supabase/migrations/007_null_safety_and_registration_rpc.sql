-- ============================================================================
-- 007_null_safety_and_registration_rpc.sql
-- 1. Fix NULL handling in auth helper functions (can_write, is_admin)
-- 2. Add register_user RPC for atomic registration
-- 3. Add trigger to auto-inject team_id and created_by on INSERT
-- ============================================================================

-- ─── 1. Fix NULL handling in can_write() and is_admin() ───
-- NULL IN (...) returns NULL, not FALSE. RLS treats NULL as deny, but
-- COALESCE makes intent explicit and prevents subtle bugs.

CREATE OR REPLACE FUNCTION auth.can_write()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(auth.current_team_role() IN ('owner', 'admin', 'member'), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(auth.current_team_role() IN ('owner', 'admin'), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── 2. Atomic registration RPC ───
-- Creates app user, default team, and team membership in a single transaction.

CREATE OR REPLACE FUNCTION public.register_user(
  p_auth_id UUID,
  p_name TEXT,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_team_name TEXT;
BEGIN
  -- Create app-level user
  INSERT INTO users (auth_id, name, email, email_verified)
  VALUES (p_auth_id, p_name, p_email, FALSE)
  RETURNING id INTO v_user_id;

  -- Create default team
  v_team_name := p_name || '''s Team';
  INSERT INTO teams (name, owner_id)
  VALUES (v_team_name, v_user_id)
  RETURNING id INTO v_team_id;

  -- Add user as team owner
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'owner');

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'team_id', v_team_id,
    'team_name', v_team_name
  );
END;
$$;

-- Allow authenticated users to call register_user (needed during signup flow)
GRANT EXECUTE ON FUNCTION public.register_user(UUID, TEXT, TEXT) TO authenticated;

-- ─── 3. Auto-inject team_id and created_by on INSERT ───
-- Uses auth.current_team_id() and auth.app_user_id() so stores don't need
-- to manually pass these fields.

CREATE OR REPLACE FUNCTION public.auto_inject_team_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-set team_id if the column exists and is NULL
  IF TG_ARGV[0] = 'team_and_user' OR TG_ARGV[0] = 'team_only' THEN
    IF NEW.team_id IS NULL THEN
      NEW.team_id := auth.current_team_id();
    END IF;
  END IF;

  -- Auto-set created_by if the column exists and value is NULL
  IF TG_ARGV[0] = 'team_and_user' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.app_user_id();
    END IF;
  END IF;

  -- Auto-set user_id for tables that use user_id instead of created_by
  IF TG_ARGV[0] = 'team_and_userid' THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.app_user_id();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to all team-scoped tables that have team_id + created_by
CREATE TRIGGER trg_auto_context_tasks
  BEFORE INSERT ON tasks FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_projects
  BEFORE INSERT ON projects FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_clients
  BEFORE INSERT ON clients FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_campaigns
  BEFORE INSERT ON campaigns FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_notes
  BEFORE INSERT ON notes FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_calendar_events
  BEFORE INSERT ON calendar_events FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_brain_dumps
  BEFORE INSERT ON brain_dumps FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_resources
  BEFORE INSERT ON resources FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_scope_templates
  BEFORE INSERT ON scope_templates FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_scopes
  BEFORE INSERT ON scopes FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

CREATE TRIGGER trg_auto_context_invoices
  BEFORE INSERT ON invoices FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_user');

-- Tables with team_id + user_id (not created_by)
CREATE TRIGGER trg_auto_context_comments
  BEFORE INSERT ON comments FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

CREATE TRIGGER trg_auto_context_notifications
  BEFORE INSERT ON notifications FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

CREATE TRIGGER trg_auto_context_api_keys
  BEFORE INSERT ON api_keys FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

CREATE TRIGGER trg_auto_context_audit_logs
  BEFORE INSERT ON audit_logs FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

-- Tables with only team_id (no user reference)
CREATE TRIGGER trg_auto_context_webhooks
  BEFORE INSERT ON webhooks FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_only');

CREATE TRIGGER trg_auto_context_onboarding_checklists
  BEFORE INSERT ON onboarding_checklists FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_only');

CREATE TRIGGER trg_auto_context_client_invitations
  BEFORE INSERT ON client_invitations FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_only');
