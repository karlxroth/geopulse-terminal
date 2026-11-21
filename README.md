# GeoPulse Terminal — AI-Native Geopolitical & Market Intelligence

Vollautomatisches Echtzeit-Geopolitik- & Makromarkt-Portal (Hybrid aus **GeoPulse Live-Weltkarte** + **MacroSignal Markt-Impact**).

## Features
- **100 % vollautomatische Live-Ingestion:** Zieht alle 15 Min. offene Welt-Feeds (**BBC World, Deutsche Welle, Al Jazeera, France 24, The Guardian**) + **Yahoo Finance Live-Marktdaten** (WTI Öl `CL=F`, Gold `GC=F`, Semiconductors `SMH`, Defense `ITA`, S&P 500, DAX, EUR/USD, BTC).
- **AI Intelligence Engine:** Automatisches Multi-Source-Clustering (Deduplizierung), Geo-Mapping auf Weltkarte & maritime Engpässe (Hormus, Rotes Meer, Taiwanstraße, Suez, Schwarzes Meer), Escalation-Severity-Score (1–100) & Markt-/ETF-Impact-Signale.
- **Ask GeoPulse AI Analyst:** Interaktiver Analysten-Chat pro Ereignis (funktioniert sofort **ohne API-Key** und schaltet automatisch auf Gemini 2.0 Flash / GPT-4o-mini hoch, sobald `GEMINI_API_KEY` oder `OPENAI_API_KEY` in `.env.local` gesetzt ist).
- **Monetarisierungs-Layer:** Eingebautes Pro-Alerts- & Daily-Briefing-Abo-Modal (`/api/subscribe`) + Vercel-Cron-Konfiguration (`vercel.json`).

## Schnellstart
```bash
npm install
npm run dev
# Öffne http://localhost:3000
```
