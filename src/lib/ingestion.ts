import type { RawNewsItem } from "./intelligence";
import type { SourceHealth, SourcePerspective } from "./types";

interface FeedConfig {
  sourceName: string;
  perspective: SourcePerspective;
  url: string;
}

export const LIVE_FEEDS: FeedConfig[] = [
  // Global Broadsheets & Wires
  { sourceName: "BBC World", perspective: "Western", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { sourceName: "NYT World", perspective: "Western", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { sourceName: "The Guardian", perspective: "Western", url: "https://www.theguardian.com/world/rss" },
  { sourceName: "NPR World", perspective: "Western", url: "https://feeds.npr.org/1004/rss.xml" },
  { sourceName: "Financial Times", perspective: "Wire / Global", url: "https://www.ft.com/world?format=rss" },
  // European & German Institutional
  { sourceName: "Deutsche Welle", perspective: "European", url: "https://rss.dw.com/xml/rss-en-world" },
  { sourceName: "Tagesschau Ausland", perspective: "European", url: "https://www.tagesschau.de/ausland/index~rss2.xml" },
  { sourceName: "France 24", perspective: "European", url: "https://www.france24.com/en/rss" },
  { sourceName: "Euronews", perspective: "European", url: "https://www.euronews.com/rss?format=mrss&level=theme&name=news" },
  // Middle East, Regional & UN Institutional
  { sourceName: "Al Jazeera", perspective: "Regional / Global South", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { sourceName: "UN ReliefWeb", perspective: "UN / Institutional", url: "https://reliefweb.int/updates/rss.xml" },
  // Defense, Naval & OSINT Analysis
  { sourceName: "USNI News (Naval)", perspective: "Defense & OSINT", url: "https://news.usni.org/feed" },
  { sourceName: "War on the Rocks", perspective: "Defense & OSINT", url: "https://warontherocks.com/feed/" },
  { sourceName: "Bellingcat OSINT", perspective: "Defense & OSINT", url: "https://www.bellingcat.com/feed/" },
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

  for (const block of blocks.slice(0, 16)) {
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

const FALLBACK_SNAPSHOT_NEWS: RawNewsItem[] = [
  {
    sourceName: "USNI News (Naval)",
    perspective: "Defense & OSINT",
    title: "Maritime insurers raise Red Sea and Strait of Hormuz tanker risk premiums amid naval tensions",
    description: "Shipping operators reroute tankers around the Cape of Good Hope as security advisories intensify across Middle East energy chokepoints.",
    url: "https://news.usni.org/",
    publishedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    sourceName: "Deutsche Welle",
    perspective: "European",
    title: "EU defense ministers accelerate joint air-defense procurement and Black Sea security coordination",
    description: "European Union and NATO planners expand defense industrial targets and European LNG resilience measures.",
    url: "https://www.dw.com/en/top-stories/s-9097",
    publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    sourceName: "Financial Times",
    perspective: "Wire / Global",
    title: "Semiconductor export controls tighten across Indo-Pacific as Taiwan Strait drills draw diplomatic warnings",
    description: "Washington, Taipei and Tokyo coordinate supply-chain resilience for leading-edge AI chips.",
    url: "https://www.ft.com/world",
    publishedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
];

export async function fetchLiveGeopoliticalFeeds(): Promise<{
  items: RawNewsItem[];
  sourcesOnline: number;
  sourceHealth: SourceHealth[];
}> {
  const results = await Promise.all(
    LIVE_FEEDS.map(async (feed): Promise<{ health: SourceHealth; items: RawNewsItem[] }> => {
      const started = Date.now();
      try {
        const res = await fetch(feed.url, {
          headers: {
            "User-Agent": "GeoPulseOntology/3.0 (+https://geopulse.local)",
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          },
          signal: AbortSignal.timeout(5500),
          cache: "no-store",
        });
        const latencyMs = Date.now() - started;
        if (!res.ok) {
          return {
            health: { sourceName: feed.sourceName, perspective: feed.perspective, url: feed.url, status: "OFFLINE", latencyMs, itemsIngested: 0 },
            items: [],
          };
        }
        const xml = await res.text();
        const parsed = parseRssItems(xml, feed);
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

  if (items.length === 0) {
    return { items: FALLBACK_SNAPSHOT_NEWS, sourcesOnline: 0, sourceHealth };
  }

  return { items, sourcesOnline, sourceHealth };
}
