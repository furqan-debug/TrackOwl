-- Let the desktop app hear about tasks as they are assigned.
--
-- The app has always subscribed to postgres_changes on public.todos, but the
-- supabase_realtime publication only ever carried members, support_messages
-- and support_tickets. The channel subscribed happily and then received
-- nothing, so an assigned task could not appear until the app refetched —
-- which is why a user had to restart or reopen the app to see work given to
-- them.
--
-- Guarded so it is safe to run more than once: adding a table that is already
-- in a publication is an error, not a no-op.

-- todo_assignees as well as todos: a task shared with several people reaches
-- everyone after the first through that table, so without it they would still
-- be waiting for a refresh.
do $$
declare
    t text;
begin
    foreach t in array array['todos', 'todo_assignees'] loop
        if not exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = t
        ) then
            execute format('alter publication supabase_realtime add table public.%I', t);
        end if;
    end loop;
end
$$;

-- Realtime sends the old row on an UPDATE or DELETE only when the table has a
-- replica identity that includes it. Without this an UPDATE arrives with the
-- new values and nulls for everything else, so a client cannot tell that a
-- task was reassigned away from it.
alter table public.todos replica identity full;
