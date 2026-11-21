export type RegionKey =
  | "Middle East"
  | "Europe"
  | "Indo-Pacific"
  | "Americas"
  | "Africa"
  | "Global Macro";

export type CategoryKey =
  | "Conflict & Security"
  | "Sanctions & Trade"
  | "Energy & Chokepoints"
  | "Diplomacy"
  | "Cyber & Tech"
  | "Elections & Policy";

export type MarketDirection = "bullish" | "bearish" | "volatile";

export type SourcePerspective =
  | "Wire / Global"
  | "European"
  | "Western"
  | "Regional / Global South"
  | "Defense & OSINT"
  | "UN / Institutional";

export type OntologyNodeKind = "EVENT" | "ENTITY" | "CHOKEPOINT" | "ASSET";

export interface OntologyNode {
  id: string;
  kind: OntologyNodeKind;
  label: string;
  sublabel: string;
  severity: number; // 0..100
  degree: number;
  metadata: Record<string, string | number>;
}

export type OntologyRelationType =
  | "INVOLVES"
  | "LOCATED_AT"
  | "IMPACTS_BULLISH"
  | "IMPACTS_BEARISH"
  | "IMPACTS_VOLATILE"
  | "EXPOSED_TO";

export interface OntologyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: OntologyRelationType;
  weight: number;
}

export interface OntologyEntity {
  id: string;
  name: string;
  entityType: "STATE" | "ALLIANCE" | "NON_STATE" | "CORP_SECTOR" | "INSTITUTION";
  region: RegionKey;
  eventIds: string[];
  linkedAssetTickers: string[];
  maxSeverity: number;
  mentionCount: number;
}

export interface OntologyGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  entities: OntologyEntity[];
}

export interface SourceHealth {
  sourceName: string;
  perspective: SourcePerspective;
  url: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latencyMs: number;
  itemsIngested: number;
}

export interface MarketImpact {
  sector: string;
  ticker: string;
  direction: MarketDirection;
  rationaleDe: string;
  rationaleEn: string;
  confidence: number;
}

export interface SourceCitation {
  sourceName: string;
  perspective: SourcePerspective;
  title: string;
  url: string;
  publishedAt: string;
}

export interface GeoEvent {
  id: string;
  code: string; // e.g. EVT-8A4C
  headline: string;
  summaryDe: string;
  summaryEn: string;
  whyItMattersDe: string;
  whyItMattersEn: string;
  watchpoint72hDe: string;
  watchpoint72hEn: string;
  region: RegionKey;
  countryOrZone: string;
  chokepoint?: string;
  lat: number;
  lng: number;
  category: CategoryKey;
  severity: number;
  confidenceScore: number;
  publishedAt: string;
  sources: SourceCitation[];
  marketImpacts: MarketImpact[];
  entityIds: string[];
  entityNames: string[];
  tags: string[];
}

export interface MarketQuote {
  symbol: string;
  label: string;
  category: "Energy" | "Safe Haven" | "Equity" | "Defense" | "Tech" | "FX" | "Crypto";
  price: number;
  changePercent: number;
  currency: string;
  geoDriver: string;
  isLive: boolean;
}

export interface RegionalRisk {
  region: RegionKey;
  score: number;
  eventCount: number;
  trend: "rising" | "stable" | "cooling";
}

export interface ExecutiveBriefing {
  generatedAt: string;
  mode: "llm-enhanced" | "ontology-engine";
  headlineDe: string;
  headlineEn: string;
  bulletsDe: string[];
  bulletsEn: string[];
  topMarketCallDe: string;
  topMarketCallEn: string;
}

export interface IntelligenceSnapshot {
  generatedAt: string;
  nextAutoSyncAt: string;
  globalRiskIndex: number;
  riskLabel: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  liveSourcesOnline: number;
  totalSourcesConfigured: number;
  totalArticlesScanned: number;
  sourceHealth: SourceHealth[];
  events: GeoEvent[];
  ontology: OntologyGraph;
  markets: MarketQuote[];
  regionalRisks: RegionalRisk[];
  briefing: ExecutiveBriefing;
}
