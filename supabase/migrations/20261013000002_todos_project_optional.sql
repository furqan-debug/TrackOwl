-- A task can belong to a project, or to a person, or both.
--
-- todos.project_id was NOT NULL, so every task had to name a project even when
-- it was being handed straight to someone. The portal enforced the same rule
-- and disabled Save until a project was chosen.
--
-- The rule is now "a project or an assignee", carried by the check constraint
-- below rather than by the column: a task given to a person needs no project,
-- and a task with nobody on it still needs somewhere to live.
--
-- ALREADY APPLIED. This was run by hand against the production database before
-- it was written down. The file exists so the repo describes the schema that
-- is actually live — without it, a database built from these migrations gets
-- project_id NOT NULL and disagrees with production. Safe to run again, and
-- safe against a database that has never had it.
--
-- Reversing it is only clean while no project-less rows exist. Once tasks are
-- saved without a project, restoring NOT NULL means first deciding what
-- project those tasks belong to.

alter table public.todos
    alter column project_id drop not null;

alter table public.todos
    drop constraint if exists todos_project_or_assignee;

alter table public.todos
    add constraint todos_project_or_assignee
    check (project_id is not null or assignee_id is not null);
