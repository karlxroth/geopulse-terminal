import crypto from "node:crypto";
import { CATEGORY_RULES, GEO_ANCHORS } from "./geoData";
import type {
  CategoryKey,
  ExecutiveBriefing,
  GeoEvent,
  MarketImpact,
  RegionKey,
  RegionalRisk,
  SourceCitation,
} from "./types";

export interface RawNewsItem {
  sourceName: string;
  perspective: SourceCitation["perspective"];
  title: string;
  description: string;
  url: string;
  publishedAt: string;
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "from", "this", "have", "will", "into",
  "over", "after", "amid", "says", "said", "says:", "about", "more", "than",
  "what", "when", "where", "who", "why", "how", "could", "would", "should",
  "new", "news", "world", "report", "reports", "live", "updates", "latest",
]);

const HIGH_SEVERITY_TERMS = [
  "airstrike", "missile", "nuclear", "invasion", "war", "escalation", "blockade",
  "hormuz", "taiwan strait", "ballistic", "emergency", "killed", "coup", "attack",
  "sanctions", "tariff", "mobilization", "cyberattack", "shutdown", "retaliation",
];

const DEESCALATION_TERMS = ["ceasefire", "peace deal", "truce", "agreement reached", "talks resume", "de-escalation"];

export function tokenize(text: string): Set<string> {
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return new Set(clean);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isGeopoliticallyRelevant(title: string, description: string): boolean {
  const hay = `${title} ${description}`.toLowerCase();
  // Filter obvious entertainment/sports/lifestyle noise
  if (/(premier league|champions league|nba|nfl|oscars|grammy|box office|celebrity|recipe|horoscope|fashion week)/.test(hay)) {
    return false;
  }
  const hasGeoAnchor = GEO_ANCHORS.some((a) => a.keywords.some((k) => hay.includes(k)));
  const hasCategoryKeyword = CATEGORY_RULES.some((r) => r.keywords.some((k) => hay.includes(k)));
  return hasGeoAnchor || hasCategoryKeyword;
}

function classifyGeo(text: string) {
  const hay = text.toLowerCase();
  let bestAnchor = GEO_ANCHORS[GEO_ANCHORS.length - 2]; // Fallback: US / Global
  let bestHits = 0;

  for (const anchor of GEO_ANCHORS) {
    let hits = 0;
    for (const kw of anchor.keywords) {
      if (hay.includes(kw)) hits += kw.length > 5 ? 2 : 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestAnchor = anchor;
    }
  }

  if (bestHits === 0) {
    return {
      region: "Global Macro" as RegionKey,
      countryOrZone: "Global / Multilateral",
      lat: 46.2,
      lng: 6.14, // Geneva
      chokepoint: undefined,
      impacts: [
        {
          sector: "Global Equities & Gold",
          ticker: "^GSPC / GC=F",
          direction: "volatile" as const,
          rationaleDe: "Makropolitische Entwicklung mit breiter Auswirkung auf Risikoappetit.",
          rationaleEn: "Macro-political shift affecting broad global risk sentiment.",
          confidence: 68,
        },
      ],
    };
  }

  return {
    region: bestAnchor.region,
    countryOrZone: bestAnchor.name,
    lat: bestAnchor.lat,
    lng: bestAnchor.lng,
    chokepoint: bestAnchor.chokepoint,
    impacts: bestAnchor.defaultImpacts,
  };
}

function classifyCategory(text: string): CategoryKey {
  const hay = text.toLowerCase();
  let best: CategoryKey = "Diplomacy";
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (hay.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }
  return best;
}

export function computeSeverityScore(text: string, category: CategoryKey, sourceCount: number): number {
  const hay = text.toLowerCase();
  let score = 36;

  if (category === "Conflict & Security") score += 20;
  else if (category === "Energy & Chokepoints") score += 16;
  else if (category === "Sanctions & Trade") score += 13;
  else if (category === "Cyber & Tech") score += 12;
  else if (category === "Elections & Policy") score += 8;

  for (const term of HIGH_SEVERITY_TERMS) {
    if (hay.includes(term)) score += 7;
  }
  for (const term of DEESCALATION_TERMS) {
    if (hay.includes(term)) score -= 10;
  }

  // Multi-source corroboration boosts geopolitical significance
  score += Math.min(14, (sourceCount - 1) * 6);
  return Math.max(18, Math.min(97, Math.round(score)));
}

function buildExtraMarketImpacts(text: string, baseImpacts: MarketImpact[]): MarketImpact[] {
  const hay = text.toLowerCase();
  const out = [...baseImpacts];
  const hasTicker = (t: string) => out.some((m) => m.ticker.includes(t));

  if ((hay.includes("oil") || hay.includes("opec") || hay.includes("crude")) && !hasTicker("CL=F")) {
    out.push({
      sector: "Energy / Crude Oil",
      ticker: "CL=F",
      direction: "bullish",
      rationaleDe: "Direkte Auswirkung auf globale Rohöl-Angebotsbilanz.",
      rationaleEn: "Direct impact on global crude oil supply balance.",
      confidence: 84,
    });
  }
  if ((hay.includes("chip") || hay.includes("ai ") || hay.includes("semiconductor")) && !hasTicker("SMH")) {
    out.push({
      sector: "Semiconductors",
      ticker: "SMH",
      direction: "volatile",
      rationaleDe: "Exportregeln & Tech-Lieferketten beeinflussen Halbleiterwerte.",
      rationaleEn: "Export controls & tech supply chains drive chip equities.",
      confidence: 85,
    });
  }
  if ((hay.includes("tariff") || hay.includes("trade war") || hay.includes("sanction")) && !hasTicker("GC=F")) {
    out.push({
      sector: "Gold Safe Haven",
      ticker: "GC=F",
      direction: "bullish",
      rationaleDe: "Zoll- und Sanktionsrisiken stützen Edelmetalle als Schutz.",
      rationaleEn: "Tariff and sanctions risk supports bullion hedging.",
      confidence: 78,
    });
  }
  return out.slice(0, 3);
}

export function clusterAndAnalyzeNews(rawItems: RawNewsItem[]): GeoEvent[] {
  const relevant = rawItems.filter((item) => isGeopoliticallyRelevant(item.title, item.description));

  interface Cluster {
    items: RawNewsItem[];
    tokens: Set<string>;
  }

  const clusters: Cluster[] = [];
  for (const item of relevant) {
    const tokens = tokenize(`${item.title} ${item.description.slice(0, 140)}`);
    let matched: Cluster | null = null;

    for (const cluster of clusters) {
      if (jaccardSimilarity(tokens, cluster.tokens) >= 0.28) {
        matched = cluster;
        break;
      }
    }

    if (matched) {
      if (!matched.items.some((existing) => existing.sourceName === item.sourceName)) {
        matched.items.push(item);
        for (const t of tokens) matched.tokens.add(t);
      }
    } else {
      clusters.push({ items: [item], tokens });
    }
  }

  const events: GeoEvent[] = clusters.map((cluster, idx) => {
    const lead = cluster.items[0];
    const combinedText = cluster.items.map((i) => `${i.title} ${i.description}`).join(" ");
    const geo = classifyGeo(combinedText);
    const category = classifyCategory(combinedText);
    const severity = computeSeverityScore(combinedText, category, cluster.items.length);
    const confidenceScore = Math.min(98, 66 + (cluster.items.length - 1) * 14);
    const marketImpacts = buildExtraMarketImpacts(combinedText, geo.impacts);

    // Deterministic slight coordinate jitter so overlapping markers in same country remain individually clickable
    const jitterAngle = ((idx * 137.5) * Math.PI) / 180;
    const jitterDist = (idx % 3) * 0.9;
    const lat = Number((geo.lat + Math.sin(jitterAngle) * jitterDist).toFixed(3));
    const lng = Number((geo.lng + Math.cos(jitterAngle) * jitterDist).toFixed(3));

    const cleanDesc = lead.description
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);

    const primaryTicker = marketImpacts[0]?.ticker ?? "GC=F";
    const primarySector = marketImpacts[0]?.sector ?? "Global Markets";

    const id = crypto
      .createHash("sha1")
      .update(`${lead.title}-${geo.countryOrZone}`)
      .digest("hex")
      .slice(0, 12);

    const sources: SourceCitation[] = cluster.items.map((i) => ({
      sourceName: i.sourceName,
      perspective: i.perspective,
      title: i.title,
      url: i.url,
      publishedAt: i.publishedAt,
    }));

    const tags = Array.from(
      new Set([
        geo.region,
        category.split(" ")[0],
        ...(geo.chokepoint ? [geo.chokepoint] : []),
        ...marketImpacts.map((m) => m.ticker.split(" ")[0]),
      ])
    ).slice(0, 4);

    return {
      id,
      headline: lead.title,
      summaryDe: cleanDesc
        ? `${cleanDesc}${cleanDesc.length >= 220 ? "…" : ""}`
        : `Aktuelle geopolitische Entwicklung in ${geo.countryOrZone} (${category}), bestätigt durch ${sources.length} Quelle(n).`,
      summaryEn: cleanDesc
        ? `${cleanDesc}${cleanDesc.length >= 220 ? "…" : ""}`
        : `Breaking geopolitical shift in ${geo.countryOrZone} (${category}), tracked across ${sources.length} source(s).`,
      whyItMattersDe: `Direkte Relevanz für ${geo.region}${geo.chokepoint ? ` und den Engpass ${geo.chokepoint}` : ""}. Institutionelle Märkte preisen Veränderungen vor allem über ${primarySector} (${primaryTicker}) ein.`,
      whyItMattersEn: `Directly impacts ${geo.region}${geo.chokepoint ? ` and the ${geo.chokepoint} corridor` : ""}. Institutional desks are watching spillover into ${primarySector} (${primaryTicker}).`,
      watchpoint72hDe:
        severity >= 75
          ? `Hohe Eskalationsgefahr: Reaktionen der Außenministerien, Sanktionsankündigungen und Preisspitzen bei ${primaryTicker} in den nächsten 24–72h beobachten.`
          : `Diplomatische Stellungnahmen, Handelsrouten-Daten und Folge-Meldungen regionaler Quellen innerhalb der nächsten 72 Stunden verfolgen.`,
      watchpoint72hEn:
        severity >= 75
          ? `High escalation alert: monitor foreign ministry responses, sanctions packages, and ${primaryTicker} volatility over the next 24–72h.`
          : `Track diplomatic follow-ups, shipping/trade telemetry, and regional media framing over the next 72 hours.`,
      region: geo.region,
      countryOrZone: geo.countryOrZone,
      chokepoint: geo.chokepoint,
      lat,
      lng,
      category,
      severity,
      confidenceScore,
      publishedAt: lead.publishedAt,
      sources,
      marketImpacts,
      tags,
    };
  });

  // Sort by severity * recency weight
  events.sort((a, b) => {
    const scoreA = a.severity + (a.sources.length - 1) * 5;
    const scoreB = b.severity + (b.sources.length - 1) * 5;
    return scoreB - scoreA;
  });

  return events.slice(0, 28);
}

export function computeGlobalRiskIndex(events: GeoEvent[]): {
  index: number;
  label: "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";
  regionalRisks: RegionalRisk[];
} {
  const regions: RegionKey[] = ["Middle East", "Europe", "Indo-Pacific", "Americas", "Africa", "Global Macro"];
  const regionalRisks: RegionalRisk[] = regions.map((region) => {
    const inRegion = events.filter((e) => e.region === region);
    if (inRegion.length === 0) {
      return { region, score: 28, eventCount: 0, trend: "stable" };
    }
    const top3 = inRegion.slice(0, 3);
    const avg = top3.reduce((acc, e) => acc + e.severity, 0) / top3.length;
    const score = Math.min(96, Math.round(avg + Math.min(8, inRegion.length)));
    return {
      region,
      score,
      eventCount: inRegion.length,
      trend: score >= 72 ? "rising" : score <= 44 ? "cooling" : "stable",
    };
  });

  const topEvents = events.slice(0, 8);
  const rawIndex =
    topEvents.length > 0
      ? Math.round(topEvents.reduce((acc, e) => acc + e.severity, 0) / topEvents.length)
      : 48;
  const index = Math.max(15, Math.min(96, rawIndex));

  const label =
    index >= 80
      ? "CRITICAL"
      : index >= 68
      ? "HIGH"
      : index >= 52
      ? "ELEVATED"
      : index >= 36
      ? "GUARDED"
      : "LOW";

  return { index, label, regionalRisks };
}

export async function generateExecutiveBriefing(events: GeoEvent[], globalRiskIndex: number): Promise<ExecutiveBriefing> {
  const top3 = events.slice(0, 3);
  const fallback: ExecutiveBriefing = {
    generatedAt: new Date().toISOString(),
    mode: "ai-engine",
    headlineDe: `Globales Risiko bei ${globalRiskIndex}/100 — Fokus auf ${top3[0]?.countryOrZone ?? "Energie & Sicherheit"}`,
    headlineEn: `Global Risk at ${globalRiskIndex}/100 — Focus on ${top3[0]?.countryOrZone ?? "Energy & Security"}`,
    bulletsDe: top3.map(
      (e) => `[${e.countryOrZone} · ${e.severity}/100] ${e.headline} → Markt-Fokus: ${e.marketImpacts[0]?.ticker ?? "GC=F"} (${e.marketImpacts[0]?.direction ?? "volatile"}).`
    ),
    bulletsEn: top3.map(
      (e) => `[${e.countryOrZone} · ${e.severity}/100] ${e.headline} → Market focus: ${e.marketImpacts[0]?.ticker ?? "GC=F"} (${e.marketImpacts[0]?.direction ?? "volatile"}).`
    ),
    topMarketCallDe:
      globalRiskIndex >= 68
        ? "Defensiv- & Rohstoff-Bias: Energie (CL=F), Gold (GC=F) und Defense-ETFs (ITA) profitieren von der erhöhten geopolitischen Prämie."
        : "Selektiver Risiko-Fokus: Halbleiter-Lieferketten (SMH) und Währungspaare (EUR/USD) reagieren auf Handels- & Sanktionsmeldungen.",
    topMarketCallEn:
      globalRiskIndex >= 68
        ? "Defensive & Commodity Bias: Crude Oil (CL=F), Gold (GC=F), and Defense (ITA) capture the elevated geopolitical risk premium."
        : "Selective Risk Posture: Semiconductor supply chains (SMH) and FX pairs (EUR/USD) track trade & policy headlines.",
  };

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if ((!geminiKey && !openaiKey) || top3.length === 0) {
    return fallback;
  }

  const prompt = `You are GeoPulse AI, a Bloomberg/Stratfor geopolitical & market intelligence analyst.
Given these top breaking geopolitical events (Global Risk Index: ${globalRiskIndex}/100):
${top3.map((e, i) => `${i + 1}. [${e.region} | ${e.countryOrZone} | Sev ${e.severity}] ${e.headline}`).join("\n")}

Return ONLY valid JSON with keys:
"headlineDe", "headlineEn", "bulletsDe" (array of 3 concise German executive bullets), "bulletsEn" (array of 3 concise English executive bullets), "topMarketCallDe", "topMarketCallEn".`;

  try {
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.25 },
          }),
          signal: AbortSignal.timeout(7000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...fallback, ...parsed, generatedAt: new Date().toISOString(), mode: "llm-enhanced" };
        }
      }
    } else if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
          temperature: 0.25,
        }),
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json?.choices?.[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...fallback, ...parsed, generatedAt: new Date().toISOString(), mode: "llm-enhanced" };
        }
      }
    }
  } catch {
    // Graceful fallback to deterministic AI synthesis
  }
  return fallback;
}
