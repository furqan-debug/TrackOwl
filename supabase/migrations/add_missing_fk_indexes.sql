-- Add missing foreign key indexes to improve JOIN and DELETE cascade performance

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);

CREATE INDEX IF NOT EXISTS idx_members_organization_id ON members(organization_id);

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

CREATE INDEX IF NOT EXISTS idx_todos_project_id ON todos(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_assignee_id ON todos(assignee_id);

CREATE INDEX IF NOT EXISTS idx_timesheet_approvals_member_id ON timesheet_approvals(member_id);
