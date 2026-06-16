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
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is missing");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid or expired authorization token");

    // 2. Get org
    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (memberErr || !member) throw new Error("Member profile not found.");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", member.organization_id)
      .single();

    if (orgErr || !org) throw new Error("Organization not found.");

    if (!org.stripe_customer_id) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // SELF-HEALING: If DB is missing stripe_subscription_id, recover it and seats_purchased
    if (!org.stripe_subscription_id) {
      const activeSubs = await stripe.subscriptions.list({
        customer: org.stripe_customer_id,
        status: "active",
        limit: 1,
      });
      if (activeSubs.data.length > 0) {
        const sub = activeSubs.data[0];
        const billable = sub.items.data[0]?.quantity ?? 1;
        
        await supabase
          .from("organizations")
          .update({
            stripe_subscription_id: sub.id,
            seats_purchased: billable + 1,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          })
          .eq("id", member.organization_id);
      }
    }

    // 3. Fetch all invoices from Stripe (paid, open, draft)
    // always_invoice ensures seat upgrades create real paid invoices immediately,
    // so no special pending proration handling is needed here.
    const invoicesList = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 24,
    });

    const formattedInvoices = invoicesList.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      description: inv.lines.data[0]?.description || "TrackOwl Subscription Charge",
      amount: `$${(inv.amount_paid / 100).toFixed(2)}`,
      status: inv.status || "paid",
      pdfUrl: inv.invoice_pdf,
      lines: inv.lines.data.map((l) => ({
        id: l.id,
        description: l.description,
        amount: l.amount,
        proration: l.proration,
        quantity: l.quantity,
        period: l.period,
      })),
    }));

    // 4. Fetch payment methods and Customer to get the default
    const [paymentMethods, customerRes] = await Promise.all([
      stripe.paymentMethods.list({ customer: org.stripe_customer_id, type: "card" }),
      stripe.customers.retrieve(org.stripe_customer_id)
    ]);

    const customer = customerRes as Stripe.Customer;
    const defaultPmId = customer?.invoice_settings?.default_payment_method as string | null;

    let targetPm = paymentMethods.data[0]; // fallback to first if no default set
    if (defaultPmId) {
      const foundDefault = paymentMethods.data.find(pm => pm.id === defaultPmId);
      if (foundDefault) {
        targetPm = foundDefault;
      }
    }

    const defaultPaymentMethod = targetPm ? {
      brand: targetPm.card?.brand,
      last4: targetPm.card?.last4,
      exp_month: targetPm.card?.exp_month,
      exp_year: targetPm.card?.exp_year,
    } : null;

    return new Response(JSON.stringify({ invoices: formattedInvoices, paymentMethod: defaultPaymentMethod }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Error in get-billing-history:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
