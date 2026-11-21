import fs from "node:fs/promises";
import path from "node:path";
import { getAllAnnotations, getArchiveCount, getCustomFeeds, getCustomTickers, getRiskHistory, recordIngestToDb } from "./db";
import { fetchLiveGeopoliticalFeeds } from "./ingestion";
import { clusterAndAnalyzeNews, computeGlobalRiskIndex, generateExecutiveBriefing } from "./intelligence";
import { fetchLiveMarkets } from "./markets";
import { buildOntologyGraph } from "./ontology";
import type { IntelligenceSnapshot } from "./types";

const DATA_DIR = path.join(process.cwd(), ".geopulse-data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "snapshot.json");
const CACHE_TTL_MS = 10 * 60 * 1000;

let memoryCache: IntelligenceSnapshot | null = null;
let inflightRefresh: Promise<IntelligenceSnapshot> | null = null;

function hydrateLocalMetadata(snapshot: IntelligenceSnapshot): IntelligenceSnapshot {
  return {
    ...snapshot,
    riskHistory: getRiskHistory(48),
    archiveCount: getArchiveCount(),
    annotations: getAllAnnotations(),
    customFeeds: getCustomFeeds(),
    customTickers: getCustomTickers(),
  };
}

async function readDiskSnapshot(): Promise<IntelligenceSnapshot | null> {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, "utf8");
    const parsed = JSON.parse(raw) as IntelligenceSnapshot;
    if (!parsed.ontology || !Array.isArray(parsed.sourceHealth)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function refreshIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const [{ items, sourcesOnline, totalConfigured, sourceHealth }, markets] = await Promise.all([
        fetchLiveGeopoliticalFeeds(),
        fetchLiveMarkets(),
      ]);

      const events = clusterAndAnalyzeNews(items);
      const ontology = buildOntologyGraph(events);
      const { index, label, regionalRisks } = computeGlobalRiskIndex(events);
      const briefing = await generateExecutiveBriefing(events, index);

      // Persist full snapshot + event archive into local SQLite database
      recordIngestToDb(index, sourcesOnline, items.length, events);

      const now = Date.now();
      const base: IntelligenceSnapshot = {
        generatedAt: new Date(now).toISOString(),
        nextAutoSyncAt: new Date(now + CACHE_TTL_MS).toISOString(),
        globalRiskIndex: index,
        riskLabel: label,
        liveSourcesOnline: sourcesOnline,
        totalSourcesConfigured: totalConfigured,
        totalArticlesScanned: items.length,
        sourceHealth,
        events,
        ontology,
        markets,
        regionalRisks,
        briefing,
        riskHistory: getRiskHistory(48),
        archiveCount: getArchiveCount(),
        annotations: getAllAnnotations(),
        customFeeds: getCustomFeeds(),
        customTickers: getCustomTickers(),
      };

      memoryCache = base;
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(base, null, 2), "utf8");
      } catch {
        // Ignore write error
      }
      return base;
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
        return hydrateLocalMetadata(candidate);
      }
    }
  }
  return refreshIntelligenceSnapshot();
}
