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

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch (_) {}
    const { seatsCount } = bodyData;

    if (typeof seatsCount !== "number" || seatsCount < 1) {
      throw new Error("Invalid seats count");
    }

    if (!stripeSecretKey) {
      // Sandbox mode mock
      return new Response(JSON.stringify({ success: true, sandbox: true }), {
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

    if (!member || (member.role !== "Admin" && member.role !== "Owner")) throw new Error("Admin or Owner access required to update seats");

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", member.organization_id)
      .single();

    if (!org?.stripe_subscription_id) {
      throw new Error("This organization does not have an active Stripe subscription.");
    }

    // Retrieve subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new Error("Could not find a valid subscription item to update.");
    }

    const billableSeats = Math.max(1, seatsCount - 1);

    // Update the subscription item quantity
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [
        {
          id: subscriptionItemId,
          quantity: billableSeats,
        },
      ],
      proration_behavior: "always_invoice",
    });

    // The webhook will automatically sync the new seat count to the DB
    // But we can trigger a manual sync-subscription call locally or let the frontend poll

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("🚨 Error in update-seats:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
