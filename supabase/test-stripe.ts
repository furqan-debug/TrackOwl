import Stripe from "npm:stripe@14.23.0";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

const subs = await stripe.subscriptions.list({ limit: 1 });
if (subs.data.length > 0) {
  const sub = subs.data[0];
  console.log("Subscription ID:", sub.id);
  console.log("Customer:", sub.customer);
  console.log("Status:", sub.status);
  console.log("Quantity:", sub.items.data[0].quantity);
  console.log("Plan Amount:", sub.items.data[0].price.unit_amount);
  console.log("Current Period End:", new Date(sub.current_period_end * 1000).toISOString());
} else {
  console.log("No subscriptions found.");
}
