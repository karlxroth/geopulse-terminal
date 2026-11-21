import type {
  GeoEvent,
  OntologyEdge,
  OntologyEntity,
  OntologyGraph,
  OntologyNode,
  RegionKey,
} from "./types";

interface EntityRule {
  id: string;
  name: string;
  entityType: OntologyEntity["entityType"];
  region: RegionKey;
  keywords: string[];
}

export const ONTOLOGY_ENTITY_RULES: EntityRule[] = [
  { id: "ENT-USA", name: "United States / DoD", entityType: "STATE", region: "Americas", keywords: ["united states", "u.s.", "us ", "washington", "pentagon", "white house", "trump", "congress", "usa"] },
  { id: "ENT-EU", name: "European Union", entityType: "ALLIANCE", region: "Europe", keywords: ["european union", "eu ", "brussels", "brüssel", "europäische union", "eurozone"] },
  { id: "ENT-NATO", name: "NATO Alliance", entityType: "ALLIANCE", region: "Europe", keywords: ["nato", "north atlantic", "alliance"] },
  { id: "ENT-RUS", name: "Russian Federation", entityType: "STATE", region: "Europe", keywords: ["russia", "russland", "moscow", "moskau", "kremlin", "kreml", "putin"] },
  { id: "ENT-UKR", name: "Ukraine", entityType: "STATE", region: "Europe", keywords: ["ukraine", "kyiv", "kiew", "zelensky", "selenskyj", "donbas", "crimea", "krim"] },
  { id: "ENT-DEU", name: "Germany", entityType: "STATE", region: "Europe", keywords: ["germany", "deutschland", "berlin", "bundeswehr", "bundesregierung"] },
  { id: "ENT-GBR", name: "United Kingdom", entityType: "STATE", region: "Europe", keywords: ["uk ", "britain", "british", "london", "großbritannien"] },
  { id: "ENT-FRA", name: "France", entityType: "STATE", region: "Europe", keywords: ["france", "frankreich", "paris", "macron"] },
  { id: "ENT-CHN", name: "China / PLA", entityType: "STATE", region: "Indo-Pacific", keywords: ["china", "beijing", "peking", "xi jinping", "chinese", "chinesisch"] },
  { id: "ENT-TWN", name: "Taiwan / TSMC", entityType: "STATE", region: "Indo-Pacific", keywords: ["taiwan", "taipei", "tsmc", "taiwan strait"] },
  { id: "ENT-IRN", name: "Iran / IRGC", entityType: "STATE", region: "Middle East", keywords: ["iran", "tehran", "teheran", "irgc", "hormuz", "persian gulf"] },
  { id: "ENT-ISR", name: "Israel / IDF", entityType: "STATE", region: "Middle East", keywords: ["israel", "idf", "tel aviv", "jerusalem", "netanyahu", "gaza", "west bank"] },
  { id: "ENT-HOU", name: "Houthis / Ansar Allah", entityType: "NON_STATE", region: "Middle East", keywords: ["houthi", "huthi", "yemen", "jemen", "red sea", "rotes meer"] },
  { id: "ENT-SAU", name: "Saudi Arabia / OPEC+", entityType: "STATE", region: "Middle East", keywords: ["saudi", "riyadh", "riad", "opec", "gulf states"] },
  { id: "ENT-LEB", name: "Lebanon / Hezbollah", entityType: "NON_STATE", region: "Middle East", keywords: ["lebanon", "libanon", "hezbollah", "hisbollah", "beirut"] },
  { id: "ENT-IND", name: "India", entityType: "STATE", region: "Indo-Pacific", keywords: ["india", "indien", "new delhi", "modi"] },
  { id: "ENT-JPN", name: "Japan", entityType: "STATE", region: "Indo-Pacific", keywords: ["japan", "tokyo", "tokio"] },
  { id: "ENT-PRK", name: "North Korea / DPRK", entityType: "STATE", region: "Indo-Pacific", keywords: ["north korea", "nordkorea", "pyongyang", "kim jong"] },
  { id: "ENT-UN", name: "United Nations / ReliefWeb", entityType: "INSTITUTION", region: "Global Macro", keywords: ["united nations", "un ", "uno", "humanitarian", "reliefweb", "security council", "unhcr"] },
  { id: "ENT-SHIP", name: "Global Maritime & Energy", entityType: "CORP_SECTOR", region: "Global Macro", keywords: ["oil", "öl", "tanker", "shipping", "lng", "pipeline", "suez", "freight", "crude"] },
  { id: "ENT-SEMI", name: "Semiconductor Supply Chain", entityType: "CORP_SECTOR", region: "Indo-Pacific", keywords: ["chip", "semiconductor", "halbleiter", "nvidia", "asml", "export control", "ai "] },
  { id: "ENT-AFR", name: "African Union / Sahel Blocs", entityType: "ALLIANCE", region: "Africa", keywords: ["sudan", "congo", "sahel", "africa", "afrika", "somalia", "ethiopia", "nigeria"] },
];

export function extractEntitiesForText(text: string): { ids: string[]; names: string[] } {
  const hay = text.toLowerCase();
  const ids: string[] = [];
  const names: string[] = [];
  for (const rule of ONTOLOGY_ENTITY_RULES) {
    if (rule.keywords.some((kw) => hay.includes(kw))) {
      ids.push(rule.id);
      names.push(rule.name);
    }
  }
  return { ids, names };
}

/**
 * Erzeugt den vollständigen Palantir-ähnlichen Objekt- & Beziehungs-Graphen
 * (Entities <-> Events <-> Chokepoints <-> Market Assets).
 */
export function buildOntologyGraph(events: GeoEvent[]): OntologyGraph {
  const nodeMap = new Map<string, OntologyNode>();
  const edgeMap = new Map<string, OntologyEdge>();
  const entityAgg = new Map<string, OntologyEntity>();

  const ensureNode = (node: OntologyNode) => {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
    } else {
      const existing = nodeMap.get(node.id)!;
      existing.severity = Math.max(existing.severity, node.severity);
    }
  };

  const addEdge = (sourceId: string, targetId: string, relation: OntologyEdge["relation"], weight = 1) => {
    const id = `${sourceId}__${relation}__${targetId}`;
    if (!edgeMap.has(id)) {
      edgeMap.set(id, { id, sourceId, targetId, relation, weight });
      const s = nodeMap.get(sourceId);
      const t = nodeMap.get(targetId);
      if (s) s.degree++;
      if (t) t.degree++;
    } else {
      edgeMap.get(id)!.weight += weight;
    }
  };

  // Focus graph on top 18 highest-signal events for clarity while indexing all entities across all events
  for (const ev of events) {
    const evNodeId = ev.code;
    ensureNode({
      id: evNodeId,
      kind: "EVENT",
      label: ev.code,
      sublabel: ev.headline.slice(0, 56),
      severity: ev.severity,
      degree: 0,
      metadata: {
        eventId: ev.id,
        region: ev.region,
        category: ev.category,
        sources: ev.sources.length,
      },
    });

    // 1. Entities linked to Event
    for (const entId of ev.entityIds) {
      const rule = ONTOLOGY_ENTITY_RULES.find((r) => r.id === entId);
      if (!rule) continue;

      if (!entityAgg.has(entId)) {
        entityAgg.set(entId, {
          id: entId,
          name: rule.name,
          entityType: rule.entityType,
          region: rule.region,
          eventIds: [],
          linkedAssetTickers: [],
          maxSeverity: ev.severity,
          mentionCount: 0,
        });
      }
      const agg = entityAgg.get(entId)!;
      agg.eventIds.push(ev.id);
      agg.mentionCount++;
      agg.maxSeverity = Math.max(agg.maxSeverity, ev.severity);
      for (const m of ev.marketImpacts) {
        const cleanTicker = m.ticker.split(" ")[0];
        if (!agg.linkedAssetTickers.includes(cleanTicker)) {
          agg.linkedAssetTickers.push(cleanTicker);
        }
      }

      ensureNode({
        id: entId,
        kind: "ENTITY",
        label: rule.name,
        sublabel: rule.entityType,
        severity: ev.severity,
        degree: 0,
        metadata: { region: rule.region, type: rule.entityType },
      });

      addEdge(evNodeId, entId, "INVOLVES", 1);
    }

    // 2. Chokepoints linked to Event
    if (ev.chokepoint) {
      const chkId = `CHK-${ev.chokepoint.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 12)}`;
      ensureNode({
        id: chkId,
        kind: "CHOKEPOINT",
        label: ev.chokepoint,
        sublabel: "MARITIME / STRATEGIC",
        severity: ev.severity,
        degree: 0,
        metadata: { region: ev.region },
      });
      addEdge(evNodeId, chkId, "LOCATED_AT", 1);
    }

    // 3. Market Assets linked to Event & Entities
    for (const impact of ev.marketImpacts) {
      const cleanTicker = impact.ticker.split(" ")[0];
      const assetId = `AST-${cleanTicker}`;
      ensureNode({
        id: assetId,
        kind: "ASSET",
        label: cleanTicker,
        sublabel: impact.sector,
        severity: impact.confidence,
        degree: 0,
        metadata: { sector: impact.sector, direction: impact.direction },
      });

      const rel: OntologyEdge["relation"] =
        impact.direction === "bullish"
          ? "IMPACTS_BULLISH"
          : impact.direction === "bearish"
          ? "IMPACTS_BEARISH"
          : "IMPACTS_VOLATILE";

      addEdge(evNodeId, assetId, rel, impact.confidence / 100);

      for (const entId of ev.entityIds.slice(0, 2)) {
        addEdge(entId, assetId, "EXPOSED_TO", 0.5);
      }
    }
  }

  const entities = Array.from(entityAgg.values()).sort(
    (a, b) => b.mentionCount * 10 + b.maxSeverity - (a.mentionCount * 10 + a.maxSeverity)
  );

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    entities,
  };
}
