-- Migration 010: Add DELETE audit triggers and audit for team_members/team_invites
-- Addresses gap: hard deletes were not audited, and team membership changes were untracked.

-- Audit trigger for DELETE operations
CREATE OR REPLACE FUNCTION public.create_delete_audit_log()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
  VALUES (
    COALESCE(auth.app_user_id(), OLD.user_id, OLD.created_by),
    COALESCE(OLD.team_id, auth.current_team_id()),
    'deleted',
    TG_TABLE_NAME,
    OLD.id::text
  );
  RETURN OLD;
END;
$$;

-- Apply DELETE audit triggers to tables that support hard delete
CREATE TRIGGER audit_comments_delete
  BEFORE DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION create_delete_audit_log();

CREATE TRIGGER audit_notifications_delete
  BEFORE DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION create_delete_audit_log();

-- Audit trigger for team_members changes (INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.audit_team_membership()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_action text;
  v_resource_id text;
  v_team_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'member_removed';
    v_resource_id := OLD.user_id::text;
    v_team_id := OLD.team_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'member_added';
    v_resource_id := NEW.user_id::text;
    v_team_id := NEW.team_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'member_role_changed';
    v_resource_id := NEW.user_id::text;
    v_team_id := NEW.team_id;
  END IF;

  INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
  VALUES (
    auth.app_user_id(),
    v_team_id,
    v_action,
    'team_members',
    v_resource_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER audit_team_members_changes
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW EXECUTE FUNCTION audit_team_membership();

-- Audit trigger for team_invites (INSERT/DELETE)
CREATE TRIGGER audit_team_invites_insert
  AFTER INSERT ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_team_invites_delete
  BEFORE DELETE ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION create_delete_audit_log();
