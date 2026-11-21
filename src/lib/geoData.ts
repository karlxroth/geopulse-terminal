import type { CategoryKey, MarketImpact, RegionKey } from "./types";

export interface GeoAnchor {
  keywords: string[];
  name: string;
  region: RegionKey;
  lat: number;
  lng: number;
  chokepoint?: string;
  defaultImpacts: MarketImpact[];
}

export interface MaritimeChokepoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  flowLabel: string;
  baseRisk: "LOW" | "ELEVATED" | "HIGH";
}

export const MARITIME_CHOKEPOINTS: MaritimeChokepoint[] = [
  { id: "hormuz", name: "Strait of Hormuz", lat: 26.56, lng: 56.25, flowLabel: "~21% Global Oil", baseRisk: "HIGH" },
  { id: "bab-el-mandeb", name: "Bab el-Mandeb / Red Sea", lat: 12.6, lng: 43.3, flowLabel: "~12% Global Trade", baseRisk: "HIGH" },
  { id: "taiwan", name: "Taiwan Strait", lat: 24.0, lng: 119.5, flowLabel: "~90% Leading-Edge Chips", baseRisk: "ELEVATED" },
  { id: "suez", name: "Suez Canal", lat: 30.58, lng: 32.27, flowLabel: "Europe–Asia Corridor", baseRisk: "ELEVATED" },
  { id: "malacca", name: "Strait of Malacca", lat: 2.5, lng: 101.2, flowLabel: "~30% Seaborne Trade", baseRisk: "LOW" },
  { id: "black-sea", name: "Black Sea Grain Route", lat: 43.4, lng: 34.2, flowLabel: "Grain & Energy", baseRisk: "HIGH" },
];

export const GEO_ANCHORS: GeoAnchor[] = [
  {
    keywords: ["ukraine", "kyiv", "kiev", "donbas", "crimea", "zelensky", "kharkiv", "odesa"],
    name: "Ukraine / Black Sea",
    region: "Europe",
    lat: 49.0,
    lng: 32.0,
    chokepoint: "Black Sea Grain Route",
    defaultImpacts: [
      { sector: "European Defense", ticker: "ITA / RHM", direction: "bullish", rationaleDe: "Anhaltende Nachfrage nach Luftabwehr & Munition.", rationaleEn: "Sustained demand for air defense & munitions.", confidence: 86 },
      { sector: "Natural Gas / Grain", ticker: "TTF / WEAT", direction: "volatile", rationaleDe: "Risiko für Energie- & Schwarzmeer-Exportkorridore.", rationaleEn: "Risk to European energy & Black Sea export corridors.", confidence: 79 },
    ],
  },
  {
    keywords: ["russia", "moscow", "kremlin", "putin", "siberia", "wagner", "gazprom"],
    name: "Russia",
    region: "Europe",
    lat: 55.75,
    lng: 37.62,
    defaultImpacts: [
      { sector: "Crude Oil & LNG", ticker: "CL=F", direction: "bullish", rationaleDe: "Sanktionsdruck auf russische Schattenflotte verknappt Angebot.", rationaleEn: "Sanctions pressure on shadow fleet tightens global supply.", confidence: 81 },
      { sector: "Defense & Aerospace", ticker: "ITA", direction: "bullish", rationaleDe: "NATO-Aufrüstungsbudgets bleiben strukturell erhöht.", rationaleEn: "NATO defense procurement stays structurally elevated.", confidence: 84 },
    ],
  },
  {
    keywords: ["israel", "gaza", "hamas", "idf", "tel aviv", "jerusalem", "west bank", "netanyahu", "lebanon", "hezbollah", "beirut"],
    name: "Levant / Israel–Lebanon",
    region: "Middle East",
    lat: 32.1,
    lng: 35.1,
    chokepoint: "Eastern Mediterranean",
    defaultImpacts: [
      { sector: "Gold Safe Haven", ticker: "GC=F", direction: "bullish", rationaleDe: "Kapitalflucht in sichere Häfen bei Eskalation im Nahen Osten.", rationaleEn: "Safe-haven flows into bullion on Middle East escalation.", confidence: 82 },
      { sector: "Crude Oil", ticker: "CL=F", direction: "bullish", rationaleDe: "Geopolitische Risikoprämie auf regionale Energieinfrastruktur.", rationaleEn: "Geopolitical risk premium on regional energy infrastructure.", confidence: 78 },
    ],
  },
  {
    keywords: ["iran", "tehran", "hormuz", "irgc", "persian gulf", "nuclear deal"],
    name: "Iran / Strait of Hormuz",
    region: "Middle East",
    lat: 32.4,
    lng: 53.6,
    chokepoint: "Strait of Hormuz",
    defaultImpacts: [
      { sector: "Crude Oil", ticker: "CL=F", direction: "bullish", rationaleDe: "21 % des weltweiten Ölhandels passieren die Straße von Hormus.", rationaleEn: "21% of global oil trade transits the Strait of Hormuz.", confidence: 91 },
      { sector: "Tanker & Shipping", ticker: "FRO / ZIM", direction: "bullish", rationaleDe: "Höhere Versicherungsprämien & Umroutungen treiben Frachtraten.", rationaleEn: "Higher war-risk insurance & rerouting lift freight rates.", confidence: 83 },
    ],
  },
  {
    keywords: ["yemen", "houthi", "red sea", "aden", "suez", "shipping attack"],
    name: "Red Sea / Yemen",
    region: "Middle East",
    lat: 15.4,
    lng: 44.2,
    chokepoint: "Bab el-Mandeb / Red Sea",
    defaultImpacts: [
      { sector: "Container Shipping", ticker: "ZIM / MAERSK", direction: "bullish", rationaleDe: "Umfahrung über das Kap der Guten Hoffnung verlängert Lieferketten.", rationaleEn: "Rerouting around Cape of Good Hope extends transit times.", confidence: 88 },
      { sector: "Crude Oil", ticker: "CL=F", direction: "bullish", rationaleDe: "Risikoprämie für Tanker im Roten Meer.", rationaleEn: "Tanker risk premium across Red Sea lanes.", confidence: 79 },
    ],
  },
  {
    keywords: ["syria", "damascus", "iraq", "baghdad", "saudi", "riyadh", "opec", "uae", "qatar"],
    name: "Gulf & Arabian Peninsula",
    region: "Middle East",
    lat: 24.7,
    lng: 46.7,
    chokepoint: "Strait of Hormuz",
    defaultImpacts: [
      { sector: "Energy / OPEC+", ticker: "CL=F", direction: "volatile", rationaleDe: "Förderquoten & Golf-Stabilität bestimmen Öl-Gleichgewicht.", rationaleEn: "Production quotas & Gulf stability drive crude balance.", confidence: 84 },
    ],
  },
  {
    keywords: ["taiwan", "taipei", "tsmc", "taiwan strait"],
    name: "Taiwan Strait",
    region: "Indo-Pacific",
    lat: 23.7,
    lng: 121.0,
    chokepoint: "Taiwan Strait",
    defaultImpacts: [
      { sector: "Semiconductors", ticker: "SMH / TSM", direction: "bearish", rationaleDe: "Kritische Abhängigkeit bei Sub-5nm-KI-Chips in Taiwan.", rationaleEn: "Critical reliance on Taiwan for sub-5nm AI chips.", confidence: 93 },
      { sector: "Defense & Gold", ticker: "ITA / GC=F", direction: "bullish", rationaleDe: "Risikoabsicherung bei Indo-Pazifik-Spannungen.", rationaleEn: "Risk hedging on Indo-Pacific flashpoint activity.", confidence: 85 },
    ],
  },
  {
    keywords: ["china", "beijing", "xi jinping", "south china sea", "philippines", "manila", "hong kong", "tariff", "huawei", "chip export"],
    name: "China / South China Sea",
    region: "Indo-Pacific",
    lat: 35.8,
    lng: 114.2,
    chokepoint: "Strait of Malacca",
    defaultImpacts: [
      { sector: "Semiconductors & Tech", ticker: "SMH", direction: "volatile", rationaleDe: "Exportkontrollen & Zölle treffen globale Lieferketten.", rationaleEn: "Export controls & tariffs hit global tech supply chains.", confidence: 87 },
      { sector: "Industrial Metals", ticker: "COPX", direction: "volatile", rationaleDe: "Chinas Konjunktur- & Handelspolitik steuert Metallnachfrage.", rationaleEn: "China stimulus & trade policy steers industrial metals.", confidence: 76 },
    ],
  },
  {
    keywords: ["north korea", "pyongyang", "kim jong", "south korea", "seoul", "japan", "tokyo", "missile"],
    name: "Korean Peninsula & Japan",
    region: "Indo-Pacific",
    lat: 37.5,
    lng: 127.0,
    defaultImpacts: [
      { sector: "Asia-Pacific Defense", ticker: "ITA", direction: "bullish", rationaleDe: "Raketentests erhöhen Ausgaben für Raketenabwehr in Ostasien.", rationaleEn: "Missile tests boost East Asian missile-defense spending.", confidence: 80 },
    ],
  },
  {
    keywords: ["india", "new delhi", "modi", "pakistan", "islamabad", "kashmir", "myanmar", "indonesia"],
    name: "South & Southeast Asia",
    region: "Indo-Pacific",
    lat: 28.6,
    lng: 77.2,
    defaultImpacts: [
      { sector: "Emerging Markets", ticker: "EEM / INDA", direction: "volatile", rationaleDe: "Regionalpolitik beeinflusst Supply-Chain-Diversifizierung.", rationaleEn: "Regional stability shapes supply-chain diversification.", confidence: 72 },
    ],
  },
  {
    keywords: ["eu", "european union", "brussels", "germany", "berlin", "france", "paris", "uk", "britain", "london", "nato", "poland", "balkans", "italy"],
    name: "European Union / NATO",
    region: "Europe",
    lat: 50.85,
    lng: 4.35,
    defaultImpacts: [
      { sector: "European Equities", ticker: "^GDAXI", direction: "volatile", rationaleDe: "EU-Fiskal-, Zoll- & Sicherheitspolitik bewegt DAX & Euro.", rationaleEn: "EU fiscal, trade & security shifts move DAX and Euro.", confidence: 77 },
      { sector: "EUR / USD", ticker: "EURUSD=X", direction: "volatile", rationaleDe: "Zins- und Wachstumserwartungen der Eurozone reagieren direkt.", rationaleEn: "Eurozone rate and growth expectations react directly.", confidence: 74 },
    ],
  },
  {
    keywords: ["trump", "white house", "washington", "pentagon", "u.s.", "us ", "united states", "congress", "fed ", "federal reserve", "sanctions", "canada", "mexico", "panama", "venezuela", "brazil"],
    name: "United States / Americas",
    region: "Americas",
    lat: 38.9,
    lng: -77.0,
    defaultImpacts: [
      { sector: "US Equities & Dollar", ticker: "^GSPC", direction: "volatile", rationaleDe: "US-Außen-, Zoll- & Sanktionspolitik setzt globalen Takt.", rationaleEn: "US foreign, tariff & sanctions policy sets global tone.", confidence: 82 },
      { sector: "Safe Haven / Gold", ticker: "GC=F", direction: "bullish", rationaleDe: "Handelskonflikte stärken Absicherung in Gold & Treasuries.", rationaleEn: "Trade friction strengthens hedges in gold & Treasuries.", confidence: 75 },
    ],
  },
  {
    keywords: ["sudan", "congo", "drc", "sahel", "niger", "mali", "ethiopia", "somalia", "nigeria", "south africa", "libya", "egypt", "africa"],
    name: "Africa / Sahel & Horn",
    region: "Africa",
    lat: 9.1,
    lng: 22.5,
    defaultImpacts: [
      { sector: "Critical Minerals & Energy", ticker: "GC=F / COPX", direction: "bullish", rationaleDe: "Risiken für Kobalt-, Kupfer-, Gold- & Rohölförderung.", rationaleEn: "Supply risks to cobalt, copper, gold & crude extraction.", confidence: 74 },
    ],
  },
];

export const CATEGORY_RULES: { category: CategoryKey; keywords: string[] }[] = [
  {
    category: "Conflict & Security",
    keywords: ["strike", "missile", "attack", "war", "military", "troops", "airstrike", "drone", "ceasefire", "killed", "clash", "navy", "artillery", "offensive", "army", "nato", "defense", "defence", "nuclear"],
  },
  {
    category: "Energy & Chokepoints",
    keywords: ["oil", "gas", "opec", "pipeline", "tanker", "hormuz", "red sea", "suez", "lng", "shipping", "energy", "refinery", "brent", "crude"],
  },
  {
    category: "Sanctions & Trade",
    keywords: ["tariff", "sanction", "trade war", "export", "import", "embargo", "customs", "economy", "inflation", "central bank", "imf", "debt", "currency"],
  },
  {
    category: "Cyber & Tech",
    keywords: ["cyber", "hack", "ai ", "chip", "semiconductor", "satellite", "espionage", "submarine cable", "quantum", "tiktok", "huawei"],
  },
  {
    category: "Elections & Policy",
    keywords: ["election", "vote", "parliament", "president", "prime minister", "coalition", "protest", "coup", "referendum", "government", "minister"],
  },
  {
    category: "Diplomacy",
    keywords: ["summit", "talks", "treaty", "diplomat", "un ", "united nations", "ambassador", "agreement", "alliance", "negotiation", "peace"],
  },
];
