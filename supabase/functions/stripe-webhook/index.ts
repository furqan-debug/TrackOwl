import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno";

serve(async (req) => {
  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error("Stripe or Webhook Secret is not configured on your Supabase project.");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Construct Stripe Event safely using raw body text
    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`🚨 Webhook Signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`🔔 Stripe Webhook Received Event: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;
      const status = subscription.status;

      // Stripe quantity = billable seats only. Add 1 for the free owner seat
      // so seats_purchased reflects the true total available seats.
      const billableSeats = subscription.items.data[0]?.quantity || 1;
      const totalSeats = billableSeats + 1;

      // Map plan type from Stripe Price/Product ID
      const priceId = subscription.items.data[0]?.price.id;

      const isPremiumPrice =
        priceId === Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ||
        priceId === Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY");

      const isBasicPrice =
        priceId === Deno.env.get("STRIPE_PRICE_BASIC_MONTHLY") ||
        priceId === Deno.env.get("STRIPE_PRICE_BASIC_YEARLY");

      let planType = "Basic";
      if (isPremiumPrice) {
        planType = "Premium";
      } else if (isBasicPrice) {
        planType = "Basic";
      }

      const isYearly =
        priceId === Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") ||
        priceId === Deno.env.get("STRIPE_PRICE_BASIC_YEARLY");
      const planPeriod = isYearly ? "Yearly" : "Monthly";

      // Map subscription status
      let subscriptionStatus: "None" | "Trial" | "Active" | "Locked" | "Past Due" = "None";
      if (status === "active") {
        subscriptionStatus = "Active";
      } else if (status === "trialing") {
        subscriptionStatus = "Trial";
      } else if (status === "past_due" || status === "unpaid") {
        subscriptionStatus = "Past Due";
      } else if (status === "incomplete_expired" || status === "canceled") {
        subscriptionStatus = "None";
      }

      // Retrieve existing settings to preserve other JSON keys
      const { data: orgData } = await supabase
        .from("organizations")
        .select("settings")
        .eq("stripe_customer_id", stripeCustomerId)
        .single();
      
      const currentSettings = orgData?.settings || {};
      if (planType === "Basic") {
        delete currentSettings.pending_downgrade;
      }

      // Sync organization profile in Supabase
      const { data: updatedOrg, error: orgUpdateErr } = await supabase
        .from("organizations")
        .update({
          plan_type: planType,
          subscription_status: subscriptionStatus,
          subscription_period: planPeriod,
          seats_purchased: totalSeats,
          stripe_subscription_id: subscription.id,
          // Sync trial end date from Stripe so the UI countdown is accurate
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          // Sync next billing date (current_period_end) for active paid subscriptions
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          settings: currentSettings,
        })
        .eq("stripe_customer_id", stripeCustomerId)
        .select();

      if (orgUpdateErr) {
        console.error(`🚨 Webhook database update error for Customer ${stripeCustomerId}:`, orgUpdateErr.message);
      } else {
        console.log(`[Webhook] Synchronized subscription for Customer ${stripeCustomerId}: ${planType} plan (${planPeriod}), ${totalSeats} total seat(s) [${billableSeats} billed + 1 free owner] [Status: ${subscriptionStatus}]`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("🚨 Webhook processor execution error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
