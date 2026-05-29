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
      throw new Error("Stripe is not configured in sandbox/test mode.");
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch (_) {}
    const { seatsCount } = bodyData;

    if (!seatsCount || seatsCount < 1) {
      throw new Error("Invalid seatsCount provided.");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is missing");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      throw new Error("Invalid or expired authorization token");
    }

    // 2. Fetch member and organization details
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

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", member.organization_id)
      .single();

    if (orgErr || !org) {
      throw new Error("Organization profile not found.");
    }

    if (!org.stripe_subscription_id) {
      throw new Error("No active Stripe subscription found to update.");
    }

    // 3. Retrieve Stripe subscription to find the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const subItemId = subscription.items.data[0]?.id;

    if (!subItemId) {
      throw new Error("Stripe subscription item not found.");
    }

    const isDecrease = seatsCount < org.seats_purchased;

    // 4. Update quantity in Stripe.
    // - Increases: "always_invoice" immediately charges the card for the prorated
    //   amount (remaining days × price per seat) and creates a real paid invoice.
    // - Decreases: "none" — no refund; the lower quantity takes effect at next renewal.
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [
        {
          id: subItemId,
          quantity: Math.max(1, seatsCount - 1),
        },
      ],
      proration_behavior: isDecrease ? "none" : "always_invoice",
    });

    // 5. Update local database seats_purchased (instant update)
    const { error: dbErr } = await supabase
      .from("organizations")
      .update({ seats_purchased: seatsCount })
      .eq("id", org.id);

    if (dbErr) {
      console.error("🚨 Failed to update local DB seat count:", dbErr.message);
    }

    return new Response(JSON.stringify({ success: true, seatsCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("🚨 Error in update-subscription-seats:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
