import Stripe from "stripe";
import { ENV } from "../_core/env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!ENV.stripeSecretKey) return null;
  if (!stripeClient)
    stripeClient = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  return stripeClient;
}

export async function createCheckoutSession({
  reservationId,
  eventTitle,
  ticketType,
  amount, // in cents
  successUrl,
  cancelUrl,
  userId,
}: {
  reservationId: number;
  eventTitle: string;
  ticketType: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
  userId: number;
}): Promise<{ url: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${eventTitle} — ${ticketType.replace(/_/g, " ")}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservationId: String(reservationId),
      userId: String(userId),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { url: session.url!, sessionId: session.id };
}

export async function createMembershipCheckoutSession({
  userId,
  customerEmail,
  customerId,
  tierKey,
  interval,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: number;
  customerEmail?: string | null;
  customerId?: string | null;
  tierKey: string;
  interval: "month" | "year";
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: String(userId),
    customer: customerId ?? undefined,
    customer_email: customerId ? undefined : customerEmail ?? undefined,
    metadata: {
      kind: "membership",
      userId: String(userId),
      tierKey,
      interval,
    },
    subscription_data: {
      metadata: {
        kind: "membership",
        userId: String(userId),
        tierKey,
        interval,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { url: session.url!, sessionId: session.id };
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url ? { url: session.url } : null;
}
