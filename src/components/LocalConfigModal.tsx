"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { CustomFeedRecord, CustomTickerRecord, SourcePerspective } from "@/lib/types";

interface LocalConfigModalProps {
  open: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
  lang: "de" | "en";
}

export function LocalConfigModal({ open, onClose, onConfigChanged, lang }: LocalConfigModalProps) {
  const [tab, setTab] = useState<"feeds" | "tickers" | "llm">("feeds");
  const [feeds, setFeeds] = useState<CustomFeedRecord[]>([]);
  const [tickers, setTickers] = useState<CustomTickerRecord[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Form states
  const [feedName, setFeedName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedPerspective, setFeedPerspective] = useState<SourcePerspective>("Defense & OSINT");

  const [tickerSym, setTickerSym] = useState("");
  const [tickerLabel, setTickerLabel] = useState("");
  const [tickerDriver, setTickerDriver] = useState("");

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setFeeds(d.customFeeds ?? []);
        setTickers(d.customTickers ?? []);
        setSettings(d.settings ?? {});
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const postAction = async (payload: Record<string, unknown>, notice: string) => {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setFeeds(data.customFeeds ?? []);
      setTickers(data.customTickers ?? []);
      setSettings(data.settings ?? {});
      setSavedNotice(notice);
      onConfigChanged();
      setTimeout(() => setSavedNotice(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl border border-[#2a3547] bg-[#0e1218] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e2633] px-4 py-3 font-mono text-xs">
          <span className="font-bold tracking-wider text-slate-100">
            LOCAL WORKSTATION CONFIG // SQLITE PERSISTENT
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 border-b border-[#1e2633] bg-[#0a0d12] font-mono text-[10px]">
          <button
            onClick={() => setTab("feeds")}
            className={`border-b-2 py-2.5 ${tab === "feeds" ? "border-slate-200 text-white" : "border-transparent text-slate-500"}`}
          >
            CUSTOM RSS FEEDS ({feeds.length})
          </button>
          <button
            onClick={() => setTab("tickers")}
            className={`border-b-2 py-2.5 ${tab === "tickers" ? "border-slate-200 text-white" : "border-transparent text-slate-500"}`}
          >
            MARKET WATCHLIST ({tickers.length})
          </button>
          <button
            onClick={() => setTab("llm")}
            className={`border-b-2 py-2.5 ${tab === "llm" ? "border-slate-200 text-white" : "border-transparent text-slate-500"}`}
          >
            LOCAL LLM / OLLAMA
          </button>
        </div>

        <div className="p-4 font-mono text-xs">
          {tab === "feeds" && (
            <div className="space-y-3">
              <p className="font-sans text-xs text-slate-400">
                {lang === "de"
                  ? "Füge beliebige eigene RSS/Atom-Quellen (z. B. CSIS, Stratfor, Handelsblatt, OSINT-Feeds) zu deinen 20 Standard-Quellen hinzu."
                  : "Add any custom RSS/Atom source (e.g. CSIS, regional wires, defense blogs) alongside your 20 built-in live feeds."}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!feedName.trim() || !feedUrl.trim()) return;
                  postAction({ action: "addFeed", sourceName: feedName, url: feedUrl, perspective: feedPerspective }, "Feed gespeichert.");
                  setFeedName("");
                  setFeedUrl("");
                }}
                className="grid gap-2 sm:grid-cols-12"
              >
                <input
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="Name (z.B. Handelsblatt)"
                  className="border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white sm:col-span-4"
                />
                <input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://.../rss.xml"
                  className="border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white sm:col-span-5"
                />
                <select
                  value={feedPerspective}
                  onChange={(e) => setFeedPerspective(e.target.value as SourcePerspective)}
                  className="border border-[#232d3d] bg-[#0a0c10] px-1.5 py-1.5 text-[10px] text-slate-300 sm:col-span-3"
                >
                  <option value="Defense & OSINT">Defense & OSINT</option>
                  <option value="European">European</option>
                  <option value="Western">Western</option>
                  <option value="Regional / Global South">Regional</option>
                  <option value="Wire / Global">Wire / Global</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 border border-slate-400 bg-slate-100 py-1.5 text-[11px] font-bold text-[#0a0c10] hover:bg-white sm:col-span-12"
                >
                  <Plus className="h-3.5 w-3.5" /> FEED HINZUFÜGEN
                </button>
              </form>

              <div className="max-h-44 divide-y divide-[#18202c] overflow-y-auto border border-[#1e2633] bg-[#0a0c10]">
                {feeds.length === 0 ? (
                  <div className="p-3 text-[11px] text-slate-600">Noch keine eigenen Feeds (20 eingebaute Quellen aktiv).</div>
                ) : (
                  feeds.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200">{f.sourceName}</div>
                        <div className="truncate text-[10px] text-slate-500">{f.url}</div>
                      </div>
                      <button
                        onClick={() => postAction({ action: "removeFeed", feedId: f.id }, "Feed entfernt.")}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "tickers" && (
            <div className="space-y-3">
              <p className="font-sans text-xs text-slate-400">
                {lang === "de"
                  ? "Ergänze beliebige Yahoo-Finance-Ticker für deine persönliche Markt-Leiste (z. B. LMT, TSM, NVDA, XOM, ZIM, SIE.DE)."
                  : "Add any Yahoo Finance ticker to your personal market strip (e.g. LMT, TSM, NVDA, XOM, ZIM)."}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tickerSym.trim()) return;
                  postAction(
                    { action: "addTicker", symbol: tickerSym, label: tickerLabel || tickerSym, geoDriver: tickerDriver || "Personal Watch" },
                    `Ticker ${tickerSym.toUpperCase()} hinzugefügt.`
                  );
                  setTickerSym("");
                  setTickerLabel("");
                  setTickerDriver("");
                }}
                className="grid gap-2 sm:grid-cols-3"
              >
                <input
                  value={tickerSym}
                  onChange={(e) => setTickerSym(e.target.value)}
                  placeholder="Symbol (z.B. LMT)"
                  className="border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                />
                <input
                  value={tickerLabel}
                  onChange={(e) => setTickerLabel(e.target.value)}
                  placeholder="Name (Lockheed)"
                  className="border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                />
                <input
                  value={tickerDriver}
                  onChange={(e) => setTickerDriver(e.target.value)}
                  placeholder="Driver (Defense)"
                  className="border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 border border-slate-400 bg-slate-100 py-1.5 text-[11px] font-bold text-[#0a0c10] hover:bg-white sm:col-span-3"
                >
                  <Plus className="h-3.5 w-3.5" /> TICKER HINZUFÜGEN
                </button>
              </form>

              <div className="max-h-44 divide-y divide-[#18202c] overflow-y-auto border border-[#1e2633] bg-[#0a0c10]">
                {tickers.length === 0 ? (
                  <div className="p-3 text-[11px] text-slate-600">Keine eigenen Extra-Ticker (11 Standard-Instrumente inkl. Rheinmetall aktiv).</div>
                ) : (
                  tickers.map((t) => (
                    <div key={t.symbol} className="flex items-center justify-between px-3 py-2 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-200">{t.symbol}</span>{" "}
                        <span className="text-slate-400">— {t.label}</span>
                      </div>
                      <button
                        onClick={() => postAction({ action: "removeTicker", symbol: t.symbol }, "Ticker entfernt.")}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "llm" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postAction({ action: "saveSettings", settings }, "LLM-Konfiguration lokal in SQLite gespeichert.");
              }}
              className="space-y-3"
            >
              <p className="font-sans text-xs text-slate-400">
                {lang === "de"
                  ? "Optional: Verbinde lokales Ollama auf deinem Mac (100 % privat, kostenlos) oder deinen eigenen Gemini/OpenAI Key. Alles bleibt lokal in .geopulse-data/geopulse.sqlite."
                  : "Optional: Connect local Ollama on your Mac (100% private) or your own Gemini/OpenAI key. Stored strictly locally in SQLite."}
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] text-slate-500">LOCAL OLLAMA URL</label>
                  <input
                    value={settings.ollamaUrl ?? ""}
                    onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-500">OLLAMA MODEL</label>
                  <input
                    value={settings.ollamaModel ?? ""}
                    onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                    placeholder="llama3.2"
                    className="w-full border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-slate-500">GEMINI API KEY (OPTIONAL)</label>
                <input
                  type="password"
                  value={settings.geminiApiKey ?? ""}
                  onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                  placeholder="AIza..."
                  className="w-full border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-slate-500">OPENAI API KEY (OPTIONAL)</label>
                <input
                  type="password"
                  value={settings.openaiApiKey ?? ""}
                  onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full border border-[#232d3d] bg-[#0a0c10] px-2.5 py-1.5 text-[11px] text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full border border-slate-400 bg-slate-100 py-2 text-[11px] font-bold text-[#0a0c10] hover:bg-white"
              >
                LOKALE EINSTELLUNGEN SPEICHERN
              </button>
            </form>
          )}

          {savedNotice && (
            <div className="mt-3 border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300">
              {savedNotice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
