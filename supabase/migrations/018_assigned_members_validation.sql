-- Migration 018: Validate assigned_members UUIDs belong to the project's team
--
-- The assigned_members UUID[] column on projects accepts arbitrary UUIDs.
-- This trigger validates that all UUIDs reference users who are members of
-- the project's team, preventing cross-team user assignment.

CREATE OR REPLACE FUNCTION validate_assigned_members()
RETURNS TRIGGER AS $$
DECLARE
  member_id UUID;
BEGIN
  IF NEW.assigned_members IS NOT NULL AND array_length(NEW.assigned_members, 1) > 0 THEN
    -- Remove duplicates
    NEW.assigned_members := ARRAY(SELECT DISTINCT unnest(NEW.assigned_members));

    -- Validate each UUID is a member of the project's team
    FOREACH member_id IN ARRAY NEW.assigned_members
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = NEW.team_id AND user_id = member_id
      ) THEN
        RAISE EXCEPTION 'User % is not a member of this project''s team', member_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_assigned_members_trigger ON projects;
CREATE TRIGGER validate_assigned_members_trigger
  BEFORE INSERT OR UPDATE OF assigned_members ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_assigned_members();

-- Also clean up assigned_members when a user is removed from a team
CREATE OR REPLACE FUNCTION cleanup_assigned_members_on_team_leave()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET assigned_members = array_remove(assigned_members, OLD.user_id)
  WHERE team_id = OLD.team_id
    AND OLD.user_id = ANY(assigned_members);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_assigned_members_trigger ON team_members;
CREATE TRIGGER cleanup_assigned_members_trigger
  AFTER DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_assigned_members_on_team_leave();
