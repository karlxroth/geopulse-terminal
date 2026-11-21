"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";

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
      const subRes = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          minSeverity,
          plan,
          regions: ["Middle East", "Europe", "Indo-Pacific", "Americas", "Africa"],
        }),
      });
      const subData = await subRes.json();
      if (!subRes.ok) {
        setStatus({ ok: false, msg: subData.error || "Registration failed." });
        return;
      }

      if (plan === "pro-alerts") {
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
          msg: ckData.message || "Alert rule saved locally. Configure STRIPE_SECRET_KEY for live billing.",
        });
      } else {
        setStatus({ ok: true, msg: subData.message });
      }
      setEmail("");
    } catch {
      setStatus({ ok: false, msg: "Transport error." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md border border-[#2a3547] bg-[#0e1218] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e2633] pb-3">
          <span className="font-mono text-[11px] font-bold tracking-wider text-slate-200 uppercase">
            GEOPULSE // ALERT DISPATCH & API
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {lang === "de"
            ? "Automatischer 07:00-UTC+1-Dispatch (Resend) sowie sofortige Telegram- & E-Mail-Benachrichtigungen bei Eskalationen oberhalb deiner Schwelle."
            : "Automated 07:00 CET executive dispatch (Resend) plus immediate Telegram & email triggers on threshold breaches."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 font-mono">
          <button
            type="button"
            onClick={() => setPlan("free-briefing")}
            className={`border p-3 text-left transition ${
              plan === "free-briefing" ? "border-slate-300 bg-[#161e2b]" : "border-[#1e2633] bg-[#0a0d12] hover:border-[#334155]"
            }`}
          >
            <div className="text-[10px] text-slate-400">DAILY DISPATCH</div>
            <div className="mt-1 text-base font-bold text-white">€0</div>
            <div className="mt-1 text-[10px] text-slate-500">07:00 Digest</div>
          </button>

          <button
            type="button"
            onClick={() => setPlan("pro-alerts")}
            className={`border p-3 text-left transition ${
              plan === "pro-alerts" ? "border-slate-300 bg-[#161e2b]" : "border-[#1e2633] bg-[#0a0d12] hover:border-[#334155]"
            }`}
          >
            <div className="text-[10px] text-emerald-400">INSTITUTIONAL PRO</div>
            <div className="mt-1 text-base font-bold text-white">€19/MO</div>
            <div className="mt-1 text-[10px] text-slate-400">Live Alerts · Telegram · API</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 font-mono">
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-slate-400">
              <span>SEVERITY TRIGGER THRESHOLD</span>
              <span className="font-bold text-slate-200">≥ {minSeverity} / 100</span>
            </div>
            <input
              type="range"
              min={50}
              max={90}
              step={5}
              value={minSeverity}
              onChange={(e) => setMinSeverity(Number(e.target.value))}
              className="w-full accent-slate-300"
            />
          </div>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="analyst@institution.com"
            className="w-full border border-[#232d3d] bg-[#0a0c10] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-slate-400 bg-slate-100 py-2 text-xs font-bold text-[#0a0c10] transition hover:bg-white disabled:opacity-50"
          >
            {submitting
              ? "PROCESSING…"
              : plan === "pro-alerts"
              ? "PROVISION PRO ALERTS (7-DAY TRIAL)"
              : "ACTIVATE 07:00 DISPATCH"}
          </button>
        </form>

        {status && (
          <div
            className={`mt-3 flex items-start gap-2 border px-3 py-2 font-mono text-[10.5px] ${
              status.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-300"
            }`}
          >
            {status.ok && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>{status.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
