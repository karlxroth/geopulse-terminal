import type { RawNewsItem } from "./intelligence";
import type { SourceCitation } from "./types";

interface FeedConfig {
  sourceName: string;
  perspective: SourceCitation["perspective"];
  url: string;
}

const LIVE_FEEDS: FeedConfig[] = [
  { sourceName: "BBC World", perspective: "Western", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { sourceName: "Deutsche Welle", perspective: "European", url: "https://rss.dw.com/xml/rss-en-world" },
  { sourceName: "Al Jazeera", perspective: "Regional / Global South", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { sourceName: "France 24", perspective: "European", url: "https://www.france24.com/en/rss" },
  { sourceName: "The Guardian World", perspective: "Western", url: "https://www.theguardian.com/world/rss" },
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

export function parseRssItems(xml: string, feed: FeedConfig): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of itemMatches.slice(0, 18)) {
    const title = extractTag(block, "title");
    const description = extractTag(block, "description");
    const link = extractTag(block, "link");
    const pubDateRaw = extractTag(block, "pubDate") || extractTag(block, "dc:date");

    if (!title || !link) continue;
    const parsedDate = pubDateRaw ? new Date(pubDateRaw) : new Date();
    const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    items.push({
      sourceName: feed.sourceName,
      perspective: feed.perspective,
      title,
      description,
      url: link,
      publishedAt,
    });
  }
  return items;
}

const FALLBACK_SNAPSHOT_NEWS: RawNewsItem[] = [
  {
    sourceName: "BBC World",
    perspective: "Western",
    title: "Maritime insurers raise Red Sea and Strait of Hormuz tanker risk premiums amid regional naval tensions",
    description: "Shipping operators reroute vessels around the Cape of Good Hope as security advisories intensify across key Middle East energy chokepoints.",
    url: "https://www.bbc.com/news/world",
    publishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    sourceName: "Deutsche Welle",
    perspective: "European",
    title: "EU defense ministers accelerate joint air-defense procurement and Black Sea security coordination",
    description: "European Union leaders outline multi-year defense industrial spending targets and expanded energy resilience measures.",
    url: "https://www.dw.com/en/top-stories/s-9097",
    publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    sourceName: "Al Jazeera",
    perspective: "Regional / Global South",
    title: "Semiconductor export controls tighten across Indo-Pacific as Taiwan Strait military drills draw diplomatic warnings",
    description: "Regional governments call for de-escalation while chipmakers assess supply chain redundancy outside East Asia.",
    url: "https://www.aljazeera.com/news/",
    publishedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  {
    sourceName: "France 24",
    perspective: "European",
    title: "US and European trade negotiators clash over new industrial tariffs and critical mineral supply deals",
    description: "Transatlantic trade friction weighs on automotive and clean-tech exporters ahead of G7 ministerial talks.",
    url: "https://www.france24.com/en/",
    publishedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  },
  {
    sourceName: "The Guardian World",
    perspective: "Western",
    title: "Sahel security realignments put African gold and critical mineral transit routes under renewed scrutiny",
    description: "Regional blocs reassess diplomatic and mining partnerships amid shifting security alliances across West and Central Africa.",
    url: "https://www.theguardian.com/world",
    publishedAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
  },
];

export async function fetchLiveGeopoliticalFeeds(): Promise<{
  items: RawNewsItem[];
  sourcesOnline: number;
}> {
  const results = await Promise.allSettled(
    LIVE_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "GeoPulseTerminal/1.0 (+https://geopulse.local)",
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const parsed = parseRssItems(xml, feed);
      if (parsed.length === 0) throw new Error("Empty feed");
      return parsed;
    })
  );

  const items: RawNewsItem[] = [];
  let sourcesOnline = 0;

  for (const r of results) {
    if (r.status === "fulfilled") {
      sourcesOnline++;
      items.push(...r.value);
    }
  }

  if (items.length === 0) {
    return { items: FALLBACK_SNAPSHOT_NEWS, sourcesOnline: 0 };
  }

  return { items, sourcesOnline };
}
