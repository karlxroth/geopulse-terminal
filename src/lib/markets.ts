import type { MarketQuote } from "./types";

interface WatchSymbol {
  symbol: string;
  label: string;
  category: MarketQuote["category"];
  currency: string;
  geoDriver: string;
  fallbackPrice: number;
  fallbackChange: number;
}

const WATCHLIST: WatchSymbol[] = [
  { symbol: "BZ=F", label: "Brent Crude", category: "Energy", currency: "$", geoDriver: "Hormuz / OPEC+", fallbackPrice: 78.4, fallbackChange: 1.35 },
  { symbol: "CL=F", label: "WTI Crude", category: "Energy", currency: "$", geoDriver: "US / Middle East", fallbackPrice: 74.82, fallbackChange: 1.42 },
  { symbol: "NG=F", label: "Natural Gas", category: "Energy", currency: "$", geoDriver: "EU / LNG Supply", fallbackPrice: 3.12, fallbackChange: 1.9 },
  { symbol: "GC=F", label: "Gold Spot", category: "Safe Haven", currency: "$", geoDriver: "Sovereign Risk", fallbackPrice: 2714.5, fallbackChange: 0.86 },
  { symbol: "SMH", label: "Semis ETF", category: "Tech", currency: "$", geoDriver: "Taiwan / Controls", fallbackPrice: 248.4, fallbackChange: -0.64 },
  { symbol: "ITA", label: "Defense ETF", category: "Defense", currency: "$", geoDriver: "NATO / Budgets", fallbackPrice: 156.9, fallbackChange: 1.18 },
  { symbol: "^GSPC", label: "S&P 500", category: "Equity", currency: "", geoDriver: "US Macro / Tariffs", fallbackPrice: 5985.2, fallbackChange: 0.24 },
  { symbol: "^GDAXI", label: "DAX 40", category: "Equity", currency: "", geoDriver: "EU Industry / FX", fallbackPrice: 19412.6, fallbackChange: -0.31 },
  { symbol: "EURUSD=X", label: "EUR / USD", category: "FX", currency: "", geoDriver: "Rate Spread", fallbackPrice: 1.0742, fallbackChange: -0.18 },
  { symbol: "BTC-USD", label: "Bitcoin", category: "Crypto", currency: "$", geoDriver: "Global Liquidity", fallbackPrice: 91450.0, fallbackChange: 2.14 },
];

async function fetchYahooQuote(item: WatchSymbol): Promise<MarketQuote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?range=2d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 GeoPulseOntology/3.0" },
      signal: AbortSignal.timeout(4500),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);

    if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price");
    const changePercent = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : 0;

    return {
      symbol: item.symbol,
      label: item.label,
      category: item.category,
      price: Number(price.toFixed(item.symbol === "EURUSD=X" ? 4 : 2)),
      changePercent: Number(changePercent.toFixed(2)),
      currency: item.currency,
      geoDriver: item.geoDriver,
      isLive: true,
    };
  } catch {
    return {
      symbol: item.symbol,
      label: item.label,
      category: item.category,
      price: item.fallbackPrice,
      changePercent: item.fallbackChange,
      currency: item.currency,
      geoDriver: item.geoDriver,
      isLive: false,
    };
  }
}

export async function fetchLiveMarkets(): Promise<MarketQuote[]> {
  return Promise.all(WATCHLIST.map(fetchYahooQuote));
}
