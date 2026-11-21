import { NextRequest, NextResponse } from "next/server";
import { dispatchDailyBriefingEmails } from "@/lib/alerts";
import { refreshIntelligenceSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Täglicher 07:00-CET-Autopilot-Cron: aktualisiert die Lage und versendet das Executive Dossier per Resend.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const snapshot = await refreshIntelligenceSnapshot();
  const delivery = await dispatchDailyBriefingEmails(snapshot);
  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    globalRiskIndex: snapshot.globalRiskIndex,
    emailsAttempted: delivery.attempted,
    emailsSent: delivery.sent,
  });
}
