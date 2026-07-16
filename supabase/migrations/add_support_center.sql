-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    type TEXT NOT NULL CHECK (type IN ('Live Chat', 'Email Ticket', 'Bug Report', 'Feature Request')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed')),
    assigned_to UUID REFERENCES auth.users(id),
    subject TEXT,
    system_info JSONB, -- Stores OS, App Version, Logs, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id), -- Null if sent by AI
    is_ai BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    attachments JSONB, -- Array of URLs or paths
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Articles Table (for AI Context using pgvector)
CREATE TABLE IF NOT EXISTS support_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI text-embedding-ada-002 size
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_support_ticket_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_modtime
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_support_ticket_modtime();

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_articles ENABLE ROW LEVEL SECURITY;

-- Articles: Anyone can read, only super-admins can insert/update (simplification: true for read)
CREATE POLICY "Public articles are viewable by everyone" ON support_articles FOR SELECT USING (true);

-- Tickets: Users can read their own tickets
CREATE POLICY "Users can view their own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages: Users can read messages in their tickets
CREATE POLICY "Users can view messages in their tickets" ON support_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
);
CREATE POLICY "Users can insert messages to their tickets" ON support_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()) AND auth.uid() = sender_id
);

-- We'll add broader admin policies later when we implement the Admin portal logic.
