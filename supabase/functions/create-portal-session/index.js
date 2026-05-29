import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno";
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
        if (!stripeSecretKey) {
            const origin = req.headers.get("origin") || "https://www.trackowl.io";
            const redirectUrl = `${origin}/dashboard/settings/billing?mock_portal=true`;
            return new Response(JSON.stringify({ url: redirectUrl }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
        });
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // 1. Get authenticated user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader)
            throw new Error("Authorization header is missing");
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            throw new Error("Invalid or expired authorization token");
        }
        // 2. Fetch member details
        const { data: member, error: memberErr } = await supabase
            .from("members")
            .select("organization_id, role")
            .eq("auth_user_id", user.id)
            .single();
        if (memberErr || !member) {
            throw new Error("Member profile not found for this authenticated user.");
        }
        if (member.role !== "Admin") {
            throw new Error("Only administrators can manage billing.");
        }
        // 3. Fetch organization's stripe customer id
        const { data: org, error: orgErr } = await supabase
            .from("organizations")
            .select("stripe_customer_id")
            .eq("id", member.organization_id)
            .single();
        if (orgErr || !org) {
            throw new Error("Organization profile not found.");
        }
        if (!org.stripe_customer_id) {
            throw new Error("This organization does not have an active Stripe customer profile.");
        }
        // 4. Create Stripe Customer Billing Portal Session
        const origin = req.headers.get("origin") || "https://www.trackowl.io";
        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripe_customer_id,
            return_url: `${origin}/dashboard/settings/billing`,
        });
        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
    catch (err) {
        console.error("🚨 Error in create-portal-session:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
//# sourceMappingURL=index.js.map