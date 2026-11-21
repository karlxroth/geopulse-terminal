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

export interface MarketImpact {
  sector: string;
  ticker: string;
  direction: MarketDirection;
  rationaleDe: string;
  rationaleEn: string;
  confidence: number; // 0..100
}

export interface SourceCitation {
  sourceName: string;
  perspective: "European" | "Western" | "Regional / Global South" | "Wire / Global";
  title: string;
  url: string;
  publishedAt: string;
}

export interface GeoEvent {
  id: string;
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
  severity: number; // 1..100
  confidenceScore: number; // 1..100 (higher with multi-source verification)
  publishedAt: string;
  sources: SourceCitation[];
  marketImpacts: MarketImpact[];
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
  mode: "llm-enhanced" | "ai-engine";
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
  globalRiskIndex: number; // 0..100
  riskLabel: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  liveSourcesOnline: number;
  totalArticlesScanned: number;
  events: GeoEvent[];
  markets: MarketQuote[];
  regionalRisks: RegionalRisk[];
  briefing: ExecutiveBriefing;
}
