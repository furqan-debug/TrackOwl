-- =============================================================================
-- Empty-string avatar_url means "no picture", so store NULL
--
-- The desktop Settings screen seeded its state from `user.avatar_url || ''` and
-- sent that back on every save, so any member with no picture who changed a
-- name, a phone number or a notification toggle had '' written over their row.
--
-- The code no longer does this (avatar_url is only sent when a picture was
-- actually picked), but the rows it already wrote are still there. Four of
-- them, none pointing at a file.
--
-- '' and NULL both render as "no picture" today because every call site checks
-- truthiness, so this is a tidy-up rather than a fix. It matters for anything
-- that later asks `avatar_url IS NULL` and quietly gets the wrong answer.
-- =============================================================================

UPDATE members
SET avatar_url = NULL
WHERE avatar_url = '';
