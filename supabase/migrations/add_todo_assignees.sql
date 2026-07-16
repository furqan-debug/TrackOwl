-- Allow assigning multiple members to a single task.
CREATE TABLE IF NOT EXISTS todo_assignees (
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_todo_assignees_member_id ON todo_assignees(member_id);

-- Backfill existing single-assignee tasks into the new relation.
INSERT INTO todo_assignees (todo_id, member_id)
SELECT id, assignee_id
FROM todos
WHERE assignee_id IS NOT NULL
ON CONFLICT (todo_id, member_id) DO NOTHING;
