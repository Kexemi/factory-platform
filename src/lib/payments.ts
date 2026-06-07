/**
 * Stripe service — payments, subscriptions, financing.
 */
export function getStripe() {
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
}

export async function createPaymentLink(amount: number, description: string, businessEmail?: string) {
  const stripe = getStripe();
  return stripe.paymentLinks.create({
    line_items: [{ price_data: { currency: 'usd', product_data: { name: description }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
    after_completion: { type: 'redirect', redirect: { url: process.env.NEXT_PUBLIC_SITE_URL + '/thank-you' } },
  });
}

export async function createSubscription(planPriceId: string, customerEmail: string) {
  const stripe = getStripe();
  return stripe.subscriptions.create({
    customer: await getOrCreateCustomer(customerEmail),
    items: [{ price: planPriceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

let customerCache: Record<string, string> = {};
async function getOrCreateCustomer(email: string) {
  if (customerCache[email]) return customerCache[email];
  const stripe = getStripe();
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    customerCache[email] = customers.data[0].id;
    return customers.data[0].id;
  }
  const customer = await stripe.customers.create({ email });
  customerCache[email] = customer.id;
  return customer.id;
}
