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

    // If Stripe not configured, return empty list (sandbox/dev mode)
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is missing");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid or expired authorization token");

    // 2. Member + org
    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("organization_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (memberErr || !member) throw new Error("Member profile not found.");
    if (member.role !== "Admin") throw new Error("Only administrators can view billing.");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", member.organization_id)
      .single();

    if (orgErr || !org) throw new Error("Organization not found.");
    if (!org.stripe_customer_id) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Fetch invoices from Stripe (latest 20)
    const stripeInvoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 20,
    });

    const invoices = stripeInvoices.data.map((inv) => {
      let desc = inv.description;
      if (!desc) {
        if (inv.billing_reason === 'subscription_update') {
          desc = "Seat Adjustment (Prorated)";
        } else {
          desc = inv.lines?.data?.[0]?.description || "Subscription";
        }
      }

      return {
        id: inv.id,
        date: inv.created,
        description: desc,
        amount: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status,
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
      };
    });

    return new Response(JSON.stringify({ invoices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("🚨 Error in get-invoices:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
