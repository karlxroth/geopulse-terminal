"use client";

import React, { useState } from "react";
import { BellRing, CheckCircle2, CreditCard, Mail, Send, Sparkles, X } from "lucide-react";

interface ProAlertsModalProps {
  open: boolean;
  onClose: () => void;
  lang: "de" | "en";
}

export function ProAlertsModal({ open, onClose, lang }: ProAlertsModalProps) {
  const [email, setEmail] = useState("");
  const [minSeverity, setMinSeverity] = useState(75);
  const [plan, setPlan] = useState<"free-briefing" | "pro-alerts">("pro-alerts");
  const [status, setStatus] = useState<{ ok?: boolean; msg?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      // Immer zuerst lokal für 07:00-Briefing / Alert-Regel registrieren
      const subRes = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          minSeverity,
          plan,
          regions: ["Middle East", "Europe", "Indo-Pacific", "Americas"],
        }),
      });
      const subData = await subRes.json();
      if (!subRes.ok) {
        setStatus({ ok: false, msg: subData.error || "Fehler beim Speichern." });
        return;
      }

      if (plan === "pro-alerts") {
        // Echten Stripe Checkout anstoßen (leitet weiter sobald STRIPE_SECRET_KEY gesetzt ist)
        const ckRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const ckData = await ckRes.json();
        if (ckRes.ok && ckData.configured && ckData.url) {
          window.location.href = ckData.url;
          return;
        }
        setStatus({
          ok: true,
          msg:
            ckData.message ||
            "Pro-Alert-Profil lokal gespeichert! Trage STRIPE_SECRET_KEY für Live-Checkout ein.",
        });
      } else {
        setStatus({ ok: true, msg: subData.message });
      }
      setEmail("");
    } catch {
      setStatus({ ok: false, msg: "Netzwerkfehler." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#080f1d] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
          GEOPULSE PRO · STRIPE + RESEND + TELEGRAM
        </div>

        <h2 className="text-xl font-bold text-white">
          {lang === "de" ? "Vollautomatische Echtzeit-Krisen- & Markt-Alerts" : "Automated Real-Time Crisis & Market Alerts"}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          {lang === "de"
            ? "07:00-Executive-Dossier per Resend E-Mail + sofortige Telegram- & E-Mail-Alerts sobald ein globales Ereignis deinen Severity-Schwellenwert überschreitet."
            : "07:00 Executive Dossier via Resend + instant Telegram & Email alerts whenever a breaking event crosses your severity threshold."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPlan("free-briefing")}
            className={`rounded-xl border p-3.5 text-left transition ${
              plan === "free-briefing"
                ? "border-cyan-400 bg-cyan-500/10"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
              <Mail className="h-3.5 w-3.5 text-cyan-400" /> DAILY BRIEFING
            </div>
            <div className="mt-1 text-lg font-bold text-white">€0</div>
            <div className="mt-1 text-[11px] text-slate-400">07:00 AI-Dossier per E-Mail</div>
          </button>

          <button
            type="button"
            onClick={() => setPlan("pro-alerts")}
            className={`rounded-xl border p-3.5 text-left transition ${
              plan === "pro-alerts"
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300">
              <CreditCard className="h-3.5 w-3.5" /> PRO TERMINAL
            </div>
            <div className="mt-1 text-lg font-bold text-white">
              €19<span className="text-xs font-normal text-slate-400">/Mo</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-300">7 Tage frei · Telegram + ETF-Alerts</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 flex items-center justify-between font-mono text-[11px] text-slate-300">
              <span>{lang === "de" ? "Alert-Schwelle (Severity)" : "Alert Severity Threshold"}</span>
              <span className="font-bold text-rose-400">≥ {minSeverity}/100</span>
            </label>
            <input
              type="range"
              min={50}
              max={90}
              step={5}
              value={minSeverity}
              onChange={(e) => setMinSeverity(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@domain.de"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
          >
            {plan === "pro-alerts" ? <Send className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
            {submitting
              ? "Aktiviere…"
              : plan === "pro-alerts"
              ? lang === "de"
                ? "7 Tage kostenlos starten (Stripe Pro)"
                : "Start 7-Day Free Trial (Stripe Pro)"
              : lang === "de"
              ? "Kostenloses 07:00-Briefing aktivieren"
              : "Activate Free 07:00 Briefing"}
          </button>
        </form>

        {status && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              status.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
            }`}
          >
            {status.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{status.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
