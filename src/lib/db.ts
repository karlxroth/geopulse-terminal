import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { GeoEvent, MarketQuote, SourcePerspective } from "./types";

const DATA_DIR = path.join(process.cwd(), ".geopulse-data");
const DB_PATH = path.join(DATA_DIR, "geopulse.sqlite");

let dbInstance: DatabaseSync | null = null;

export interface RiskHistoryPoint {
  id: number;
  recordedAt: string;
  globalRiskIndex: number;
  sourcesOnline: number;
  articlesScanned: number;
  eventsCount: number;
}

export interface CustomFeedRecord {
  id: number;
  sourceName: string;
  perspective: SourcePerspective;
  url: string;
}

export interface CustomTickerRecord {
  symbol: string;
  label: string;
  category: MarketQuote["category"];
  currency: string;
  geoDriver: string;
}

export interface AnalystAnnotation {
  objectId: string;
  note: string;
  pinned: boolean;
  updatedAt: string;
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS risk_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_at TEXT NOT NULL,
      global_risk_index INTEGER NOT NULL,
      sources_online INTEGER NOT NULL,
      articles_scanned INTEGER NOT NULL,
      events_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_archive (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      headline TEXT NOT NULL,
      region TEXT NOT NULL,
      country_or_zone TEXT NOT NULL,
      category TEXT NOT NULL,
      severity INTEGER NOT NULL,
      published_at TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyst_annotations (
      object_id TEXT PRIMARY KEY,
      note TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL,
      perspective TEXT NOT NULL DEFAULT 'Wire / Global',
      url TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS custom_tickers (
      symbol TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Equity',
      currency TEXT NOT NULL DEFAULT '$',
      geo_driver TEXT NOT NULL DEFAULT 'Custom Watch'
    );

    CREATE TABLE IF NOT EXISTS local_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  dbInstance = db;
  return db;
}

export function recordIngestToDb(
  globalRiskIndex: number,
  sourcesOnline: number,
  articlesScanned: number,
  events: GeoEvent[]
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const insertRisk = db.prepare(
    `INSERT INTO risk_history (recorded_at, global_risk_index, sources_online, articles_scanned, events_count)
     VALUES (?, ?, ?, ?, ?)`
  );
  insertRisk.run(now, globalRiskIndex, sourcesOnline, articlesScanned, events.length);

  const upsertEvent = db.prepare(
    `INSERT INTO event_archive (id, code, headline, region, country_or_zone, category, severity, published_at, first_seen_at, last_seen_at, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       severity = excluded.severity,
       last_seen_at = excluded.last_seen_at,
       payload_json = excluded.payload_json`
  );

  for (const ev of events) {
    upsertEvent.run(
      ev.id,
      ev.code,
      ev.headline,
      ev.region,
      ev.countryOrZone,
      ev.category,
      ev.severity,
      ev.publishedAt,
      now,
      now,
      JSON.stringify(ev)
    );
  }
}

export function getRiskHistory(limit = 48): RiskHistoryPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, recorded_at, global_risk_index, sources_online, articles_scanned, events_count
       FROM risk_history ORDER BY id DESC LIMIT ?`
    )
    .all(limit) as Array<{
    id: number;
    recorded_at: string;
    global_risk_index: number;
    sources_online: number;
    articles_scanned: number;
    events_count: number;
  }>;

  return rows.reverse().map((r) => ({
    id: r.id,
    recordedAt: r.recorded_at,
    globalRiskIndex: r.global_risk_index,
    sourcesOnline: r.sources_online,
    articlesScanned: r.articles_scanned,
    eventsCount: r.events_count,
  }));
}

export function getArchivedEvents(limit = 100, query = ""): GeoEvent[] {
  const db = getDb();
  const q = query.trim();
  const rows = (
    q
      ? db
          .prepare(
            `SELECT payload_json FROM event_archive
             WHERE headline LIKE ? OR country_or_zone LIKE ? OR region LIKE ? OR code LIKE ?
             ORDER BY last_seen_at DESC, severity DESC LIMIT ?`
          )
          .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, limit)
      : db
          .prepare(`SELECT payload_json FROM event_archive ORDER BY last_seen_at DESC, severity DESC LIMIT ?`)
          .all(limit)
  ) as Array<{ payload_json: string }>;

  const out: GeoEvent[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.payload_json) as GeoEvent);
    } catch {
      // Skip corrupt row
    }
  }
  return out;
}

export function getArchiveCount(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM event_archive`).get() as { cnt: number };
  return row?.cnt ?? 0;
}

export function getAllAnnotations(): Record<string, AnalystAnnotation> {
  const db = getDb();
  const rows = db.prepare(`SELECT object_id, note, pinned, updated_at FROM analyst_annotations`).all() as Array<{
    object_id: string;
    note: string;
    pinned: number;
    updated_at: string;
  }>;
  const map: Record<string, AnalystAnnotation> = {};
  for (const r of rows) {
    map[r.object_id] = {
      objectId: r.object_id,
      note: r.note,
      pinned: r.pinned === 1,
      updatedAt: r.updated_at,
    };
  }
  return map;
}

export function saveAnnotation(objectId: string, note: string, pinned: boolean): AnalystAnnotation {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO analyst_annotations (object_id, note, pinned, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(object_id) DO UPDATE SET note = excluded.note, pinned = excluded.pinned, updated_at = excluded.updated_at`
  ).run(objectId, note, pinned ? 1 : 0, now);
  return { objectId, note, pinned, updatedAt: now };
}

export function getCustomFeeds(): CustomFeedRecord[] {
  const db = getDb();
  const rows = db.prepare(`SELECT id, source_name, perspective, url FROM custom_feeds ORDER BY id ASC`).all() as Array<{
    id: number;
    source_name: string;
    perspective: SourcePerspective;
    url: string;
  }>;
  return rows.map((r) => ({ id: r.id, sourceName: r.source_name, perspective: r.perspective, url: r.url }));
}

export function addCustomFeed(sourceName: string, url: string, perspective: SourcePerspective): void {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO custom_feeds (source_name, perspective, url) VALUES (?, ?, ?)`).run(
    sourceName.trim(),
    perspective,
    url.trim()
  );
}

export function removeCustomFeed(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM custom_feeds WHERE id = ?`).run(id);
}

export function getCustomTickers(): CustomTickerRecord[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT symbol, label, category, currency, geo_driver FROM custom_tickers ORDER BY symbol ASC`)
    .all() as Array<{
    symbol: string;
    label: string;
    category: MarketQuote["category"];
    currency: string;
    geo_driver: string;
  }>;
  return rows.map((r) => ({
    symbol: r.symbol,
    label: r.label,
    category: r.category,
    currency: r.currency,
    geoDriver: r.geo_driver,
  }));
}

export function addCustomTicker(symbol: string, label: string, geoDriver = "Custom Watch"): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO custom_tickers (symbol, label, category, currency, geo_driver) VALUES (?, ?, 'Equity', '$', ?)`
  ).run(symbol.trim().toUpperCase(), label.trim() || symbol.trim().toUpperCase(), geoDriver.trim() || "Custom Watch");
}

export function removeCustomTicker(symbol: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM custom_tickers WHERE symbol = ?`).run(symbol.trim().toUpperCase());
}

export function getLocalSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM local_settings`).all() as Array<{ key: string; value: string }>;
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function setLocalSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)`).run(key, value);
}
