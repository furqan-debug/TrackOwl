-- Migration to add Security Definer RPC functions for Support Admin Portal

-- 1. Update RLS on support_tickets to allow anonymous inserts (if user is not logged in)
DROP POLICY IF EXISTS "Users can insert their own tickets" ON support_tickets;
CREATE POLICY "Users can insert their own tickets" ON support_tickets 
  FOR INSERT 
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 2. Update RLS on support_messages to allow anonymous inserts (if user is not logged in)
DROP POLICY IF EXISTS "Users can insert messages to their tickets" ON support_messages;
CREATE POLICY "Users can insert messages to their tickets" ON support_messages 
  FOR INSERT 
  WITH CHECK (
    sender_id IS NULL OR auth.uid() = sender_id
  );


-- RPC Functions for the Support Admin Dashboard
-- These bypass RLS intentionally to allow the shared secret 'supersecret123' to grant admin access.

-- Fetch all tickets
CREATE OR REPLACE FUNCTION admin_get_tickets(secret TEXT)
RETURNS SETOF support_tickets AS $$
BEGIN
  IF secret = 'supersecret123' THEN
    RETURN QUERY SELECT * FROM support_tickets ORDER BY updated_at DESC;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fetch messages for a specific ticket
CREATE OR REPLACE FUNCTION admin_get_messages(secret TEXT, p_ticket_id UUID)
RETURNS SETOF support_messages AS $$
BEGIN
  IF secret = 'supersecret123' THEN
    RETURN QUERY SELECT * FROM support_messages WHERE ticket_id = p_ticket_id ORDER BY created_at ASC;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Admin reply to a ticket
CREATE OR REPLACE FUNCTION admin_reply_ticket(secret TEXT, p_ticket_id UUID, p_message TEXT)
RETURNS support_messages AS $$
DECLARE
  new_msg support_messages;
BEGIN
  IF secret = 'supersecret123' THEN
    -- Insert the message
    INSERT INTO support_messages (ticket_id, sender_id, is_ai, message)
    VALUES (p_ticket_id, NULL, false, p_message)
    RETURNING * INTO new_msg;

    -- Update ticket's updated_at
    UPDATE support_tickets SET updated_at = NOW() WHERE id = p_ticket_id;

    RETURN new_msg;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update ticket status
CREATE OR REPLACE FUNCTION admin_update_ticket_status(secret TEXT, p_ticket_id UUID, p_status TEXT)
RETURNS void AS $$
BEGIN
  IF secret = 'supersecret123' THEN
    UPDATE support_tickets SET status = p_status, updated_at = NOW() WHERE id = p_ticket_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
