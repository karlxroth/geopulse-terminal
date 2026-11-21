import fs from "node:fs/promises";
import path from "node:path";
import { fetchLiveGeopoliticalFeeds } from "./ingestion";
import { clusterAndAnalyzeNews, computeGlobalRiskIndex, generateExecutiveBriefing } from "./intelligence";
import { fetchLiveMarkets } from "./markets";
import type { IntelligenceSnapshot } from "./types";

const DATA_DIR = path.join(process.cwd(), ".geopulse-data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "snapshot.json");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minuten Autopilot-Refresh

let memoryCache: IntelligenceSnapshot | null = null;
let inflightRefresh: Promise<IntelligenceSnapshot> | null = null;

async function readDiskSnapshot(): Promise<IntelligenceSnapshot | null> {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, "utf8");
    return JSON.parse(raw) as IntelligenceSnapshot;
  } catch {
    return null;
  }
}

async function writeDiskSnapshot(snapshot: IntelligenceSnapshot): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {
    // Read-only serverless filesystem fallback (e.g. Vercel runtime) -> memory cache only
  }
}

export async function refreshIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const [{ items, sourcesOnline }, markets] = await Promise.all([
        fetchLiveGeopoliticalFeeds(),
        fetchLiveMarkets(),
      ]);

      const events = clusterAndAnalyzeNews(items);
      const { index, label, regionalRisks } = computeGlobalRiskIndex(events);
      const briefing = await generateExecutiveBriefing(events, index);

      const now = Date.now();
      const snapshot: IntelligenceSnapshot = {
        generatedAt: new Date(now).toISOString(),
        nextAutoSyncAt: new Date(now + CACHE_TTL_MS).toISOString(),
        globalRiskIndex: index,
        riskLabel: label,
        liveSourcesOnline: sourcesOnline,
        totalArticlesScanned: items.length,
        events,
        markets,
        regionalRisks,
        briefing,
      };

      memoryCache = snapshot;
      await writeDiskSnapshot(snapshot);
      return snapshot;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

export async function getIntelligenceSnapshot(forceRefresh = false): Promise<IntelligenceSnapshot> {
  if (!forceRefresh) {
    const candidate = memoryCache ?? (await readDiskSnapshot());
    if (candidate) {
      memoryCache = candidate;
      const age = Date.now() - new Date(candidate.generatedAt).getTime();
      if (age < CACHE_TTL_MS && candidate.events.length > 0) {
        return candidate;
      }
    }
  }
  return refreshIntelligenceSnapshot();
}

export interface SubscriberRecord {
  email: string;
  minSeverity: number;
  regions: string[];
  plan: "free-briefing" | "pro-alerts";
  createdAt: string;
}

export async function saveSubscriber(record: SubscriberRecord): Promise<{ totalSubscribers: number }> {
  let list: SubscriberRecord[] = [];
  try {
    const raw = await fs.readFile(SUBSCRIBERS_FILE, "utf8");
    list = JSON.parse(raw) as SubscriberRecord[];
  } catch {
    list = [];
  }

  const idx = list.findIndex((s) => s.email.toLowerCase() === record.email.toLowerCase());
  if (idx >= 0) list[idx] = record;
  else list.push(record);

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch {
    // Graceful no-op on read-only FS
  }
  return { totalSubscribers: list.length };
}
