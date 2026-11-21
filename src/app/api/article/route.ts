import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function extractReadableText(html: string): string {
  // Remove scripts, styles, nav, header, footer
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ");

  const paragraphs: string[] = [];
  const pMatches = cleaned.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  for (const p of pMatches) {
    const txt = p
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (txt.length >= 45 && !/(cookie|subscribe|sign in|privacy policy|all rights reserved)/i.test(txt)) {
      paragraphs.push(txt);
    }
    if (paragraphs.length >= 14) break;
  }

  return paragraphs.join("\n\n");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Valid http(s) URL required" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream HTTP ${res.status} (source may require browser access)` }, { status: 502 });
    }

    const html = await res.text();
    const text = extractReadableText(html);
    if (!text) {
      return NextResponse.json({
        text: "Volltext konnte nicht automatisch extrahiert werden (Paywall oder JS-Rendering). Bitte Original-Link im Browser öffnen.",
      });
    }

    return NextResponse.json({ ok: true, url, text });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fetch error" }, { status: 502 });
  }
}
