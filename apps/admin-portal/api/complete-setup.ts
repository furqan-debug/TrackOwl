import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: 'Server misconfiguration' });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '');

    try {
        // Verify the user's token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

        const { full_name, phone } = req.body;
        if (!full_name?.trim()) return res.status(400).json({ error: 'Full name is required' });

        // Look up existing member by email (handles legacy mismatched IDs)
        const { data: existingMember } = await supabaseAdmin
            .from('members')
            .select('id, role')
            .ilike('email', user.email || '')
            .maybeSingle();

        if (existingMember) {
            // Update existing member row
            await supabaseAdmin
                .from('members')
                .update({ 
                    full_name: full_name.trim(), 
                    phone: phone?.trim() || null,
                    status: 'Active',
                    // Also sync the ID to auth.uid() so future calls work by both ID and email
                    id: user.id
                })
                .eq('email', user.email || '');

            return res.status(200).json({ success: true, member: { role: existingMember.role } });
        } else {
            // Fallback: create member row if trigger didn't fire (e.g. user was pre-existing in auth)
            const { error: insertError } = await supabaseAdmin
                .from('members')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: full_name.trim(),
                    phone: phone?.trim() || null,
                    role: 'User',
                    status: 'Active',
                });

            if (insertError) return res.status(500).json({ error: insertError.message });
            return res.status(200).json({ success: true, member: { role: 'User' } });
        }
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
