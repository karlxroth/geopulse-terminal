import { NextRequest, NextResponse } from "next/server";
import { refreshIntelligenceSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Vollautomatischer Vercel-Cron / Background-Ingestion-Endpoint (alle 15 Min.).
 * Zieht live RSS-Feeds + Yahoo-Marktdaten, clustert Events, berechnet Risk-Index & KI-Briefing.
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
  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    globalRiskIndex: snapshot.globalRiskIndex,
    eventsCount: snapshot.events.length,
    liveSourcesOnline: snapshot.liveSourcesOnline,
  });
}
