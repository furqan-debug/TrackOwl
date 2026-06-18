import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("--- INVOKE START ---");

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get body
    const bodyText = await req.text();
    console.log("Body received:", bodyText);
    
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      throw new Error(`Invalid JSON: ${bodyText}`);
    }

    const { email, role, pay_rate, bill_rate, weekly_limit, daily_limit, admin_portal_url } = body;
    if (!email) throw new Error("Email is required");

    // Get admin user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Authorization header missing");

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !adminUser) {
      console.error("Auth error:", authError);
      throw new Error("Invalid admin session");
    }

    // Get organization ID
    const { data: adminMember, error: memberError } = await supabaseClient
      .from('members')
      .select('organization_id')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (memberError || !adminMember?.organization_id) {
      console.error("Member fetch error:", memberError);
      throw new Error('Admin organization not found');
    }

    const orgId = adminMember.organization_id;

    // Get org name
    const { data: org } = await supabaseClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    const orgName = org?.name || 'Trackora';

    // Check if member already exists and what their status is
    const { data: existingMember } = await supabaseClient
      .from('members')
      .select('status, full_name, role, pay_rate, bill_rate, weekly_limit, daily_limit')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Create invite link (for Resend)
    let actionLink;
    let isExistingUser = false;

    const { data: invite, error: inviteError } = await supabaseClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: { redirectTo: `${admin_portal_url}/accept-invite` }
    });

    if (inviteError) {
      if (inviteError.message.includes('already been registered')) {
        console.log("User already exists in Auth, skipping invite link generation, using magiclink");
        
        // Let's generate a magic link so they can accept the invite or login
        const { data: magicLink, error: magicLinkError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: { redirectTo: `${admin_portal_url}/accept-invite` }
        });
        
        if (magicLinkError) {
          console.error("Magic link error:", magicLinkError);
          isExistingUser = true; // Fallback
        } else {
           actionLink = magicLink.properties.action_link;
        }

      } else {
        console.error("Invite link error:", inviteError);
        throw new Error(`Supabase invite error: ${inviteError.message}`);
      }
    } else {
      actionLink = invite.properties.action_link;
    }

    // Upsert member record - PRESERVE ACTIVE STATUS
    const newStatus = existingMember?.status === 'Active' ? 'Active' : 'Pending';

    const { data: newMember, error: createError } = await supabaseClient
      .from('members')
      .upsert({
        organization_id: orgId,
        email: email.toLowerCase(),
        full_name: existingMember?.full_name || email.split('@')[0],
        role: role || existingMember?.role || 'User',
        pay_rate: pay_rate !== undefined ? pay_rate : (existingMember?.pay_rate || 0),
        bill_rate: bill_rate !== undefined ? bill_rate : (existingMember?.bill_rate || 0),
        weekly_limit: weekly_limit !== undefined ? weekly_limit : (existingMember?.weekly_limit || 40),
        daily_limit: daily_limit !== undefined ? daily_limit : (existingMember?.daily_limit || 8),
        status: newStatus
      }, { onConflict: 'email' })
      .select()
      .single();

    if (createError) {
      console.error("Member create error:", createError);
      throw new Error(`Database error: ${createError.message}`);
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");

    if (!resendApiKey || !resendFrom) {
      console.warn("MISSING RESEND CONFIG: Email will not be sent.");
      return new Response(JSON.stringify({ ok: true, member: newMember }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let subject = "";
    let html = "";

    // If we have an actionLink, it means they are pending OR we successfully generated a magic link
    if (actionLink && existingMember?.status !== 'Active') {
        subject = `Invitation to join ${orgName}`;
        html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 16px; background: #ffffff;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Welcome to ${orgName}</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">You have been invited to join the team.</p>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">Please click the button below to accept your invitation and set up your account:</p>
          <a href="${actionLink}" style="display: inline-block; background: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);">Accept Invitation</a>
        </div>
      `;
    } else {
        subject = `You've been added to ${orgName}`;
        html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 16px; background: #ffffff;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Hello there!</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">You have been added to <strong>${orgName}</strong>.</p>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">Since you already have an account, you can simply log in to your dashboard to get started.</p>
          <a href="${admin_portal_url}/login" style="display: inline-block; background: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);">Go to Dashboard</a>
        </div>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [email],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const resText = await res.text();
      console.error("Resend API error:", resText);
      throw new Error(`Email failed: ${resText}`);
    }

    console.log("Invite successful!");
    return new Response(JSON.stringify({ ok: true, member: newMember }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("CRITICAL FUNCTION ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
