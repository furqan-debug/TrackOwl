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
    const { action = "changePlan", planType = "Basic", billingCycle = "Monthly" } = bodyData;

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
      throw new Error("Member profile not found.");
    }

    if (member.role !== "Admin" && member.role !== "Owner") {
      throw new Error("Only administrators and owners can manage plans.");
    }

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", member.organization_id)
      .single();

    if (orgErr || !org) {
      throw new Error("Organization profile not found.");
    }

    const isMockMode = !stripeSecretKey || org.stripe_customer_id?.startsWith("cus_mock_") || (org.plan_type === "Premium" && !org.stripe_subscription_id);

    // ────────────────────────────────────────────────────────────────
    // ACTIONS FOR DEV SIMULATION (MOCK SANDBOX) MODE
    // ────────────────────────────────────────────────────────────────
    if (isMockMode) {
      const currentSettings = org.settings || {};
      
      if (action === "cancelDowngrade") {
        delete currentSettings.pending_downgrade;
        const { error: dbErr } = await supabase
          .from("organizations")
          .update({ settings: currentSettings })
          .eq("id", org.id);
        if (dbErr) throw dbErr;
        
        return new Response(JSON.stringify({ success: true, message: "Sandbox scheduled downgrade cancelled." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Upgrade immediately in mock mode
      if (planType === "Premium") {
        delete currentSettings.pending_downgrade;
        const { error: dbErr } = await supabase
          .from("organizations")
          .update({
            plan_type: "Premium",
            subscription_status: "Active",
            subscription_period: billingCycle,
            settings: currentSettings,
          })
          .eq("id", org.id);
        if (dbErr) throw dbErr;

        return new Response(JSON.stringify({ success: true, planType: "Premium" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Downgrade: schedule it in settings
      if (planType === "Basic") {
        const fakeRenewalDate = new Date();
        fakeRenewalDate.setDate(fakeRenewalDate.getDate() + 30);
        
        currentSettings.pending_downgrade = {
          plan_type: "Basic",
          scheduled_for: fakeRenewalDate.toISOString(),
          billing_cycle: billingCycle,
        };

        const { error: dbErr } = await supabase
          .from("organizations")
          .update({ settings: currentSettings })
          .eq("id", org.id);
        if (dbErr) throw dbErr;

        return new Response(JSON.stringify({ success: true, scheduled: true, scheduledFor: fakeRenewalDate.toISOString() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ACTIONS FOR REAL STRIPE MODE
    // ────────────────────────────────────────────────────────────────
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    if (!org.stripe_subscription_id) {
      throw new Error("No active Stripe subscription found to change.");
    }

    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const subItemId = subscription.items.data[0]?.id;
    if (!subItemId) throw new Error("Stripe subscription item not found.");

    const currentPriceId = subscription.items.data[0]?.price.id;
    const currentSeats = subscription.items.data[0]?.quantity || 1;
    const currentSettings = org.settings || {};

    // Action: Cancel Scheduled Downgrade
    if (action === "cancelDowngrade") {
      if (subscription.schedule) {
        // Cancel the Stripe subscription schedule, releasing the subscription
        await stripe.subscriptionSchedules.cancel(subscription.schedule as string, {
          release: true,
        });
      }

      delete currentSettings.pending_downgrade;
      const { error: dbErr } = await supabase
        .from("organizations")
        .update({ settings: currentSettings })
        .eq("id", org.id);
      if (dbErr) throw dbErr;

      return new Response(JSON.stringify({ success: true, message: "Stripe scheduled downgrade cancelled." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Resolve Target Price ID
    let targetPriceId = "";
    const resolvedBillingCycle = billingCycle || org.subscription_period || "Monthly";

    if (planType === "Basic") {
      targetPriceId = resolvedBillingCycle === "Yearly"
        ? (Deno.env.get("STRIPE_PRICE_BASIC_YEARLY") ?? "")
        : (Deno.env.get("STRIPE_PRICE_BASIC_MONTHLY") ?? "");
    } else {
      targetPriceId = resolvedBillingCycle === "Yearly"
        ? (Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") ?? "")
        : (Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? "");
    }

    if (!targetPriceId) {
      throw new Error(`Target Stripe Price ID for ${planType} (${resolvedBillingCycle}) is not configured.`);
    }

    const isPlanDowngrade = planType === "Basic" && org.plan_type === "Premium";
    const isYearlyToMonthly = resolvedBillingCycle === "Monthly" && org.subscription_period === "Yearly";
    const isScheduled = isPlanDowngrade || isYearlyToMonthly;

    if (isScheduled) {
      // 1. Create Subscription Schedule from Subscription
      let schedule;
      if (subscription.schedule) {
        schedule = await stripe.subscriptionSchedules.retrieve(subscription.schedule as string);
      } else {
        schedule = await stripe.subscriptionSchedules.create({
          from_subscription: org.stripe_subscription_id,
        });
      }

      const currentPhase = schedule.phases[0];
      const periodEnd = subscription.current_period_end;

      // 2. Update Subscription Schedule phases to execute downgrade at period end
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            start_date: currentPhase.start_date,
            end_date: periodEnd,
            items: [
              {
                price: currentPriceId,
                quantity: currentSeats,
              },
            ],
          },
          {
            start_date: periodEnd,
            items: [
              {
                price: targetPriceId,
                quantity: currentSeats,
              },
            ],
            proration_behavior: "none",
          },
        ],
      });

      // 3. Set pending downgrade in settings
      const scheduledDate = new Date(periodEnd * 1000).toISOString();
      currentSettings.pending_downgrade = {
        plan_type: "Basic",
        scheduled_for: scheduledDate,
        billing_cycle: resolvedBillingCycle,
      };

      const { error: dbErr } = await supabase
        .from("organizations")
        .update({ settings: currentSettings })
        .eq("id", org.id);
      if (dbErr) throw dbErr;

      return new Response(JSON.stringify({ success: true, scheduled: true, scheduledFor: scheduledDate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      // Upgrade Tier: Upgrade Immediately
      // 1. If subscription is currently on a schedule, release it first
      if (subscription.schedule) {
        await stripe.subscriptionSchedules.cancel(subscription.schedule as string, {
          release: true,
        });
      }

      // 2. Update subscription immediately with proration
      await stripe.subscriptions.update(org.stripe_subscription_id, {
        items: [
          {
            id: subItemId,
            price: targetPriceId,
            quantity: currentSeats,
          },
        ],
        proration_behavior: "always_invoice",
      });

      // 3. Update database immediately
      delete currentSettings.pending_downgrade;
      const { error: dbErr } = await supabase
        .from("organizations")
        .update({
          plan_type: "Premium",
          subscription_period: resolvedBillingCycle,
          settings: currentSettings,
        })
        .eq("id", org.id);
      if (dbErr) throw dbErr;

      return new Response(JSON.stringify({ success: true, planType: "Premium" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (err: any) {
    console.error("🚨 Error in change-subscription-plan:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
