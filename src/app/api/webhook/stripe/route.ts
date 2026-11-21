import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { saveSubscriber } from "@/lib/store";

export const dynamic = "force-dynamic";

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(parts.v1, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const sigHeader = request.headers.get("stripe-signature") ?? "";

  if (webhookSecret && !verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: { customer_details?: { email?: string }; customer_email?: string } };
    };

    if (event.type === "checkout.session.completed") {
      const email = event.data?.object?.customer_details?.email || event.data?.object?.customer_email;
      if (email) {
        await saveSubscriber({
          email,
          minSeverity: 75,
          regions: ["Global"],
          plan: "pro-alerts",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }
}
