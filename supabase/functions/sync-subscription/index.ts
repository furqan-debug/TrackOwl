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
      return new Response(JSON.stringify({ synced: false, reason: "no_stripe_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is missing");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid or expired authorization token");

    // Get org
    const { data: member } = await supabase
      .from("members")
      .select("organization_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (!member || (member.role !== "Admin" && member.role !== "Owner")) throw new Error("Admin or Owner access required");

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_subscription_id, stripe_customer_id, seats_purchased")
      .eq("id", member.organization_id)
      .single();

    if (!org?.stripe_subscription_id) {
      return new Response(JSON.stringify({ synced: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch live subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

    const billableSeats = subscription.items.data[0]?.quantity ?? 1;
    const totalSeats = billableSeats + 1; // +1 for free owner seat

    // Update DB with fresh values
    await supabase
      .from("organizations")
      .update({
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        seats_purchased: totalSeats,
      })
      .eq("id", member.organization_id);

    return new Response(JSON.stringify({
      synced: true,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      seats: totalSeats,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("🚨 Error in sync-subscription:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
