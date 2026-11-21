import { NextResponse } from "next/server";
import { refreshIntelligenceSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await refreshIntelligenceSnapshot();
  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    globalRiskIndex: snapshot.globalRiskIndex,
    eventsCount: snapshot.events.length,
    liveSourcesOnline: snapshot.liveSourcesOnline,
    totalSourcesConfigured: snapshot.totalSourcesConfigured,
    archiveCount: snapshot.archiveCount,
  });
}
