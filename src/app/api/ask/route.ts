import { NextRequest, NextResponse } from "next/server";
import { getLocalSettings } from "@/lib/db";
import { getIntelligenceSnapshot } from "@/lib/store";
import type { GeoEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildDeterministicAnswer(event: GeoEvent, question: string, lang: "de" | "en"): string {
  const q = question.toLowerCase();
  const topImpact = event.marketImpacts[0];
  const allTickers = event.marketImpacts.map((m) => `${m.sector} (${m.ticker}: ${m.direction.toUpperCase()})`).join(" • ");

  if (lang === "de") {
    if (/(etf|markt|aktie|trade|invest|geld|rohstoff|öl|gold|portfolio)/.test(q)) {
      return `Markt-Einschätzung zu „${event.countryOrZone}“ (Severity ${event.severity}/100):\n• Betroffene Sektoren: ${allTickers || "Gold (GC=F) & globale Indizes"}\n• Primär-Signal: ${topImpact ? `${topImpact.sector} (${topImpact.ticker}) → ${topImpact.direction.toUpperCase()} (${topImpact.confidence}% Konfidenz). ${topImpact.rationaleDe}` : "Defensiv-Hedge über Gold & Energie beobachten."}\n• Hinweis: Keine Anlageberatung — datengestützte Makro-Korrelation auf Basis von ${event.sources.length} Quelle(n).`;
    }
    if (/(eskal|krieg|risiko|gefahr|nächst|passiert|prognose|szenario)/.test(q)) {
      return `Eskalations-Analyse (${event.severity}/100 · Konfidenz ${event.confidenceScore}%):\n• Lage: ${event.whyItMattersDe}\n• 72h-Watchpoint: ${event.watchpoint72hDe}\n• Basis-Szenario (60%): Kontrollierte diplomatische & sanktionsbezogene Gegenreaktionen ohne direkte Großeskalation.\n• Risiko-Szenario (25%): Ausweitung auf ${event.chokepoint ?? "benachbarte Handels- & Energiekorridore"} mit abruptem Volatilitätsschub.`;
    }
    return `GeoPulse AI Kurz-Dossier (${event.region} · ${event.category}):\n• Kernfakten: ${event.summaryDe}\n• Strategische Bedeutung: ${event.whyItMattersDe}\n• Markt-Hebel: ${allTickers || "Global Risk Sentiment"}\n• Quellenlage: Verifiziert über ${event.sources.map((s) => s.sourceName).join(", ")}.`;
  }

  if (/(etf|market|stock|trade|oil|gold|portfolio|ticker)/.test(q)) {
    return `Market Impact Brief for ${event.countryOrZone} (Severity ${event.severity}/100):\n• Exposed Sectors: ${allTickers || "Safe Havens (GC=F)"}\n• Primary Signal: ${topImpact ? `${topImpact.sector} (${topImpact.ticker}) → ${topImpact.direction.toUpperCase()} (${topImpact.confidence}% confidence). ${topImpact.rationaleEn}` : "Watch defensive hedges."}\n• Note: Informational macro-signal synthesis across ${event.sources.length} source(s), not financial advice.`;
  }
  return `GeoPulse AI Analyst Brief (${event.region} · ${event.category}):\n• Situation: ${event.summaryEn}\n• Strategic Impact: ${event.whyItMattersEn}\n• 72h Watchpoint: ${event.watchpoint72hEn}\n• Market Exposure: ${allTickers || "Global Equities & Gold"}.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { eventId?: string; question?: string; lang?: "de" | "en" };
    const question = (body.question ?? "").trim();
    const lang: "de" | "en" = body.lang === "en" ? "en" : "de";

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const snapshot = await getIntelligenceSnapshot(false);
    const event = snapshot.events.find((e) => e.id === body.eventId) ?? snapshot.events[0];
    if (!event) {
      return NextResponse.json({ error: "No intelligence events available" }, { status: 404 });
    }

    const localSettings = getLocalSettings();
    const ollamaUrl = (localSettings.ollamaUrl || process.env.OLLAMA_URL || "").trim();
    const ollamaModel = (localSettings.ollamaModel || process.env.OLLAMA_MODEL || "llama3.2").trim();
    const geminiKey = (localSettings.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
    const openaiKey = (localSettings.openaiApiKey || process.env.OPENAI_API_KEY || "").trim();

    const sysPrompt = `You are GeoPulse Ontology Analyst, a crisp institutional geopolitical & financial intelligence engine.
Respond in ${lang === "de" ? "German" : "English"} in max 4 dense bullet points. No fluff.
Event: [${event.code}] ${event.headline}
Region: ${event.region} (${event.countryOrZone}), Severity: ${event.severity}/100, Category: ${event.category}
Entities: ${event.entityNames.join(", ") || "N/A"}
Sources (${event.sources.length}): ${event.sources.map((s) => `${s.sourceName} (${s.perspective})`).join(", ")}
Market Impacts: ${event.marketImpacts.map((m) => `${m.sector} [${m.ticker}] ${m.direction}`).join("; ")}`;

    // 1. Local Ollama (100% private on Mac!)
    if (ollamaUrl) {
      try {
        const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: `${sysPrompt}\n\nQuery: ${question}`,
            stream: false,
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.response) return NextResponse.json({ answer: json.response, mode: `ollama:${ollamaModel}` });
        }
      } catch {
        // Fall through
      }
    }

    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${sysPrompt}\n\nUser Question: ${question}` }] }],
              generationConfig: { temperature: 0.3 },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );
        if (res.ok) {
          const json = await res.json();
          const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) return NextResponse.json({ answer, mode: "llm-enhanced" });
        }
      } catch {
        // Fallback below
      }
    } else if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: question },
            ],
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const json = await res.json();
          const answer = json?.choices?.[0]?.message?.content;
          if (answer) return NextResponse.json({ answer, mode: "llm-enhanced" });
        }
      } catch {
        // Fallback below
      }
    }

    return NextResponse.json({
      answer: buildDeterministicAnswer(event, question, lang),
      mode: "ai-engine",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
