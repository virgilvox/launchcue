-- Migration 011: Fix audit trigger functions that reference columns not present on all tables
--
-- Root cause: create_audit_log() uses COALESCE(auth.app_user_id(), NEW.created_by, NEW.user_id)
-- PL/pgSQL validates ALL NEW.field references at plan time regardless of COALESCE short-circuiting.
-- Tables with only created_by (tasks, projects, clients, invoices, scopes) fail on NEW.user_id.
-- Tables with only user_id (comments, notifications) would fail on OLD.created_by in delete trigger.
-- team_invites has neither column — has invited_by instead.
--
-- Fix: Use only auth.app_user_id() which works in all authenticated contexts.
-- This is the correct approach — the user performing the action is the one in the JWT,
-- not necessarily the row's created_by/user_id field.

-- Replace create_audit_log() — used by INSERT/UPDATE triggers on tasks, projects, clients, invoices, scopes, team_invites
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
    VALUES (
      auth.app_user_id(),
      NEW.team_id,
      'created',
      TG_TABLE_NAME,
      NEW.id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
    VALUES (
      auth.app_user_id(),
      NEW.team_id,
      CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'deleted' ELSE 'updated' END,
      TG_TABLE_NAME,
      NEW.id
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace create_delete_audit_log() — used by DELETE triggers on comments, notifications, team_invites
CREATE OR REPLACE FUNCTION public.create_delete_audit_log()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, team_id, action, resource_type, resource_id)
  VALUES (
    auth.app_user_id(),
    COALESCE(OLD.team_id, auth.current_team_id()),
    'deleted',
    TG_TABLE_NAME,
    OLD.id::text
  );
  RETURN OLD;
END;
$$;

-- No need to recreate triggers — they reference the function by name,
-- and CREATE OR REPLACE updates the function in place.
