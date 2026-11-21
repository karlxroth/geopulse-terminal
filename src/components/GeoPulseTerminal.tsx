"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Cpu,
  Globe2,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { CategoryKey, GeoEvent, IntelligenceSnapshot, RegionKey } from "@/lib/types";
import { EventDossierModal } from "./EventDossierModal";
import { ProAlertsModal } from "./ProAlertsModal";
import { WorldMap } from "./WorldMap";

interface GeoPulseTerminalProps {
  initialSnapshot: IntelligenceSnapshot;
}

const REGIONS: ("All" | RegionKey)[] = ["All", "Middle East", "Europe", "Indo-Pacific", "Americas", "Africa", "Global Macro"];
const CATEGORIES: ("All" | CategoryKey)[] = [
  "All",
  "Conflict & Security",
  "Energy & Chokepoints",
  "Sanctions & Trade",
  "Cyber & Tech",
  "Diplomacy",
  "Elections & Policy",
];

function formatRelativeTime(iso: string, lang: "de" | "en"): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return lang === "de" ? "gerade eben" : "just now";
  if (diffMin < 60) return lang === "de" ? `vor ${diffMin} Min.` : `${diffMin}m ago`;
  const hrs = Math.round(diffMin / 60);
  if (hrs < 24) return lang === "de" ? `vor ${hrs} Std.` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return lang === "de" ? `vor ${days} T.` : `${days}d ago`;
}

export function GeoPulseTerminal({ initialSnapshot }: GeoPulseTerminalProps) {
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot>(initialSnapshot);
  const [lang, setLang] = useState<"de" | "en">("de");
  const [selectedRegion, setSelectedRegion] = useState<"All" | RegionKey>("All");
  const [selectedCategory, setSelectedCategory] = useState<"All" | CategoryKey>("All");
  const [minSeverity, setMinSeverity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<GeoEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);

  const syncNow = async (force = true) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/intelligence${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      if (res.ok) {
        const fresh = (await res.json()) as IntelligenceSnapshot;
        setSnapshot(fresh);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Vollautomatischer Client-Autopilot: alle 5 Minuten neue Daten ziehen
  useEffect(() => {
    const timer = setInterval(() => {
      syncNow(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return snapshot.events.filter((ev) => {
      if (selectedRegion !== "All" && ev.region !== selectedRegion) return false;
      if (selectedCategory !== "All" && ev.category !== selectedCategory) return false;
      if (ev.severity < minSeverity) return false;
      if (q) {
        const hay = `${ev.headline} ${ev.countryOrZone} ${ev.region} ${ev.tags.join(" ")} ${ev.marketImpacts.map((m) => m.ticker).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [snapshot.events, selectedRegion, selectedCategory, minSeverity, searchQuery]);

  const riskAccent =
    snapshot.globalRiskIndex >= 75
      ? "text-rose-400 border-rose-500/40 bg-rose-500/10"
      : snapshot.globalRiskIndex >= 55
      ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
      : "text-cyan-300 border-cyan-500/40 bg-cyan-500/10";

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      {/* Top Command Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#05080f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
              <Radar className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-bold tracking-wider text-white sm:text-base">
                  GEOPULSE <span className="text-cyan-400">TERMINAL</span>
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  AI AUTOPILOT
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-400">
                {snapshot.liveSourcesOnline > 0
                  ? `${snapshot.liveSourcesOnline} Live-Feeds · ${snapshot.totalArticlesScanned} ${lang === "de" ? "Meldungen gescannt" : "articles scanned"}`
                  : lang === "de"
                  ? "Offline-Resilienz-Modus · Auto-Sync aktiv"
                  : "Resilient Snapshot Mode · Auto-Sync active"}{" "}
                · {lang === "de" ? "Stand:" : "Updated:"} {formatRelativeTime(snapshot.generatedAt, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* DE / EN Toggle */}
            <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 font-mono text-[11px]">
              <button
                onClick={() => setLang("de")}
                className={`rounded-md px-2 py-1 transition ${lang === "de" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"}`}
              >
                DE
              </button>
              <button
                onClick={() => setLang("en")}
                className={`rounded-md px-2 py-1 transition ${lang === "en" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"}`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => syncNow(true)}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-cyan-400" : ""}`} />
              <span className="hidden sm:inline">{syncing ? "Syncing…" : lang === "de" ? "Live-Sync" : "Sync Now"}</span>
            </button>

            <button
              onClick={() => setProModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-3.5 py-1.5 font-mono text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:brightness-110"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span>{lang === "de" ? "Pro Alerts" : "Pro Alerts"}</span>
            </button>
          </div>
        </div>

        {/* Live Market-Impact Ticker Tape */}
        <div className="overflow-hidden border-t border-slate-800/70 bg-slate-950/90 py-1.5">
          <div className="ticker-track">
            {[...snapshot.markets, ...snapshot.markets].map((m, idx) => {
              const up = m.changePercent >= 0;
              return (
                <div
                  key={`${m.symbol}-${idx}`}
                  className="mx-3 flex items-center gap-2 border-r border-slate-800/80 pr-5 font-mono text-[11px]"
                >
                  <span className="font-bold text-slate-200">{m.label}</span>
                  <span className="text-slate-400">{m.symbol}</span>
                  <span className="font-semibold text-white">
                    {m.currency}
                    {m.price.toLocaleString("en-US", { minimumFractionDigits: m.symbol === "EURUSD=X" ? 4 : 2 })}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {up ? "+" : ""}
                    {m.changePercent.toFixed(2)}%
                  </span>
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] text-cyan-300/80">{m.geoDriver}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Command Workspace */}
      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        {/* Top Metrics + AI Executive Briefing Strip */}
        <div className="mb-5 grid gap-4 lg:grid-cols-12">
          {/* Global Risk Index Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#080f1d] p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Global Risk Index
              </span>
              <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${riskAccent}`}>
                {snapshot.riskLabel}
              </span>
            </div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-black tracking-tight text-white">{snapshot.globalRiskIndex}</span>
              <span className="font-mono text-sm text-slate-500">/ 100</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500 transition-all duration-700"
                style={{ width: `${snapshot.globalRiskIndex}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 pt-1 font-mono text-[10px]">
              {snapshot.regionalRisks.slice(0, 3).map((rr) => (
                <button
                  key={rr.region}
                  onClick={() => setSelectedRegion(rr.region === selectedRegion ? "All" : rr.region)}
                  className="rounded-lg border border-slate-800/90 bg-slate-950/70 p-1.5 text-left transition hover:border-cyan-500/40"
                >
                  <div className="truncate text-slate-400">{rr.region}</div>
                  <div className={`font-bold ${rr.score >= 72 ? "text-rose-400" : rr.score >= 55 ? "text-amber-300" : "text-cyan-300"}`}>
                    {rr.score}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Executive Briefing Card */}
          <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#091526] via-[#080f1d] to-[#070b15] p-4 lg:col-span-9">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold tracking-wider text-cyan-300 uppercase">
                  {lang === "de" ? "AI EXECUTIVE BRIEFING · DIE WELT IN 60 SEKUNDEN" : "AI EXECUTIVE BRIEFING · GLOBAL SITUATION IN 60S"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-0.5 font-mono text-[10px] text-slate-300">
                <Cpu className="h-3 w-3 text-emerald-400" />
                {snapshot.briefing.mode === "llm-enhanced" ? "LLM Deep Synthesis" : "GeoPulse AI Engine"}
              </span>
            </div>

            <h2 className="text-sm font-semibold text-white sm:text-base">
              {lang === "de" ? snapshot.briefing.headlineDe : snapshot.briefing.headlineEn}
            </h2>

            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-300">
              {(lang === "de" ? snapshot.briefing.bulletsDe : snapshot.briefing.bulletsEn).map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              <Activity className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong className="font-mono uppercase">{lang === "de" ? "MacroSignal Call:" : "MacroSignal Call:"}</strong>{" "}
                {lang === "de" ? snapshot.briefing.topMarketCallDe : snapshot.briefing.topMarketCallEn}
              </span>
            </div>
          </div>
        </div>

        {/* Main Split: Left Map + Sector Impact Grid | Right Live Intelligence Feed */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left 7 Cols: Live World Map + Market Impact Cards */}
          <div className="space-y-5 lg:col-span-7">
            <WorldMap
              events={filteredEvents}
              selectedEventId={selectedEvent?.id ?? null}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              lang={lang}
            />

            {/* Regional Tension Matrix + Live Market Exposure */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/80 bg-[#080f1d] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase">
                    {lang === "de" ? "Regionale Spannungs-Matrix" : "Regional Tension Matrix"}
                  </h3>
                  <Globe2 className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="space-y-2.5">
                  {snapshot.regionalRisks.map((rr) => (
                    <button
                      key={rr.region}
                      onClick={() => setSelectedRegion(rr.region === selectedRegion ? "All" : rr.region)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                        selectedRegion === rr.region
                          ? "border-cyan-400/60 bg-cyan-500/10"
                          : "border-slate-800/70 bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{rr.region}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {rr.eventCount} {lang === "de" ? "Events" : "events"} ·{" "}
                          <strong className={rr.score >= 72 ? "text-rose-400" : rr.score >= 55 ? "text-amber-300" : "text-cyan-300"}>
                            {rr.score}/100
                          </strong>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                        <div
                          className={`h-full rounded-full ${
                            rr.score >= 72 ? "bg-rose-500" : rr.score >= 55 ? "bg-amber-400" : "bg-cyan-400"
                          }`}
                          style={{ width: `${rr.score}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Geo-Sensitive Markets */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#080f1d] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase">
                    {lang === "de" ? "Geopolitik-sensitive Märkte" : "Geo-Sensitive Markets"}
                  </h3>
                  <span className="font-mono text-[10px] text-emerald-400">MACROSIGNAL</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {snapshot.markets.slice(0, 6).map((m) => {
                    const up = m.changePercent >= 0;
                    return (
                      <div key={m.symbol} className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-cyan-300">{m.symbol}</span>
                          <span className={`font-mono text-[10px] font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                            {up ? "+" : ""}
                            {m.changePercent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-200">{m.label}</div>
                        <div className="mt-0.5 font-mono text-sm font-bold text-white">
                          {m.currency}
                          {m.price.toLocaleString("en-US", { minimumFractionDigits: m.symbol === "EURUSD=X" ? 4 : 2 })}
                        </div>
                        <div className="mt-1 truncate font-mono text-[9px] text-slate-500">{m.geoDriver}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: AI-Synthesized Live Intelligence Feed */}
          <div className="flex flex-col rounded-2xl border border-slate-800/80 bg-[#080f1d] lg:col-span-5">
            {/* Feed Filters */}
            <div className="border-b border-slate-800/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <h2 className="font-mono text-xs font-bold tracking-wider text-white uppercase">
                    {lang === "de" ? "LIVE INTELLIGENCE STREAM" : "LIVE INTELLIGENCE STREAM"}
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-cyan-300">
                  {filteredEvents.length} / {snapshot.events.length}
                </span>
              </div>

              <div className="relative mb-2.5">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === "de"
                      ? "Suche nach Land, Ticker (CL=F, SMH) oder Krise…"
                      : "Filter by country, ticker (CL=F, SMH), or crisis…"
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRegion(r)}
                    className={`rounded-md px-2 py-1 font-mono text-[10px] transition ${
                      selectedRegion === r
                        ? "bg-cyan-500/20 font-bold text-cyan-300 ring-1 ring-cyan-500/50"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as "All" | CategoryKey)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? (lang === "de" ? "Alle Kategorien" : "All Categories") : c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setMinSeverity((prev) => (prev === 0 ? 65 : 0))}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                    minSeverity > 0
                      ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  {minSeverity > 0 ? "★ High-Severity Only (≥65)" : lang === "de" ? "Nur Eskalationen (≥65)" : "High-Severity Only (≥65)"}
                </button>
              </div>
            </div>

            {/* Scrollable Event Cards */}
            <div className="max-h-[760px] flex-1 space-y-2.5 overflow-y-auto p-3">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-slate-500">
                  {lang === "de" ? "Keine Ereignisse für diesen Filter gefunden." : "No intelligence events match this filter."}
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <article
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`group cursor-pointer rounded-xl border p-3.5 transition ${
                      selectedEvent?.id === ev.id
                        ? "border-cyan-400/70 bg-cyan-950/20"
                        : "border-slate-800/80 bg-slate-950/75 hover:border-slate-600 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            ev.severity >= 75
                              ? "bg-rose-500/20 text-rose-300"
                              : ev.severity >= 55
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-cyan-500/20 text-cyan-300"
                          }`}
                        >
                          {ev.severity}/100
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-cyan-300">{ev.countryOrZone}</span>
                        <span className="font-mono text-[10px] text-slate-500">· {ev.category}</span>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">
                        {formatRelativeTime(ev.publishedAt, lang)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold leading-snug text-slate-100 group-hover:text-cyan-200">
                      {ev.headline}
                    </h3>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {lang === "de" ? ev.summaryDe : ev.summaryEn}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ev.marketImpacts.slice(0, 2).map((m, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                              m.direction === "bullish"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : m.direction === "bearish"
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {m.ticker.split(" ")[0]} {m.direction === "bullish" ? "↑" : m.direction === "bearish" ? "↓" : "↕"}
                          </span>
                        ))}
                      </div>

                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                        <ShieldCheck className="h-3 w-3 text-emerald-400" />
                        {ev.sources.length} {lang === "de" ? "Quelle(n)" : "src"} ·{" "}
                        <span className="text-cyan-400 group-hover:underline">
                          {lang === "de" ? "KI-Dossier →" : "AI Dossier →"}
                        </span>
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Slide-Over AI Dossier & Ask AI Drawer */}
      <EventDossierModal event={selectedEvent} onClose={() => setSelectedEvent(null)} lang={lang} />

      {/* Conversion-Ready Pro Alerts Modal */}
      <ProAlertsModal open={proModalOpen} onClose={() => setProModalOpen(false)} lang={lang} />
    </div>
  );
}
