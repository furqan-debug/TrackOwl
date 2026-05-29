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
      throw new Error("Stripe is not configured.");
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch (_) {}
    
    const { newPlanType, newSeatsCount, newBillingCycle } = bodyData;

    if (!newPlanType || !newBillingCycle || typeof newSeatsCount !== "number") {
      throw new Error("Missing required parameters: newPlanType, newSeatsCount, newBillingCycle.");
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is missing");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid or expired authorization token");

    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (memberErr || !member) throw new Error("Member profile not found.");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", member.organization_id)
      .single();

    if (orgErr || !org) throw new Error("Organization profile not found.");
    if (!org.stripe_subscription_id) throw new Error("No active Stripe subscription found.");

    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const subItemId = subscription.items.data[0]?.id;
    if (!subItemId) throw new Error("Stripe subscription item not found.");

    let targetPriceId = "";
    if (newPlanType === "Basic") {
      targetPriceId = newBillingCycle === "Yearly"
        ? (Deno.env.get("STRIPE_PRICE_BASIC_YEARLY") ?? "")
        : (Deno.env.get("STRIPE_PRICE_BASIC_MONTHLY") ?? "");
    } else {
      targetPriceId = newBillingCycle === "Yearly"
        ? (Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") ?? "")
        : (Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? "");
    }

    if (!targetPriceId) {
      throw new Error(`Target Stripe Price ID for ${newPlanType} (${newBillingCycle}) is not configured.`);
    }

    const isDowngrade = newPlanType === "Basic" && org.plan_type === "Premium";
    const isYearlyToMonthly = newBillingCycle === "Monthly" && org.subscription_period === "Yearly";
    const isSeatDecreaseOnly = newSeatsCount < org.seats_purchased && newPlanType === org.plan_type && newBillingCycle === org.subscription_period;

    // If it's a downgrade, yearly->monthly, or purely a seat decrease, it's scheduled for next cycle.
    // There are no immediate charges or prorations today.
    const isScheduled = isDowngrade || isYearlyToMonthly || isSeatDecreaseOnly;

    let amountDueToday = 0;
    let nextRenewalAmount = 0;
    let effectiveDate = "";
    // Default: current period end. Will be overridden by Stripe's upcoming invoice for immediate changes.
    let nextRenewalDate = new Date(subscription.current_period_end * 1000).toISOString();
    let prorationDetails = [];

    // Calculate base future amount
    const pricePerSeat = newPlanType === "Premium" 
      ? (newBillingCycle === "Monthly" ? 6.99 : 4.99) 
      : (newBillingCycle === "Monthly" ? 3.99 : 2.99);
    const cycleMultiplier = newBillingCycle === "Yearly" ? 12 : 1;
    const billableSeats = Math.max(1, newSeatsCount - 1);
    
    // We calculate nextRenewalAmount manually to ensure it perfectly matches standard math
    nextRenewalAmount = billableSeats * pricePerSeat * cycleMultiplier;

    if (isScheduled) {
      // Nothing due today — changes apply at the end of the current billing period
      amountDueToday = 0;
      effectiveDate = nextRenewalDate;
    } else {
      // Immediate change (upgrade, seat increase, or Monthly -> Yearly)
      effectiveDate = new Date().toISOString();
      
      try {
        const upcoming = await stripe.invoices.retrieveUpcoming({
          customer: org.stripe_customer_id,
          subscription: org.stripe_subscription_id,
          subscription_proration_behavior: "always_invoice",
          subscription_items: [
            {
              id: subItemId,
              price: targetPriceId,
              quantity: billableSeats,
            }
          ]
        });

        // Amount due today from the prorated invoice
        amountDueToday = upcoming.amount_due / 100;
        
        // Always use Stripe's period_end as the authoritative next renewal date.
        // This correctly handles all cases:
        //   - Monthly -> Yearly: resets to 1 year from now
        //   - Upgrade same cycle: keeps the same period end (already correct)
        //   - Any other immediate change: Stripe knows best
        nextRenewalDate = new Date(upcoming.period_end * 1000).toISOString();

        // Extract proration lines for details
        const prorations = upcoming.lines.data.filter(l => l.proration);
        prorationDetails = prorations.map(p => ({
          description: p.description,
          amount: p.amount / 100
        }));

      } catch (err: any) {
        console.warn("Failed to fetch upcoming invoice, using fallback:", err.message);
        amountDueToday = 0;
        // Fallback: compute next renewal date by adding the billing interval to today
        const fallbackDate = new Date();
        if (newBillingCycle === "Yearly") {
          fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
        } else {
          fallbackDate.setMonth(fallbackDate.getMonth() + 1);
        }
        nextRenewalDate = fallbackDate.toISOString();
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      amountDueToday, 
      nextRenewalAmount, 
      effectiveDate,
      nextRenewalDate,
      prorationDetails,
      isScheduled
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Error in preview-plan-change:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
