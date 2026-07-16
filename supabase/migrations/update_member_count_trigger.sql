-- -----------------------------------------------------------------------------
-- Maintain member_count on organizations table
-- -----------------------------------------------------------------------------

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION update_org_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.organization_id IS NOT NULL THEN
    UPDATE organizations 
    SET member_count = member_count + 1 
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' AND OLD.organization_id IS NOT NULL THEN
    UPDATE organizations 
    SET member_count = member_count - 1 
    WHERE id = OLD.organization_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    -- Decrement old organization
    IF OLD.organization_id IS NOT NULL THEN
      UPDATE organizations 
      SET member_count = member_count - 1 
      WHERE id = OLD.organization_id;
    END IF;
    -- Increment new organization
    IF NEW.organization_id IS NOT NULL THEN
      UPDATE organizations 
      SET member_count = member_count + 1 
      WHERE id = NEW.organization_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the trigger to the members table
DROP TRIGGER IF EXISTS org_member_count_trigger ON members;

CREATE TRIGGER org_member_count_trigger
AFTER INSERT OR DELETE OR UPDATE OF organization_id
ON members
FOR EACH ROW
EXECUTE FUNCTION update_org_member_count();

-- 3. Recalculate existing counts to fix current inaccuracies
UPDATE organizations o
SET member_count = (
  SELECT COUNT(*) FROM members m WHERE m.organization_id = o.id
);
