import { getCustomFeeds } from "./db";
import type { RawNewsItem } from "./intelligence";
import type { SourceHealth, SourcePerspective } from "./types";

interface FeedConfig {
  sourceName: string;
  perspective: SourcePerspective;
  url: string;
  kind?: "rss" | "gdelt";
}

export const BUILTIN_FEEDS: FeedConfig[] = [
  // Global Broadsheets & Financial Wires
  { sourceName: "BBC World", perspective: "Western", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { sourceName: "NYT World", perspective: "Western", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { sourceName: "The Guardian", perspective: "Western", url: "https://www.theguardian.com/world/rss" },
  { sourceName: "NPR World", perspective: "Western", url: "https://feeds.npr.org/1004/rss.xml" },
  { sourceName: "Financial Times", perspective: "Wire / Global", url: "https://www.ft.com/world?format=rss" },
  // European & DACH
  { sourceName: "Deutsche Welle", perspective: "European", url: "https://rss.dw.com/xml/rss-en-world" },
  { sourceName: "Tagesschau Ausland", perspective: "European", url: "https://www.tagesschau.de/ausland/index~rss2.xml" },
  { sourceName: "France 24", perspective: "European", url: "https://www.france24.com/en/rss" },
  { sourceName: "Euronews", perspective: "European", url: "https://www.euronews.com/rss?format=mrss&level=theme&name=news" },
  // Regional & Theater-Specific
  { sourceName: "Al Jazeera", perspective: "Regional / Global South", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { sourceName: "Kyiv Independent", perspective: "European", url: "https://kyivindependent.com/feed/" },
  { sourceName: "Times of Israel", perspective: "Regional / Global South", url: "https://www.timesofisrael.com/feed/" },
  { sourceName: "The Diplomat (Asia)", perspective: "Regional / Global South", url: "https://thediplomat.com/feed/" },
  { sourceName: "UN ReliefWeb", perspective: "UN / Institutional", url: "https://reliefweb.int/updates/rss.xml" },
  // Defense, Maritime, Energy & Cyber OSINT
  { sourceName: "USNI News (Naval)", perspective: "Defense & OSINT", url: "https://news.usni.org/feed" },
  { sourceName: "War on the Rocks", perspective: "Defense & OSINT", url: "https://warontherocks.com/feed/" },
  { sourceName: "Bellingcat OSINT", perspective: "Defense & OSINT", url: "https://www.bellingcat.com/feed/" },
  { sourceName: "OilPrice Energy", perspective: "Wire / Global", url: "https://oilprice.com/rss/main" },
  { sourceName: "BleepingComputer Cyber", perspective: "Defense & OSINT", url: "https://www.bleepingcomputer.com/feed/" },
  // GDELT 2.0 Real-Time Global Event Stream API
  {
    sourceName: "GDELT 2.0 Global Stream",
    perspective: "Wire / Global",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=(sanctions%20OR%20missile%20OR%20nato%20OR%20hormuz%20OR%20taiwan%20OR%20ceasefire)%20sourcelang:eng&mode=artlist&maxrecords=20&format=json",
    kind: "gdelt",
  },
];

function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(regex);
  return m ? decodeXmlEntities(m[1]) : "";
}

function extractAtomLink(block: string): string {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (hrefMatch) return decodeXmlEntities(hrefMatch[1]);
  return extractTag(block, "link");
}

export function parseRssItems(xml: string, feed: FeedConfig): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const rssBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const atomBlocks = rssBlocks.length === 0 ? (xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? []) : [];
  const blocks = rssBlocks.length > 0 ? rssBlocks : atomBlocks;

  for (const block of blocks.slice(0, 14)) {
    const title = extractTag(block, "title");
    const description = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content:encoded");
    const link = extractTag(block, "link") || extractAtomLink(block);
    const pubDateRaw =
      extractTag(block, "pubDate") ||
      extractTag(block, "dc:date") ||
      extractTag(block, "updated") ||
      extractTag(block, "published");

    if (!title || !link) continue;
    const parsedDate = pubDateRaw ? new Date(pubDateRaw) : new Date();
    const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    items.push({
      sourceName: feed.sourceName,
      perspective: feed.perspective,
      title,
      description: description.slice(0, 320),
      url: link,
      publishedAt,
    });
  }
  return items;
}

function parseGdeltJson(jsonText: string, feed: FeedConfig): RawNewsItem[] {
  try {
    const parsed = JSON.parse(jsonText) as {
      articles?: Array<{ title?: string; url?: string; domain?: string; seendate?: string; sourcecountry?: string }>;
    };
    const articles = parsed.articles ?? [];
    const items: RawNewsItem[] = [];
    for (const art of articles.slice(0, 18)) {
      if (!art.title || !art.url) continue;
      // GDELT seendate format: YYYYMMDDTHHMMSSZ
      let iso = new Date().toISOString();
      if (art.seendate && art.seendate.length >= 15) {
        const d = art.seendate;
        const formatted = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}Z`;
        const dt = new Date(formatted);
        if (!Number.isNaN(dt.getTime())) iso = dt.toISOString();
      }
      items.push({
        sourceName: `GDELT (${art.domain || "Global"})`,
        perspective: feed.perspective,
        title: art.title.trim(),
        description: `GDELT 2.0 Global Dispatch · Source Country: ${art.sourcecountry || "Global"}`,
        url: art.url,
        publishedAt: iso,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchLiveGeopoliticalFeeds(): Promise<{
  items: RawNewsItem[];
  sourcesOnline: number;
  totalConfigured: number;
  sourceHealth: SourceHealth[];
}> {
  const custom = getCustomFeeds().map<FeedConfig>((c) => ({
    sourceName: c.sourceName,
    perspective: c.perspective,
    url: c.url,
    kind: "rss",
  }));

  const allFeeds = [...BUILTIN_FEEDS, ...custom];

  const results = await Promise.all(
    allFeeds.map(async (feed): Promise<{ health: SourceHealth; items: RawNewsItem[] }> => {
      const started = Date.now();
      try {
        const res = await fetch(feed.url, {
          headers: {
            "User-Agent": "GeoPulseWorkstation/4.0 (+local)",
            Accept:
              feed.kind === "gdelt"
                ? "application/json"
                : "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          },
          signal: AbortSignal.timeout(6000),
          cache: "no-store",
        });
        const latencyMs = Date.now() - started;
        if (!res.ok) {
          return {
            health: { sourceName: feed.sourceName, perspective: feed.perspective, url: feed.url, status: "OFFLINE", latencyMs, itemsIngested: 0 },
            items: [],
          };
        }
        const text = await res.text();
        const parsed = feed.kind === "gdelt" ? parseGdeltJson(text, feed) : parseRssItems(text, feed);
        return {
          health: {
            sourceName: feed.sourceName,
            perspective: feed.perspective,
            url: feed.url,
            status: parsed.length > 0 ? "ONLINE" : "DEGRADED",
            latencyMs,
            itemsIngested: parsed.length,
          },
          items: parsed,
        };
      } catch {
        return {
          health: {
            sourceName: feed.sourceName,
            perspective: feed.perspective,
            url: feed.url,
            status: "OFFLINE",
            latencyMs: Date.now() - started,
            itemsIngested: 0,
          },
          items: [],
        };
      }
    })
  );

  const items: RawNewsItem[] = [];
  const sourceHealth: SourceHealth[] = [];
  let sourcesOnline = 0;

  for (const r of results) {
    sourceHealth.push(r.health);
    if (r.health.status === "ONLINE") {
      sourcesOnline++;
      items.push(...r.items);
    }
  }

  return { items, sourcesOnline, totalConfigured: allFeeds.length, sourceHealth };
}
