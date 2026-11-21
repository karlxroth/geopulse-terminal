"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Database,
  Globe2,
  Network,
  Radio,
  RefreshCw,
  Search,
  Table2,
  Terminal,
} from "lucide-react";
import type {
  GeoEvent,
  IntelligenceSnapshot,
  OntologyEntity,
  OntologyNode,
  RegionKey,
} from "@/lib/types";
import { OntologyGraphView } from "./OntologyGraph";
import { ProAlertsModal } from "./ProAlertsModal";
import { WorldMap } from "./WorldMap";

interface GeoPulseTerminalProps {
  initialSnapshot: IntelligenceSnapshot;
}

type CenterView = "graph" | "geo" | "matrix";
type ExplorerTab = "events" | "entities" | "sources";

type InspectorTarget =
  | { kind: "EVENT"; event: GeoEvent }
  | { kind: "ENTITY"; entity: OntologyEntity }
  | { kind: "ASSET"; ticker: string; label: string }
  | { kind: "CHOKEPOINT"; name: string };

function formatUtcShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--Z";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
}

function severityBadgeClass(sev: number): string {
  if (sev >= 75) return "border-[#dc2626]/60 bg-[#dc2626]/15 text-[#f87171]";
  if (sev >= 55) return "border-[#d97706]/60 bg-[#d97706]/15 text-[#fbbf24]";
  return "border-[#3b82f6]/50 bg-[#3b82f6]/15 text-[#93c5fd]";
}

export function GeoPulseTerminal({ initialSnapshot }: GeoPulseTerminalProps) {
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot>(initialSnapshot);
  const [lang, setLang] = useState<"de" | "en">("de");
  const [centerView, setCenterView] = useState<CenterView>("graph");
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>("events");
  const [regionFilter, setRegionFilter] = useState<"ALL" | RegionKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const [inspector, setInspector] = useState<InspectorTarget | null>(() =>
    initialSnapshot.events[0] ? { kind: "EVENT", event: initialSnapshot.events[0] } : null
  );

  // Analyst Console state inside docked Right Inspector
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [consoleBusy, setConsoleBusy] = useState(false);

  const syncNow = async (force = true) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/intelligence${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      if (res.ok) {
        const fresh = (await res.json()) as IntelligenceSnapshot;
        setSnapshot(fresh);
        if (fresh.events[0]) {
          setInspector({ kind: "EVENT", event: fresh.events[0] });
        }
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      syncNow(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return snapshot.events.filter((ev) => {
      if (regionFilter !== "ALL" && ev.region !== regionFilter) return false;
      if (q) {
        const hay = `${ev.code} ${ev.headline} ${ev.countryOrZone} ${ev.entityNames.join(" ")} ${ev.marketImpacts.map((m) => m.ticker).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [snapshot.events, regionFilter, searchQuery]);

  const selectedGraphNodeId = useMemo(() => {
    if (!inspector) return null;
    if (inspector.kind === "EVENT") return inspector.event.code;
    if (inspector.kind === "ENTITY") return inspector.entity.id;
    if (inspector.kind === "ASSET") return `AST-${inspector.ticker}`;
    if (inspector.kind === "CHOKEPOINT") {
      return `CHK-${inspector.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 12)}`;
    }
    return null;
  }, [inspector]);

  const handleSelectGraphNode = (node: OntologyNode) => {
    setConsoleOutput(null);
    if (node.kind === "EVENT") {
      const ev = snapshot.events.find((e) => e.code === node.id);
      if (ev) setInspector({ kind: "EVENT", event: ev });
    } else if (node.kind === "ENTITY") {
      const ent = snapshot.ontology.entities.find((e) => e.id === node.id);
      if (ent) setInspector({ kind: "ENTITY", entity: ent });
    } else if (node.kind === "ASSET") {
      const ticker = node.label;
      setInspector({ kind: "ASSET", ticker, label: node.sublabel });
    } else if (node.kind === "CHOKEPOINT") {
      setInspector({ kind: "CHOKEPOINT", name: node.label });
    }
  };

  const runAnalystQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = consoleInput.trim();
    if (!q || consoleBusy) return;
    setConsoleBusy(true);
    setConsoleOutput(null);

    const targetEventId =
      inspector?.kind === "EVENT"
        ? inspector.event.id
        : inspector?.kind === "ENTITY"
        ? inspector.entity.eventIds[0]
        : snapshot.events[0]?.id;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: targetEventId, question: q, lang }),
      });
      const data = await res.json();
      setConsoleOutput(data.answer || data.error || "No response.");
    } catch {
      setConsoleOutput("Query transport error.");
    } finally {
      setConsoleBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0c10] text-[#d7dde8]">
      {/* 1. Primary Command Header (Palantir Gotham Matte Chrome) */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#1e2633] bg-[#0e1218] px-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 border border-slate-400 bg-slate-200/10" />
            <span className="font-mono text-xs font-bold tracking-[0.16em] text-slate-100">
              GEOPULSE <span className="text-slate-500">//</span> ONTOLOGY
            </span>
          </div>

          <div className="hidden h-4 w-px bg-[#1e2633] md:block" />

          {/* Telemetry Counters */}
          <div className="hidden items-center gap-4 font-mono text-[10px] tabular-nums md:flex">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">GLOBAL RISK</span>
              <span className={`border px-1.5 py-0.5 font-bold ${severityBadgeClass(snapshot.globalRiskIndex)}`}>
                {snapshot.globalRiskIndex} [{snapshot.riskLabel}]
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">
                FEEDS {snapshot.liveSourcesOnline}/{snapshot.totalSourcesConfigured}
              </span>
            </div>
            <div className="text-slate-400">
              OBJECTS {snapshot.ontology.nodes.length} · LINKS {snapshot.ontology.edges.length}
            </div>
            <div className="text-slate-500">SCANNED {snapshot.totalArticlesScanned} · {formatUtcShort(snapshot.generatedAt)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2 top-1.5 h-3 w-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "de" ? "Objekt / Ticker / Akteur…" : "Filter object / ticker / actor…"}
              className="w-48 border border-[#232d3d] bg-[#0a0c10] py-1 pl-6 pr-2 text-[11px] text-slate-200 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex border border-[#232d3d] bg-[#0a0c10]">
            <button
              onClick={() => setLang("de")}
              className={`px-2 py-1 ${lang === "de" ? "bg-[#1c2533] text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              DE
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1 ${lang === "en" ? "bg-[#1c2533] text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              EN
            </button>
          </div>

          <button
            onClick={() => syncNow(true)}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 border border-[#232d3d] bg-[#121821] px-2.5 py-1 text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "SYNCING" : "INGEST"}</span>
          </button>

          <button
            onClick={() => setAlertsOpen(true)}
            className="border border-[#2b374b] bg-[#151e2c] px-2.5 py-1 text-slate-200 transition hover:border-slate-400 hover:text-white"
          >
            ALERTS / API
          </button>
        </div>
      </header>

      {/* 2. Static High-Density Market Instruments Strip (Click any instrument to pivot Ontology!) */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#1e2633] bg-[#0b0f15] px-3 py-1 font-mono text-[10px] tabular-nums">
        <span className="mr-2 shrink-0 text-slate-500 uppercase">EXPOSED INSTRUMENTS //</span>
        {snapshot.markets.map((m) => {
          const up = m.changePercent >= 0;
          const isSelected = inspector?.kind === "ASSET" && inspector.ticker === m.symbol;
          return (
            <button
              key={m.symbol}
              onClick={() => {
                setConsoleOutput(null);
                setInspector({ kind: "ASSET", ticker: m.symbol, label: m.label });
              }}
              className={`flex shrink-0 items-center gap-1.5 border px-2 py-0.5 transition ${
                isSelected
                  ? "border-slate-400 bg-[#1a2433] text-white"
                  : "border-[#1b222e] bg-[#0e131b] text-slate-300 hover:border-[#334155]"
              }`}
            >
              <span className="font-bold text-slate-100">{m.symbol}</span>
              <span className="text-slate-400">
                {m.currency}
                {m.price.toLocaleString("en-US", { minimumFractionDigits: m.symbol === "EURUSD=X" ? 4 : 2 })}
              </span>
              <span className={up ? "text-emerald-400" : "text-rose-400"}>
                {up ? "+" : ""}
                {m.changePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main 3-Pane Palantir Workstation */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-12">
        {/* LEFT PANE (3 cols): ONTOLOGY OBJECT EXPLORER */}
        <aside className="flex flex-col border-b border-[#1e2633] bg-[#0c1016] lg:col-span-3 lg:h-[calc(100vh-76px)] lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-3 border-b border-[#1e2633] bg-[#0e1218] font-mono text-[10px]">
            <button
              onClick={() => setExplorerTab("events")}
              className={`border-b-2 py-2 font-semibold transition ${
                explorerTab === "events" ? "border-slate-200 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              EVENTS ({filteredEvents.length})
            </button>
            <button
              onClick={() => setExplorerTab("entities")}
              className={`border-b-2 py-2 font-semibold transition ${
                explorerTab === "entities" ? "border-slate-200 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              ENTITIES ({snapshot.ontology.entities.length})
            </button>
            <button
              onClick={() => setExplorerTab("sources")}
              className={`border-b-2 py-2 font-semibold transition ${
                explorerTab === "sources" ? "border-slate-200 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              SOURCES ({snapshot.liveSourcesOnline}/{snapshot.totalSourcesConfigured})
            </button>
          </div>

          {/* Region quick-filter bar */}
          {explorerTab === "events" && (
            <div className="flex flex-wrap gap-1 border-b border-[#18202c] bg-[#0a0e14] p-2 font-mono text-[9.5px]">
              {(["ALL", "Middle East", "Europe", "Indo-Pacific", "Americas", "Africa"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`border px-1.5 py-0.5 transition ${
                    regionFilter === r
                      ? "border-slate-500 bg-[#1a2332] text-white"
                      : "border-[#1b2330] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Explorer List */}
          <div className="max-h-[420px] flex-1 divide-y divide-[#161d28] overflow-y-auto lg:max-h-none">
            {explorerTab === "events" &&
              filteredEvents.map((ev) => {
                const active = inspector?.kind === "EVENT" && inspector.event.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setConsoleOutput(null);
                      setInspector({ kind: "EVENT", event: ev });
                    }}
                    className={`w-full px-3 py-2.5 text-left transition ${
                      active ? "bg-[#151e2d] border-l-2 border-l-slate-200" : "hover:bg-[#111722]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-300">{ev.code}</span>
                        <span className={`border px-1 py-0 text-[9px] font-bold ${severityBadgeClass(ev.severity)}`}>
                          {ev.severity}
                        </span>
                        <span className="text-slate-500">{ev.countryOrZone}</span>
                      </div>
                      <span className="text-slate-600">{formatUtcShort(ev.publishedAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-snug text-slate-200">{ev.headline}</p>
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[9.5px] text-slate-500">
                      <span>{ev.sources.length} SRC · {ev.entityIds.length} ENT</span>
                      <span>{ev.marketImpacts[0]?.ticker ?? "MACRO"}</span>
                    </div>
                  </button>
                );
              })}

            {explorerTab === "entities" &&
              snapshot.ontology.entities.map((ent) => {
                const active = inspector?.kind === "ENTITY" && inspector.entity.id === ent.id;
                return (
                  <button
                    key={ent.id}
                    onClick={() => {
                      setConsoleOutput(null);
                      setInspector({ kind: "ENTITY", entity: ent });
                    }}
                    className={`w-full px-3 py-2.5 text-left transition ${
                      active ? "bg-[#151e2d] border-l-2 border-l-[#60a5fa]" : "hover:bg-[#111722]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold text-[#93c5fd]">{ent.id}</span>
                      <span className="text-slate-500">{ent.entityType}</span>
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-slate-100">{ent.name}</div>
                    <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-slate-500">
                      <span>{ent.mentionCount} LINKED EVENTS</span>
                      <span>MAX SEV {ent.maxSeverity}</span>
                    </div>
                  </button>
                );
              })}

            {explorerTab === "sources" &&
              snapshot.sourceHealth.map((src) => (
                <div key={src.sourceName} className="px-3 py-2 font-mono text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{src.sourceName}</span>
                    <span
                      className={
                        src.status === "ONLINE"
                          ? "text-emerald-400"
                          : src.status === "DEGRADED"
                          ? "text-amber-400"
                          : "text-rose-500"
                      }
                    >
                      {src.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[9.5px] text-slate-500">
                    <span>{src.perspective}</span>
                    <span className="tabular-nums">
                      {src.itemsIngested} items · {src.latencyMs}ms
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </aside>

        {/* CENTER PANE (6 cols): ANALYTICAL VIEWPORT (ONTOLOGY GRAPH / GEOSPATIAL / SIGNALS MATRIX) */}
        <section className="flex flex-col border-b border-[#1e2633] lg:col-span-6 lg:h-[calc(100vh-76px)] lg:border-b-0 lg:border-r">
          {/* Center View Switcher */}
          <div className="flex items-center justify-between border-b border-[#1e2633] bg-[#0e1218] px-3 py-1 font-mono text-[10px]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCenterView("graph")}
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 transition ${
                  centerView === "graph"
                    ? "border-slate-500 bg-[#1a2433] font-semibold text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Network className="h-3 w-3" /> [01] ONTOLOGY GRAPH
              </button>
              <button
                onClick={() => setCenterView("geo")}
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 transition ${
                  centerView === "geo"
                    ? "border-slate-500 bg-[#1a2433] font-semibold text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Globe2 className="h-3 w-3" /> [02] GEOSPATIAL
              </button>
              <button
                onClick={() => setCenterView("matrix")}
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 transition ${
                  centerView === "matrix"
                    ? "border-slate-500 bg-[#1a2433] font-semibold text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Table2 className="h-3 w-3" /> [03] SIGNALS MATRIX
              </button>
            </div>

            <span className="hidden text-slate-500 sm:inline">
              {snapshot.briefing.mode === "llm-enhanced" ? "SYNTHESIS: LLM" : "SYNTHESIS: ONTOLOGY ENGINE"}
            </span>
          </div>

          {/* Active Center View */}
          <div className="flex-1 overflow-hidden">
            {centerView === "graph" && (
              <OntologyGraphView
                graph={snapshot.ontology}
                selectedNodeId={selectedGraphNodeId}
                onSelectNode={handleSelectGraphNode}
                lang={lang}
              />
            )}

            {centerView === "geo" && (
              <WorldMap
                events={filteredEvents}
                selectedEventId={inspector?.kind === "EVENT" ? inspector.event.id : null}
                onSelectEvent={(ev) => {
                  setConsoleOutput(null);
                  setInspector({ kind: "EVENT", event: ev });
                }}
                lang={lang}
              />
            )}

            {centerView === "matrix" && (
              <div className="h-full overflow-auto bg-[#0a0c10]">
                <table className="w-full border-collapse text-left font-mono text-[11px] tabular-nums">
                  <thead className="sticky top-0 border-b border-[#1e2633] bg-[#0e1218] text-[10px] text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-2 py-2">SEV</th>
                      <th className="px-2 py-2">THEATER</th>
                      <th className="px-2 py-2">SIGNAL HEADLINE</th>
                      <th className="px-2 py-2">ASSETS</th>
                      <th className="px-2 py-2 text-right">SRC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151c27]">
                    {filteredEvents.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => {
                          setConsoleOutput(null);
                          setInspector({ kind: "EVENT", event: ev });
                        }}
                        className={`cursor-pointer transition ${
                          inspector?.kind === "EVENT" && inspector.event.id === ev.id
                            ? "bg-[#162030]"
                            : "hover:bg-[#101620]"
                        }`}
                      >
                        <td className="px-3 py-2 font-bold text-slate-400">{ev.code}</td>
                        <td className="px-2 py-2">
                          <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${severityBadgeClass(ev.severity)}`}>
                            {ev.severity}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-slate-300">{ev.countryOrZone}</td>
                        <td className="max-w-md truncate px-2 py-2 font-sans text-xs text-slate-200">{ev.headline}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-slate-400">
                          {ev.marketImpacts.map((m) => m.ticker.split(" ")[0]).join(", ")}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-400">{ev.sources.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Docked Regional Risk & Executive Synthesis Strip */}
          <div className="border-t border-[#1e2633] bg-[#0e1218] px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500">THEATER INDICES //</span>
                {snapshot.regionalRisks.slice(0, 5).map((rr) => (
                  <button
                    key={rr.region}
                    onClick={() => setRegionFilter(regionFilter === rr.region ? "ALL" : rr.region)}
                    className="flex items-center gap-1.5 hover:text-white"
                  >
                    <span className="text-slate-400">{rr.region.toUpperCase()}</span>
                    <span
                      className={`font-bold tabular-nums ${
                        rr.score >= 72 ? "text-rose-400" : rr.score >= 55 ? "text-amber-400" : "text-slate-300"
                      }`}
                    >
                      {rr.score}
                    </span>
                  </button>
                ))}
              </div>
              <span className="truncate text-slate-400">
                {lang === "de" ? snapshot.briefing.topMarketCallDe : snapshot.briefing.topMarketCallEn}
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT PANE (3 cols): DOCKED PALANTIR OBJECT INSPECTOR */}
        <aside className="flex flex-col bg-[#0c1016] lg:col-span-3 lg:h-[calc(100vh-76px)]">
          <div className="flex items-center justify-between border-b border-[#1e2633] bg-[#0e1218] px-3 py-2 font-mono text-[10px]">
            <span className="flex items-center gap-1.5 font-semibold tracking-wider text-slate-200 uppercase">
              <Database className="h-3 w-3 text-slate-400" />
              OBJECT INSPECTOR
            </span>
            {inspector && (
              <span className="text-slate-500">{inspector.kind}</span>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3.5 text-xs">
            {/* EVENT INSPECTOR */}
            {inspector?.kind === "EVENT" && (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-slate-400">{inspector.event.code}</span>
                    <span className={`border px-1.5 py-0.5 font-bold ${severityBadgeClass(inspector.event.severity)}`}>
                      SEV {inspector.event.severity}/100 · CONF {inspector.event.confidenceScore}%
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold leading-snug text-white">{inspector.event.headline}</h2>
                  <p className="mt-2 leading-relaxed text-slate-300">
                    {lang === "de" ? inspector.event.summaryDe : inspector.event.summaryEn}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-px border border-[#1e2633] bg-[#1e2633] font-mono text-[10px]">
                  <div className="bg-[#0a0e14] p-2">
                    <div className="text-slate-500">THEATER</div>
                    <div className="mt-0.5 text-slate-200">{inspector.event.countryOrZone}</div>
                  </div>
                  <div className="bg-[#0a0e14] p-2">
                    <div className="text-slate-500">CATEGORY</div>
                    <div className="mt-0.5 text-slate-200">{inspector.event.category}</div>
                  </div>
                  <div className="bg-[#0a0e14] p-2">
                    <div className="text-slate-500">COORDINATES</div>
                    <div className="mt-0.5 tabular-nums text-slate-200">
                      {inspector.event.lat.toFixed(2)}°, {inspector.event.lng.toFixed(2)}°
                    </div>
                  </div>
                  <div className="bg-[#0a0e14] p-2">
                    <div className="text-slate-500">CHOKEPOINT</div>
                    <div className="mt-0.5 text-slate-200">{inspector.event.chokepoint ?? "NONE"}</div>
                  </div>
                </div>

                {/* Linked Ontology Entities (1-click pivot!) */}
                <div>
                  <div className="mb-1.5 font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    LINKED ENTITIES ({inspector.event.entityIds.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inspector.event.entityIds.map((entId) => {
                      const entObj = snapshot.ontology.entities.find((e) => e.id === entId);
                      if (!entObj) return null;
                      return (
                        <button
                          key={entId}
                          onClick={() => setInspector({ kind: "ENTITY", entity: entObj })}
                          className="border border-[#273449] bg-[#111926] px-2 py-1 font-mono text-[10px] text-[#93c5fd] transition hover:border-[#60a5fa] hover:text-white"
                        >
                          {entObj.id} · {entObj.name}
                        </button>
                      );
                    })}
                    {inspector.event.entityIds.length === 0 && (
                      <span className="font-mono text-[10px] text-slate-600">No explicit state/actor extracted</span>
                    )}
                  </div>
                </div>

                {/* Market Impact Vectors */}
                <div>
                  <div className="mb-1.5 font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    MARKET TRANSMISSION VECTORS
                  </div>
                  <div className="space-y-1.5">
                    {inspector.event.marketImpacts.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => setInspector({ kind: "ASSET", ticker: m.ticker.split(" ")[0], label: m.sector })}
                        className="w-full border border-[#1e2633] bg-[#0a0e14] p-2.5 text-left transition hover:border-[#334155]"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-bold text-slate-100">
                            {m.ticker} <span className="font-normal text-slate-500">// {m.sector}</span>
                          </span>
                          <span
                            className={
                              m.direction === "bullish"
                                ? "text-emerald-400"
                                : m.direction === "bearish"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }
                          >
                            {m.direction.toUpperCase()} ({m.confidence}%)
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {lang === "de" ? m.rationaleDe : m.rationaleEn}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 72h Watchpoint */}
                <div className="border-l-2 border-[#d97706] bg-[#14120e] p-2.5">
                  <div className="font-mono text-[10px] font-bold text-[#fbbf24]">72H WATCHPOINT</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    {lang === "de" ? inspector.event.watchpoint72hDe : inspector.event.watchpoint72hEn}
                  </p>
                </div>

                {/* Source Corroboration Matrix */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    <span>CORROBORATING DISPATCHES ({inspector.event.sources.length})</span>
                    <Radio className="h-3 w-3 text-emerald-500" />
                  </div>
                  <div className="divide-y divide-[#18202c] border border-[#1e2633] bg-[#0a0e14]">
                    {inspector.event.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start justify-between gap-2 p-2 transition hover:bg-[#111824]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="font-semibold text-slate-200">{src.sourceName}</span>
                            <span className="text-slate-500">[{src.perspective}]</span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400 group-hover:text-slate-200">
                            {src.title}
                          </p>
                        </div>
                        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-200" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ENTITY INSPECTOR (Palantir Pivot!) */}
            {inspector?.kind === "ENTITY" && (
              <>
                <div className="border-b border-[#1e2633] pb-3">
                  <div className="font-mono text-[10px] font-bold text-[#93c5fd]">
                    {inspector.entity.id} // {inspector.entity.entityType}
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-white">{inspector.entity.name}</h2>
                  <div className="mt-2 flex gap-4 font-mono text-[10px] text-slate-400">
                    <span>REGION: {inspector.entity.region}</span>
                    <span>MAX SEV: {inspector.entity.maxSeverity}</span>
                    <span>EVENTS: {inspector.entity.eventIds.length}</span>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 font-mono text-[10px] font-semibold text-slate-500 uppercase">
                    EXPOSED INSTRUMENTS
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inspector.entity.linkedAssetTickers.map((t) => (
                      <button
                        key={t}
                        onClick={() => setInspector({ kind: "ASSET", ticker: t, label: "Linked Instrument" })}
                        className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 font-mono text-[10px] font-semibold text-slate-500 uppercase">
                    INVOLVED EVENTS ({inspector.entity.eventIds.length})
                  </div>
                  <div className="divide-y divide-[#18202c] border border-[#1e2633] bg-[#0a0e14]">
                    {snapshot.events
                      .filter((ev) => inspector.entity.eventIds.includes(ev.id))
                      .map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => setInspector({ kind: "EVENT", event: ev })}
                          className="w-full p-2.5 text-left transition hover:bg-[#121a27]"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold text-slate-300">{ev.code}</span>
                            <span className={`border px-1 text-[9px] ${severityBadgeClass(ev.severity)}`}>
                              SEV {ev.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-200">{ev.headline}</p>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* ASSET INSPECTOR */}
            {inspector?.kind === "ASSET" && (
              <>
                <div className="border-b border-[#1e2633] pb-3">
                  <div className="font-mono text-[10px] font-bold text-emerald-400">AST-{inspector.ticker} // MARKET INSTRUMENT</div>
                  <h2 className="mt-1 text-base font-semibold text-white">
                    {inspector.ticker} — {inspector.label}
                  </h2>
                </div>
                <div>
                  <div className="mb-1.5 font-mono text-[10px] font-semibold text-slate-500 uppercase">
                    GEOPOLITICAL DRIVERS LINKED TO {inspector.ticker}
                  </div>
                  <div className="divide-y divide-[#18202c] border border-[#1e2633] bg-[#0a0e14]">
                    {snapshot.events
                      .filter((ev) => ev.marketImpacts.some((m) => m.ticker.includes(inspector.ticker)))
                      .map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => setInspector({ kind: "EVENT", event: ev })}
                          className="w-full p-2.5 text-left transition hover:bg-[#121a27]"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold text-slate-300">{ev.code} · {ev.countryOrZone}</span>
                            <span className={`border px-1 text-[9px] ${severityBadgeClass(ev.severity)}`}>SEV {ev.severity}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-200">{ev.headline}</p>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* CHOKEPOINT INSPECTOR */}
            {inspector?.kind === "CHOKEPOINT" && (
              <>
                <div className="border-b border-[#1e2633] pb-3">
                  <div className="font-mono text-[10px] font-bold text-amber-400">STRATEGIC CHOKEPOINT</div>
                  <h2 className="mt-1 text-base font-semibold text-white">{inspector.name}</h2>
                </div>
                <div className="divide-y divide-[#18202c] border border-[#1e2633] bg-[#0a0e14]">
                  {snapshot.events
                    .filter((ev) => ev.chokepoint === inspector.name)
                    .map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setInspector({ kind: "EVENT", event: ev })}
                        className="w-full p-2.5 text-left transition hover:bg-[#121a27]"
                      >
                        <div className="font-mono text-[10px] text-slate-400">
                          {ev.code} · SEV {ev.severity}
                        </div>
                        <p className="mt-1 text-xs text-slate-200">{ev.headline}</p>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>

          {/* Docked Monospace Analyst Query Console */}
          <div className="border-t border-[#1e2633] bg-[#0a0d12] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <Terminal className="h-3 w-3 text-slate-400" />
              <span>ONTOLOGY QUERY CONSOLE</span>
            </div>

            {consoleOutput && (
              <div className="mb-2 max-h-36 overflow-y-auto whitespace-pre-line border border-[#1e2633] bg-[#0e131b] p-2 font-mono text-[10.5px] leading-relaxed text-slate-300">
                {consoleOutput}
              </div>
            )}

            <form onSubmit={runAnalystQuery} className="flex gap-1.5">
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder={lang === "de" ? "> Risiko, Markt-Impact oder Szenario abfragen…" : "> query escalation, exposure, or scenario…"}
                className="flex-1 border border-[#232d3d] bg-[#0e1218] px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={consoleBusy || !consoleInput.trim()}
                className="border border-[#2b374b] bg-[#182231] px-2.5 py-1.5 font-mono text-[10px] font-semibold text-slate-200 hover:border-slate-400 hover:text-white disabled:opacity-40"
              >
                {consoleBusy ? "…" : "RUN"}
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* Institutional Alert / API Subscription Modal (only opened on explicit button click) */}
      <ProAlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} lang={lang} />
    </div>
  );
}
