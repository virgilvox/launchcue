-- Fix: 4 tables have user_id (not created_by) but were assigned 'team_and_user' trigger mode.
-- The 'team_and_user' mode accesses NEW.created_by which doesn't exist on these tables,
-- causing a PL/pgSQL runtime error on every INSERT.
-- Fix: drop the wrong triggers and recreate with 'team_and_userid' mode.

DROP TRIGGER IF EXISTS trg_auto_context_campaigns ON campaigns;
CREATE TRIGGER trg_auto_context_campaigns
  BEFORE INSERT ON campaigns FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

DROP TRIGGER IF EXISTS trg_auto_context_notes ON notes;
CREATE TRIGGER trg_auto_context_notes
  BEFORE INSERT ON notes FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

DROP TRIGGER IF EXISTS trg_auto_context_calendar_events ON calendar_events;
CREATE TRIGGER trg_auto_context_calendar_events
  BEFORE INSERT ON calendar_events FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');

DROP TRIGGER IF EXISTS trg_auto_context_brain_dumps ON brain_dumps;
CREATE TRIGGER trg_auto_context_brain_dumps
  BEFORE INSERT ON brain_dumps FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_team_context('team_and_userid');
