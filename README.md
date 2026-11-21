# GeoPulse Terminal — AI-Native Geopolitical & Market Intelligence

Vollautomatisches Echtzeit-Geopolitik- & Makromarkt-Portal (Hybrid aus **3D-Globus / Live-Weltkarte** + **MacroSignal Markt-Impact** + **Pro-Alerts Monetarisierung**).

## Features (v2.0)
- **Interaktive 3D-Erdkugel & Taktische Weltkarte (`d3-geo` + `world-atlas` 110m):** Echte Ländergrenzen, drehbarer 3D-Globus (`geoOrthographic`), zoombare 2D-Karte (`geoNaturalEarth1`), 1-Klick-Regionen-Fokus & maritime Engpässe (Hormus, Rotes Meer, Taiwanstraße, Suez, Schwarzes Meer, Malakka).
- **24/7-Autopilot-Ingestion (`/api/cron/ingest` alle 15 Min.):** Zieht live **BBC World, Deutsche Welle, Al Jazeera, France 24, The Guardian** + **Yahoo Finance Live-Kurse** (`CL=F`, `GC=F`, `SMH`, `ITA`, `^GSPC`, `^GDAXI`, `EURUSD=X`, `BTC-USD`).
- **Monetarisierung & Alert-Automation:**
  - **Stripe Pro Checkout (`/api/checkout` + `/api/webhook/stripe`):** €19/Mo Pro-Abo inkl. 7-Tage-Test & Webhook-Signaturprüfung.
  - **Resend 07:00 Daily Briefing (`/api/cron/daily-briefing`):** Automatischer täglicher HTML-Briefing-Versand.
  - **Telegram Breaking-Alert Bot (`src/lib/alerts.ts`):** Sofort-Alerts bei neuen Ereignissen mit Severity ≥ 78/100.
- **Ask GeoPulse AI Analyst (`/api/ask`):** Funktioniert sofort ohne Key und schaltet automatisch auf **Gemini 2.0 Flash** oder **GPT-4o-mini** hoch.

## Lokal starten
```bash
npm install
npm run dev
# http://localhost:3000
```

## 1-Klick-Deployment auf Vercel
1. Repository auf Vercel importieren (`https://vercel.com/new` → `karlxroth/geopulse-terminal`).
2. Optional Environment-Variablen aus `.env.example` setzen (`STRIPE_*`, `RESEND_API_KEY`, `TELEGRAM_*`, `GEMINI_API_KEY`).
3. Deploy drücken — `vercel.json` aktiviert automatisch beide Cron-Jobs (`*/15 * * * *` Live-Ingestion + `0 6 * * *` Daily Briefing)!
