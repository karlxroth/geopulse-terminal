import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Erstellt eine echte Stripe Checkout Session für GeoPulse Pro (€19/Monat, 7 Tage kostenloser Test).
 * Falls STRIPE_SECRET_KEY / STRIPE_PRICE_ID_PRO noch nicht gesetzt sind, meldet die Route sauber den Demo-Status.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = (body.email ?? "").trim();

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    const priceId = process.env.STRIPE_PRICE_ID_PRO?.trim();
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!stripeKey || !priceId) {
      return NextResponse.json({
        configured: false,
        mode: "demo",
        message:
          "Stripe ist bereit — trage STRIPE_SECRET_KEY & STRIPE_PRICE_ID_PRO in .env.local / Vercel ein, um Live-Zahlungen (€19/Mo) sofort zu aktivieren.",
      });
    }

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("subscription_data[trial_period_days]", "7");
    params.set("success_url", `${origin}/?pro=success`);
    params.set("cancel_url", `${origin}/?pro=cancelled`);
    if (email) {
      params.set("customer_email", email);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (!res.ok || !data?.url) {
      return NextResponse.json(
        { error: data?.error?.message || "Stripe Checkout Session fehlgeschlagen." },
        { status: 502 }
      );
    }

    return NextResponse.json({ configured: true, url: data.url, sessionId: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
