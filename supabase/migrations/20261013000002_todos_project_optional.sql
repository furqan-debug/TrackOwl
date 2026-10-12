-- A task can belong to a project, or to a person, or both.
--
-- todos.project_id was NOT NULL, so every task had to name a project even when
-- it was being handed straight to someone. The portal enforced the same rule
-- and disabled Save until a project was chosen.
--
-- The rule is now "a project or an assignee", carried by the check constraint
-- below rather than by the column, so a task given to a person needs no
-- project and a task with nobody on it still needs somewhere to live.
--
-- ALREADY APPLIED to the production database. This file exists so the repo
-- records the schema that is live; written to be safe to run again, and safe
-- to run against a database that has not had it.
--
-- Reversing it is only clean while no project-less rows exist. Once tasks are
-- saved without a project, restoring NOT NULL means deciding what project
-- those tasks belong to first.

alter table public.todos
    alter column project_id drop not null;

alter table public.todos
    drop constraint if exists todos_project_or_assignee;

alter table public.todos
    add constraint todos_project_or_assignee
    check (project_id is not null or assignee_id is not null);
