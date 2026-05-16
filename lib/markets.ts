import type { TickerItem } from "@/components/layout/Ticker";
import { fetchWithBrowserHeaders, getLastGood, setLastGood } from "./fetch";

interface TickerConfig {
  symbol: string;
  label: string;
  yahooSymbol: string;
}

const TICKER_CONFIG: TickerConfig[] = [
  { symbol: "JSE", label: "JSE All Share", yahooSymbol: "J203.JO" },
  { symbol: "USDZAR", label: "USD/ZAR", yahooSymbol: "ZAR=X" },
  { symbol: "SPX", label: "S&P 500", yahooSymbol: "^GSPC" },
  { symbol: "BTC", label: "Bitcoin", yahooSymbol: "BTC-USD" },
];

// Fallback data in case all APIs fail
const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "JSE", label: "JSE All Share", value: "85,421.30", change: 0.45, changePercent: "+0.45%" },
  { symbol: "USDZAR", label: "USD/ZAR", value: "17.8432", change: -0.12, changePercent: "-0.12%" },
  { symbol: "SPX", label: "S&P 500", value: "5,831.20", change: 0.78, changePercent: "+0.78%" },
  { symbol: "BTC", label: "Bitcoin", value: "$99,840", change: 1.23, changePercent: "+1.23%" },
];

function formatPrice(price: number, symbol: string): string {
  if (symbol === "BTC") {
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (symbol === "USDZAR") {
    return price.toFixed(4);
  }
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

// ─── TYPES ─────────────────────────────────────────────────────
export type StockQuote = {
  symbol: string;       // raw Yahoo symbol, e.g. "OUT.JO" or "^GSPC"
  display: string;      // strip Yahoo decorators for UI: "OUT", "GSPC"
  price: number;
  changePct: number;
};

const SP500_TICKERS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "JPM", "V",
  "MA", "JNJ", "WMT", "PG", "UNH", "HD", "BAC", "ABBV", "KO", "XOM", "AVGO", "LLY", "CVX", "COST"
];

// BHP delisted from the JSE in 2022 (consolidated to single ASX listing).
// AMS (Anglo American Platinum) replaces it — same materials sector.
const JSE_TICKERS = [
  "OUT.JO", "WBC.JO", "CPI.JO", "SHP.JO", "NPN.JO", "PRX.JO", "SBK.JO", "FSR.JO",
  "ABG.JO", "NED.JO", "MTN.JO", "VOD.JO", "AGL.JO", "AMS.JO", "SOL.JO", "DSY.JO",
  "SLM.JO", "OML.JO", "BVT.JO", "BID.JO", "MRP.JO", "WHL.JO", "CLS.JO", "APN.JO"
];

// ─── PUBLIC ────────────────────────────────────────────────────

/**
 * Fetch market data from Yahoo Finance.
 * Abstract layer — source can be swapped by modifying this file.
 */
export async function getMarketData(): Promise<TickerItem[]> {
  try {
    const results = await Promise.allSettled(
      TICKER_CONFIG.map((config) => fetchSingleTicker(config))
    );

    const tickers: TickerItem[] = [];
    let anySuccess = false;

    for (let i = 0; i < TICKER_CONFIG.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled" && result.value) {
        tickers.push(result.value);
        anySuccess = true;
      } else {
        // Use fallback for this ticker
        tickers.push(FALLBACK_TICKERS[i]);
      }
    }

    // If no API call succeeded at all, return static fallback
    if (!anySuccess) {
      console.warn("[fetch-failure] All top ticker API calls failed, using fallback data");
      return FALLBACK_TICKERS;
    }

    return tickers;
  } catch (error) {
    console.error("[markets] Failed to fetch market data:", error);
    return FALLBACK_TICKERS;
  }
}

// ─── INTERNAL ──────────────────────────────────────────────────
type ChartResponse = {
  chart: {
    result?: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        chartPreviousClose?: number;
        previousClose?: number;
      };
    }>;
    error?: { code: string; description: string } | null;
  };
};

async function fetchYahooChart(symbol: string): Promise<StockQuote | null> {
  try {
    const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const response = await fetchWithBrowserHeaders(url, { revalidate: 60 });

  if (!response.ok) {
    console.warn(
      `[fetch-failure] markets v8/chart for ${symbol} returned ${response.status}`
    );
    return getLastGood<StockQuote>(symbol) ?? null;
  }

  const data = (await response.json()) as ChartResponse;
  const meta = data.chart.result?.[0]?.meta;
  if (!meta) return getLastGood<StockQuote>(symbol) ?? null;

  const price = meta.regularMarketPrice;
  if (price == null) return getLastGood<StockQuote>(symbol) ?? null;

  const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const changePct = prev > 0 ? ((price - prev) / prev) * 100 : 0;

  // USDZAR sanity check
  if (symbol === "ZAR=X" && (price < 10 || price > 25)) {
    console.warn(`[markets] USDZAR price sanity check failed: ${price}`);
  }

  const quote = {
    symbol,
    display: symbol.replace(/\.JO$/, "").replace(/=X$/, "").replace(/^\^/, ""),
    price,
    changePct,
  };

  setLastGood(symbol, quote);
  return quote;
} catch (error) {
  console.warn(`[fetch-failure] Failed to fetch ${symbol}:`, error);
  return getLastGood<StockQuote>(symbol) ?? null;
}
}

// ─── PUBLIC ────────────────────────────────────────────────────

/**
 * Fetch a single ticker and format it for the top ticker bar.
 */
async function fetchSingleTicker(config: TickerConfig): Promise<TickerItem | null> {
  try {
    let quote: StockQuote | null = null;

    if (config.symbol === "JSE") {
      quote = await fetchJseAllShare();
    } else {
      quote = await fetchYahooChart(config.yahooSymbol);
    }

    if (!quote) return null;

    return {
      symbol: config.symbol,
      label: config.label,
      value: formatPrice(quote.price, config.symbol),
      change: quote.changePct,
      changePercent: formatChangePercent(quote.changePct),
    };
  } catch (error) {
    console.warn(`[fetch-failure] Failed to fetch ${config.symbol}:`, error);
    return null;
  }
}

const JSE_ALL_SHARE_CANDIDATES = ["^J203.JO", "J203.JO", "^JTOPI", "JSE.JO"];

async function fetchJseAllShare(): Promise<StockQuote | null> {
  for (const candidate of JSE_ALL_SHARE_CANDIDATES) {
    const quote = await fetchYahooChart(candidate);
    if (quote) {
      console.info(`[markets] JSE All Share resolved via ${candidate}`);
      return { ...quote, display: "JSE All Share" };
    }
  }
  return null;
}

/**
 * Batched fetcher used by the stock bands.
 */
export async function fetchQuotesBatched(symbols: string[]): Promise<StockQuote[]> {
  const settled = await Promise.allSettled(symbols.map(fetchYahooChart));
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<StockQuote> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

export async function getSpQuotes(): Promise<StockQuote[]> {
  return fetchQuotesBatched(SP500_TICKERS);
}

export async function getJseQuotes(): Promise<StockQuote[]> {
  const quotes = await fetchQuotesBatched(JSE_TICKERS);
  // Ensure OUT.JO is first, fallback if API rearranges
  const outIndex = quotes.findIndex((q) => q.symbol === "OUT.JO");
  if (outIndex > 0) {
    const out = quotes.splice(outIndex, 1)[0];
    quotes.unshift(out);
  }
  return quotes;
}
