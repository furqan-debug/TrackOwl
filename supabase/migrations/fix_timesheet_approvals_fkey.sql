-- Drop the existing foreign key constraint
ALTER TABLE timesheet_approvals
DROP CONSTRAINT IF EXISTS timesheet_approvals_approved_by_fkey;

-- Add the new constraint with ON DELETE SET NULL
ALTER TABLE timesheet_approvals
ADD CONSTRAINT timesheet_approvals_approved_by_fkey 
FOREIGN KEY (approved_by) 
REFERENCES members(id) 
ON DELETE SET NULL;

-- Fix sessions user_id constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;

-- Fix support tickets user_id constraint
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;
