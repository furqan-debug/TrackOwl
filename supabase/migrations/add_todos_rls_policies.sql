-- RLS policies for todos + todo_assignees (organization-scoped via project).

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_assignees ENABLE ROW LEVEL SECURITY;

-- Remove old policies if they exist
DROP POLICY IF EXISTS "todos_org_select" ON todos;
DROP POLICY IF EXISTS "todos_org_insert" ON todos;
DROP POLICY IF EXISTS "todos_org_update" ON todos;
DROP POLICY IF EXISTS "todos_org_delete" ON todos;
DROP POLICY IF EXISTS "todos_service_role_all" ON todos;

DROP POLICY IF EXISTS "todo_assignees_org_select" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_org_insert" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_org_update" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_org_delete" ON todo_assignees;
DROP POLICY IF EXISTS "todo_assignees_service_role_all" ON todo_assignees;

-- Todos access: only users whose member belongs to the same org as todo's project org
CREATE POLICY "todos_org_select"
  ON todos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN members me ON me.organization_id = p.organization_id
      WHERE p.id = todos.project_id
        AND me.id = auth.uid()
    )
  );

CREATE POLICY "todos_org_insert"
  ON todos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN members me ON me.organization_id = p.organization_id
      WHERE p.id = todos.project_id
        AND me.id = auth.uid()
    )
  );

CREATE POLICY "todos_org_update"
  ON todos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN members me ON me.organization_id = p.organization_id
      WHERE p.id = todos.project_id
        AND me.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN members me ON me.organization_id = p.organization_id
      WHERE p.id = todos.project_id
        AND me.id = auth.uid()
    )
  );

CREATE POLICY "todos_org_delete"
  ON todos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN members me ON me.organization_id = p.organization_id
      WHERE p.id = todos.project_id
        AND me.id = auth.uid()
    )
  );

-- Todo assignees access: scoped by parent todo's project organization
CREATE POLICY "todo_assignees_org_select"
  ON todo_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM todos t
      JOIN projects p ON p.id = t.project_id
      JOIN members me ON me.organization_id = p.organization_id
      WHERE t.id = todo_assignees.todo_id
        AND me.id = auth.uid()
    )
  );

CREATE POLICY "todo_assignees_org_insert"
  ON todo_assignees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM todos t
      JOIN projects p ON p.id = t.project_id
      JOIN members me ON me.organization_id = p.organization_id
      WHERE t.id = todo_assignees.todo_id
        AND me.id = auth.uid()
    )
  );

CREATE POLICY "todo_assignees_org_update"
  ON todo_assignees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM todos t
      JOIN projects p ON p.id = t.project_id
      JOIN members me ON me.organization_id = p.organization_id
      WHERE t.id = todo_assignees.todo_id
        AND me.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM todos t
      JOIN projects p ON p.id = t.project_id
      JOIN members me ON me.organization_id = p.organization_id
      WHERE t.id = todo_assignees.todo_id
        AND me.id = auth.uid()
    )
  );

CREATE POLICY "todo_assignees_org_delete"
  ON todo_assignees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM todos t
      JOIN projects p ON p.id = t.project_id
      JOIN members me ON me.organization_id = p.organization_id
      WHERE t.id = todo_assignees.todo_id
        AND me.id = auth.uid()
    )
  );

-- Service role bypass for backend operations
CREATE POLICY "todos_service_role_all"
  ON todos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "todo_assignees_service_role_all"
  ON todo_assignees FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
