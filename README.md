# GeoPulse // Local Geopolitical Ontology Workstation

Lokale, eigenständige Geopolitik- & Makromarkt-Software für macOS (`localhost:3000`) mit eingebauter SQLite-Datenbank, 20+ Live-Quellen, Palantir-artiger Objekt-Ontologie und lokalem Ollama-Support. Kein SaaS, keine Paywalls, 100 % lokal.

## Funktionen
- **20 eingebaute Live-Quellen + eigene RSS/Atom-Feeds:** Financial Times, NYT, BBC, Guardian, NPR, Tagesschau Ausland, DW, France 24, Euronews, Al Jazeera, Kyiv Independent, Times of Israel, The Diplomat, UN ReliefWeb, USNI News (Naval), War on the Rocks, Bellingcat OSINT, OilPrice, BleepingComputer Cyber & **GDELT 2.0 Global Stream API**.
- **Lokale SQLite-Datenbank (`.geopulse-data/geopulse.sqlite`):** Speichert dauerhaft jedes Ereignis-Archiv, die historische Risk-Index-Zeitreihe, deine persönlichen **Analyst Notes**, **Pinned Bookmarks**, eigene **RSS-Feeds** und eigene **Yahoo-Finance-Ticker**.
- **4 Analyse-Ansichten:** `[01] ONTOLOGY` (Kausal-Graph), `[02] GEOSPATIAL` (Natural Earth 110m + Ortho-3D-Globus), `[03] MATRIX` (Signaltabelle), `[04] SQLITE ARCHIVE` (historischer Trend & Volltextsuche).
- **Volltext-Extraktor & Dossier-Export:** Original-Artikel direkt im Inspector lesen (`READ`) und komplette Case-Dossiers als `.md` exportieren.
- **Lokale KI:** Unterstützt direkt **lokales Ollama** (`http://localhost:11434`) oder optional eigene API-Keys über `CONFIG`.

## Starten
Doppelklick auf `start-geopulse.command` oder im Terminal:
```bash
npm run build && npm run start
# http://localhost:3000
```
