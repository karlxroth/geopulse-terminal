import { NextRequest, NextResponse } from "next/server";
import { saveSubscriber } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      minSeverity?: number;
      regions?: string[];
      plan?: "free-briefing" | "pro-alerts";
    };

    const email = (body.email ?? "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }, { status: 400 });
    }

    const result = await saveSubscriber({
      email,
      minSeverity: Number.isFinite(body.minSeverity) ? Number(body.minSeverity) : 75,
      regions: Array.isArray(body.regions) && body.regions.length > 0 ? body.regions : ["Global"],
      plan: body.plan === "pro-alerts" ? "pro-alerts" : "free-briefing",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Alert-Abo aktiviert! Du erhältst automatische Geopolitik-Briefings.",
      totalSubscribers: result.totalSubscribers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
