import { NextRequest, NextResponse } from "next/server";
import {
  addCustomFeed,
  addCustomTicker,
  getCustomFeeds,
  getCustomTickers,
  getLocalSettings,
  removeCustomFeed,
  removeCustomTicker,
  setLocalSetting,
} from "@/lib/db";
import type { SourcePerspective } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    customFeeds: getCustomFeeds(),
    customTickers: getCustomTickers(),
    settings: getLocalSettings(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: "addFeed" | "removeFeed" | "addTicker" | "removeTicker" | "saveSettings";
      sourceName?: string;
      url?: string;
      perspective?: SourcePerspective;
      feedId?: number;
      symbol?: string;
      label?: string;
      geoDriver?: string;
      settings?: Record<string, string>;
    };

    if (body.action === "addFeed" && body.sourceName && body.url) {
      addCustomFeed(body.sourceName, body.url, body.perspective ?? "Wire / Global");
    } else if (body.action === "removeFeed" && typeof body.feedId === "number") {
      removeCustomFeed(body.feedId);
    } else if (body.action === "addTicker" && body.symbol) {
      addCustomTicker(body.symbol, body.label ?? body.symbol, body.geoDriver ?? "Custom Watch");
    } else if (body.action === "removeTicker" && body.symbol) {
      removeCustomTicker(body.symbol);
    } else if (body.action === "saveSettings" && body.settings) {
      for (const [k, v] of Object.entries(body.settings)) {
        setLocalSetting(k, v.trim());
      }
    } else {
      return NextResponse.json({ error: "Invalid config payload" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      customFeeds: getCustomFeeds(),
      customTickers: getCustomTickers(),
      settings: getLocalSettings(),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
