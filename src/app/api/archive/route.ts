import { NextRequest, NextResponse } from "next/server";
import { getArchivedEvents, getRiskHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(250, Math.max(10, Number(request.nextUrl.searchParams.get("limit") ?? 80)));
  return NextResponse.json({
    events: getArchivedEvents(limit, q),
    riskHistory: getRiskHistory(72),
  });
}
