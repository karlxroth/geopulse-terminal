"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  Globe2,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Activity,
  X,
} from "lucide-react";
import type { GeoEvent } from "@/lib/types";

interface EventDossierModalProps {
  event: GeoEvent | null;
  onClose: () => void;
  lang: "de" | "en";
}

export function EventDossierModal({ event, onClose, lang }: EventDossierModalProps) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string; mode?: string }[]>([]);
  const [asking, setAsking] = useState(false);

  if (!event) return null;

  const askQuick = async (promptText: string) => {
    const q = promptText.trim();
    if (!q || asking) return;
    setAsking(true);
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, question: q, lang }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: data.answer || data.error || "Keine Antwort verfügbar.", mode: data.mode },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: lang === "de" ? "Verbindungsfehler zum KI-Analysten." : "Connection error to AI analyst." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const quickPrompts =
    lang === "de"
      ? ["Welche ETFs & Rohstoffe reagieren am stärksten?", "Wie hoch ist das 72h-Eskalationsrisiko?", "Fasse die Quellenlage neutral zusammen."]
      : ["Which ETFs & commodities react most?", "What is the 72h escalation scenario?", "Summarize multi-source perspectives neutrally."];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-slate-800 bg-[#070d18] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                  event.severity >= 75
                    ? "border border-rose-500/40 bg-rose-500/15 text-rose-300"
                    : event.severity >= 55
                    ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                }`}
              >
                SEVERITY {event.severity}/100
              </span>
              <span className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                <Globe2 className="h-3 w-3 text-cyan-400" />
                {event.region} · {event.countryOrZone}
              </span>
              <span className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
                {event.sources.length} {lang === "de" ? "Quelle(n)" : "Source(s)"} · {event.confidenceScore}%
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-snug text-white">{event.headline}</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white"
            aria-label="Close dossier"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Intelligence Breakdown */}
        <div className="mt-5 space-y-4">
          <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
            <h3 className="mb-1.5 font-mono text-[11px] font-bold tracking-wider text-cyan-400 uppercase">
              {lang === "de" ? "01 · Lagebild & Synthese" : "01 · Situation Synthesis"}
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">{lang === "de" ? event.summaryDe : event.summaryEn}</p>
            <div className="mt-3 grid gap-3 border-t border-slate-800/80 pt-3 sm:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] font-semibold text-amber-400 uppercase">
                  {lang === "de" ? "Warum es zählt" : "Why It Matters"}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {lang === "de" ? event.whyItMattersDe : event.whyItMattersEn}
                </p>
              </div>
              <div>
                <div className="font-mono text-[10px] font-semibold text-rose-400 uppercase">
                  {lang === "de" ? "72h-Watchpoint" : "72h Watchpoint"}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {lang === "de" ? event.watchpoint72hDe : event.watchpoint72hEn}
                </p>
              </div>
            </div>
          </section>

          {/* Market Impact Matrix */}
          <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                {lang === "de" ? "02 · Markt- & Sektor-Impact (MacroSignal)" : "02 · Market & Sector Impact (MacroSignal)"}
              </h3>
              <span className="font-mono text-[10px] text-slate-500">
                {lang === "de" ? "Keine Anlageberatung" : "Informational Only"}
              </span>
            </div>
            <div className="space-y-2.5">
              {event.marketImpacts.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{m.ticker}</span>
                      <span className="text-xs text-slate-400">· {m.sector}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{lang === "de" ? m.rationaleDe : m.rationaleEn}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        m.direction === "bullish"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : m.direction === "bearish"
                          ? "bg-rose-500/15 text-rose-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {m.direction === "bullish" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : m.direction === "bearish" ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Activity className="h-3 w-3" />
                      )}
                      {m.direction}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{m.confidence}% conf.</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Multi-Perspective Source Verification */}
          <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
            <h3 className="mb-2.5 font-mono text-[11px] font-bold tracking-wider text-indigo-400 uppercase">
              {lang === "de" ? "03 · Quellen-Verifikation & Perspektiven" : "03 · Source Verification & Perspectives"}
            </h3>
            <div className="space-y-2">
              {event.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800/90 bg-slate-950/70 px-3 py-2.5 transition hover:border-cyan-500/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-cyan-300">{src.sourceName}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {src.perspective}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-300 group-hover:text-white">{src.title}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-cyan-300" />
                </a>
              ))}
            </div>
          </section>

          {/* Interactive Ask GeoPulse AI Analyst */}
          <section className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-950/90 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold tracking-wider text-cyan-300 uppercase">
                  Ask GeoPulse AI Analyst
                </h3>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                <AlertTriangle className="h-3 w-3 text-amber-400" /> AI-Native Synthesis
              </span>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  onClick={() => askQuick(qp)}
                  disabled={asking}
                  className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {qp}
                </button>
              ))}
            </div>

            {chatHistory.length > 0 && (
              <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`whitespace-pre-line rounded-lg p-2.5 ${
                      msg.role === "user"
                        ? "ml-8 bg-cyan-500/15 text-cyan-100"
                        : "mr-4 border border-slate-800 bg-slate-900/90 text-slate-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                askQuick(question);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  lang === "de"
                    ? "Frage zur Lage, Risiko oder Markt-Impact stellen…"
                    : "Ask about escalation risk, trade routes, or market exposure…"
                }
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {asking ? "…" : lang === "de" ? "Analysieren" : "Analyze"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
