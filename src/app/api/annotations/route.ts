import { NextRequest, NextResponse } from "next/server";
import { saveAnnotation } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { objectId?: string; note?: string; pinned?: boolean };
    const objectId = (body.objectId ?? "").trim();
    if (!objectId) {
      return NextResponse.json({ error: "objectId required" }, { status: 400 });
    }
    const saved = saveAnnotation(objectId, body.note ?? "", Boolean(body.pinned));
    return NextResponse.json({ ok: true, annotation: saved });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
