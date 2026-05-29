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
    const { planType = "Premium", billingCycle = "Monthly", seatsCount = 5, isTrial = false } = bodyData;

    if (!stripeSecretKey) {
      const origin = req.headers.get("origin") || "https://www.trackowl.io";
      const redirectUrl = `${origin}/dashboard/pricing/mock-checkout?planType=${planType}&billingCycle=${billingCycle}&seatsCount=${seatsCount}`;
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

    // planType, billingCycle, and seatsCount are already parsed from bodyData above

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", member.organization_id)
      .single();

    if (orgErr || !org) {
      throw new Error("Organization profile not found.");
    }

    let stripeCustomerId = org.stripe_customer_id;

    // 3. Create Stripe Customer if not exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organization_id: org.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save Stripe Customer ID in DB
      await supabase
        .from("organizations")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", org.id);
    }

    // 4. Resolve Stripe Price ID
    let priceId = "";
    if (planType === "Basic") {
      priceId = billingCycle === "Yearly"
        ? (Deno.env.get("STRIPE_PRICE_BASIC_YEARLY") ?? "")
        : (Deno.env.get("STRIPE_PRICE_BASIC_MONTHLY") ?? "");
    } else {
      priceId = billingCycle === "Yearly"
        ? (Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") ?? "")
        : (Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? "");
    }

    if (!priceId) {
      throw new Error(`Stripe Price ID for ${planType} (${billingCycle}) is not configured on your Supabase project.`);
    }

    // 5. Create Stripe Checkout Session
    // NOTE: seatsCount is the number of *billable* seats (free owner seat already excluded by the frontend)
    const billableSeats = Math.max(1, seatsCount);
    const origin = req.headers.get("origin") || "https://www.trackowl.io";
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: billableSeats,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/settings/billing?success=false`,
      subscription_data: {
        // Apply 7-day free trial for new Premium subscribers — Stripe enforces this natively:
        // card is not charged until the trial ends, and subscription.status becomes 'trialing'
        ...(isTrial && planType === "Premium" ? { trial_period_days: 7 } : {}),
        metadata: {
          organization_id: org.id,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("🚨 Error in create-checkout-session:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
