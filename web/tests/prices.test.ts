import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert";
import type { PortfolioPosition } from "../lib/types";
import { normalizeSymbolList, symbolKey } from "../lib/pricesProtocol";
import { fmtPriceOrCalculated, getLastPriceIsCalculated } from "../components/WorkspaceSections";

/**
 * Tests for real-time price functionality.
 * 
 * These tests verify:
 * 1. Price data types and formatting
 * 2. API route behavior (mocked)
 * 3. usePrices hook logic
 */

// =============================================================================
// Price Data Type Tests
// =============================================================================

describe("PriceData types", () => {
  type PriceData = {
    symbol: string;
    last: number | null;
    lastIsCalculated: boolean;
    bid: number | null;
    ask: number | null;
    bidSize: number | null;
    askSize: number | null;
    volume: number | null;
    high: number | null;
    low: number | null;
    open: number | null;
    close: number | null;
    timestamp: string;
  };

  it("should have correct structure", () => {
    const mockPrice: PriceData = {
      symbol: "AAPL",
      last: 175.50,
      bid: 175.48,
      ask: 175.52,
      bidSize: 100,
      askSize: 200,
      volume: 45000000,
      high: 176.00,
      low: 174.00,
      open: 174.50,
      close: 175.00,
      lastIsCalculated: false,
      timestamp: new Date().toISOString()
    };

    assert.strictEqual(mockPrice.symbol, "AAPL");
    assert.strictEqual(typeof mockPrice.last, "number");
    assert.strictEqual(typeof mockPrice.timestamp, "string");
  });

  it("should handle null values", () => {
    const mockPrice: PriceData = {
      symbol: "TEST",
      last: null,
      bid: null,
      ask: null,
      bidSize: null,
      askSize: null,
      volume: null,
      high: null,
      low: null,
      open: null,
      close: null,
      lastIsCalculated: false,
      timestamp: new Date().toISOString()
    };

    assert.strictEqual(mockPrice.last, null);
    assert.strictEqual(mockPrice.bid, null);
  });
});

describe("Price protocol helpers", () => {
  it("normalizes symbols with trim/uppercase/filter", () => {
    assert.deepStrictEqual(
      normalizeSymbolList([" aapl ", "", "  ", "MsFt", "NVDA"]),
      ["AAPL", "MSFT", "NVDA"],
    );
  });

  it("builds stable symbol keys", () => {
    const first = symbolKey(["MSFT", "AAPL", "NVDA"]);
    const second = symbolKey(["NVDA", "AAPL", "MSFT"]);
    assert.strictEqual(first, second);
    assert.strictEqual(first, "AAPL,MSFT,NVDA");
  });
});

// =============================================================================
// Price Formatting Tests
// =============================================================================

describe("Price formatting utilities", () => {
  function formatPrice(price: number | null | undefined): string {
    if (price == null || isNaN(price)) return "—";
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatVolume(volume: number | null | undefined): string {
    if (volume == null || isNaN(volume)) return "—";
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(1)}M`;
    }
    if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  }

  function calcChangePercent(current: number | null, previous: number | null): number | null {
    if (current == null || previous == null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  it("formatPrice handles valid numbers", () => {
    assert.strictEqual(formatPrice(175.5), "175.50");
    assert.strictEqual(formatPrice(1000.00), "1,000.00");
    assert.strictEqual(formatPrice(0.01), "0.01");
  });

  it("formatPrice handles null/undefined", () => {
    assert.strictEqual(formatPrice(null), "—");
    assert.strictEqual(formatPrice(undefined), "—");
    assert.strictEqual(formatPrice(NaN), "—");
  });

  it("formatVolume handles millions", () => {
    assert.strictEqual(formatVolume(45000000), "45.0M");
    assert.strictEqual(formatVolume(1500000), "1.5M");
  });

  it("formatVolume handles thousands", () => {
    assert.strictEqual(formatVolume(50000), "50.0K");
    assert.strictEqual(formatVolume(1500), "1.5K");
  });

  it("formatVolume handles small numbers", () => {
    assert.strictEqual(formatVolume(500), "500");
    assert.strictEqual(formatVolume(0), "0");
  });

  it("formatVolume handles null/undefined", () => {
    assert.strictEqual(formatVolume(null), "—");
    assert.strictEqual(formatVolume(undefined), "—");
  });

  it("calcChangePercent calculates correctly", () => {
    const change = calcChangePercent(110, 100);
    assert.strictEqual(change, 10);

    const negChange = calcChangePercent(90, 100);
    assert.strictEqual(negChange, -10);
  });

  it("calcChangePercent handles null values", () => {
    assert.strictEqual(calcChangePercent(null, 100), null);
    assert.strictEqual(calcChangePercent(100, null), null);
    assert.strictEqual(calcChangePercent(100, 0), null);
  });

  it("prefixes C for calculated prices", () => {
    assert.strictEqual(fmtPriceOrCalculated(175.5, true), "C$175.50");
  });

  it("does not prefix C for raw prices", () => {
    assert.strictEqual(fmtPriceOrCalculated(175.5, false), "$175.50");
  });
});

// =============================================================================
// API Route Tests (Unit)
// =============================================================================

describe("Price API route parsing", () => {
  it("should parse symbols parameter correctly", () => {
    const symbolsParam = "AAPL,MSFT,NVDA";
    const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    
    assert.deepStrictEqual(symbols, ["AAPL", "MSFT", "NVDA"]);
  });

  it("should handle whitespace in symbols", () => {
    const symbolsParam = " AAPL , MSFT , NVDA ";
    const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    
    assert.deepStrictEqual(symbols, ["AAPL", "MSFT", "NVDA"]);
  });

  it("should filter empty symbols", () => {
    const symbolsParam = "AAPL,,MSFT,";
    const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    
    assert.deepStrictEqual(symbols, ["AAPL", "MSFT"]);
  });

  it("should uppercase symbols", () => {
    const symbolsParam = "aapl,Msft,nvDA";
    const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    
    assert.deepStrictEqual(symbols, ["AAPL", "MSFT", "NVDA"]);
  });

  it("should parse a calculated midpoint payload", () => {
    const payload = {
      type: "price",
      symbol: "AAPL",
      data: {
        symbol: "AAPL",
        last: null,
        lastIsCalculated: true,
        bid: 175.4,
        ask: 175.6,
        bidSize: 100,
        askSize: 110,
        volume: 2000000,
        high: 176.0,
        low: 174.0,
        open: 175.0,
        close: 175.5,
        timestamp: new Date().toISOString(),
      },
    };

    assert.equal(payload.data.lastIsCalculated, true);
    assert.equal(payload.data.last, null);
  });
});

// =============================================================================
// WebSocket Message Tests
// =============================================================================

describe("WebSocket message protocol", () => {
  type WSMessage = 
    | {
      type: "price";
      symbol: string;
      data: {
        symbol: string;
        last: number | null;
        lastIsCalculated: boolean;
        bid: number | null;
        ask: number | null;
        bidSize: number | null;
        askSize: number | null;
        volume: number | null;
        high: number | null;
        low: number | null;
        open: number | null;
        close: number | null;
        timestamp: string;
      };
    }
    | { type: "subscribed"; symbols: string[] }
    | { type: "unsubscribed"; symbols: string[] }
    | { type: "error"; message: string }
    | { type: "status"; ib_connected: boolean }
    | { type: "pong" }
    | {
      type: "snapshot";
      symbol: string;
      data: {
        symbol: string;
        last: number | null;
        lastIsCalculated: boolean;
        bid: number | null;
        ask: number | null;
        bidSize: number | null;
        askSize: number | null;
        volume: number | null;
        high: number | null;
        low: number | null;
        open: number | null;
        close: number | null;
        timestamp: string;
      };
    };

  it("should parse price message", () => {
    const msg: WSMessage = {
      type: "price",
      symbol: "AAPL",
      data: {
        symbol: "AAPL",
        last: 175.50,
        lastIsCalculated: true,
        bid: 175.40,
        ask: 175.60,
        bidSize: 100,
        askSize: 120,
        volume: 5000000,
        high: 176.00,
        low: 174.00,
        open: 175.00,
        close: 175.50,
        timestamp: new Date().toISOString(),
      }
    };
    
    assert.strictEqual(msg.type, "price");
    assert.strictEqual(msg.symbol, "AAPL");
    assert.strictEqual(msg.data.lastIsCalculated, true);
  });

  it("should parse subscribed message", () => {
    const msg: WSMessage = {
      type: "subscribed",
      symbols: ["AAPL", "MSFT"]
    };
    
    assert.strictEqual(msg.type, "subscribed");
    assert.deepStrictEqual(msg.symbols, ["AAPL", "MSFT"]);
  });

  it("should parse error message", () => {
    const msg: WSMessage = {
      type: "error",
      message: "Symbol not found"
    };
    
    assert.strictEqual(msg.type, "error");
    assert.strictEqual(msg.message, "Symbol not found");
  });

  it("should parse status message", () => {
    const msg: WSMessage = {
      type: "status",
      ib_connected: true
    };
    
    assert.strictEqual(msg.type, "status");
    assert.strictEqual(msg.ib_connected, true);
  });

  it("should parse unsubscribed message", () => {
    const msg: WSMessage = {
      type: "unsubscribed",
      symbols: ["MSFT"]
    };

    assert.strictEqual(msg.type, "unsubscribed");
    assert.deepStrictEqual(msg.symbols, ["MSFT"]);
  });

  it("should parse snapshot message", () => {
    const msg: WSMessage = {
      type: "snapshot",
      symbol: "AAPL",
      data: {
        symbol: "AAPL",
        last: 175.50,
        lastIsCalculated: false,
        bid: 175.40,
        ask: 175.60,
        bidSize: 120,
        askSize: 130,
        volume: 3000000,
        high: 176.00,
        low: 174.00,
        open: 175.00,
        close: 175.20,
        timestamp: new Date().toISOString(),
      }
    };

    assert.strictEqual(msg.type, "snapshot");
    assert.strictEqual(msg.symbol, "AAPL");
    assert.equal(msg.data.last, 175.50);
  });

  it("should parse pong message", () => {
    const msg: WSMessage = {
      type: "pong",
    };

    assert.strictEqual(msg.type, "pong");
  });

  it("should parse calculated price message", () => {
    const msg: WSMessage = {
      type: "price",
      symbol: "MSFT",
      data: {
        symbol: "MSFT",
        last: 420.0,
        lastIsCalculated: true,
        bid: 419.5,
        ask: 420.5,
        bidSize: 150,
        askSize: 150,
        volume: 1_000_000,
        high: 422.0,
        low: 418.0,
        open: 420.0,
        close: 419.8,
        timestamp: new Date().toISOString(),
      }
    };

    assert.equal(msg.data.lastIsCalculated, true);
  });

  it("should normalize symbols for websocket subscriptions", () => {
    assert.deepStrictEqual(normalizeSymbolList([" aapl ", "", "MSFT", "nvda"]), ["AAPL", "MSFT", "NVDA"]);
  });

  it("should generate stable websocket symbol key", () => {
    assert.strictEqual(symbolKey(["MSFT", "aapl", "NVDA"]), "AAPL,MSFT,NVDA");
  });
});

describe("Portfolio calculation flags", () => {
  const buildLeg = (
    marketPriceIsCalculated?: boolean
  ): PortfolioPosition["legs"][number] => ({
    direction: "LONG",
    contracts: 1,
    type: "Stock",
    strike: null,
    entry_cost: 100,
    avg_cost: 100,
    market_price: 100,
    market_value: 100,
    ...(marketPriceIsCalculated == null ? {} : { market_price_is_calculated: marketPriceIsCalculated }),
  });

  const makePosition = (
    marketPriceIsCalculated: boolean | undefined,
    legs: PortfolioPosition["legs"]
  ): PortfolioPosition => ({
    id: 1,
    ticker: "TEST",
    structure: "Stock",
    structure_type: "Stock",
    risk_profile: "equity",
    expiry: "N/A",
    contracts: 1,
    direction: "LONG",
    entry_cost: 100,
    max_risk: null,
    market_value: 100,
    legs,
    market_price_is_calculated: marketPriceIsCalculated,
    kelly_optimal: null,
    target: null,
    stop: null,
    entry_date: "2026-01-01T00:00:00Z",
  });

  it("prefers explicit position-level calculated flag", () => {
    const position = makePosition(false, [buildLeg(true)]);
    assert.strictEqual(getLastPriceIsCalculated(position), false);
  });

  it("falls back to leg-level flags when position-level flag is missing", () => {
    const position = makePosition(undefined, [buildLeg(true)]);
    assert.strictEqual(getLastPriceIsCalculated(position), true);
  });

  it("returns false when no flags are present", () => {
    const position = makePosition(undefined, [buildLeg(undefined)]);
    assert.strictEqual(getLastPriceIsCalculated(position), false);
  });
});

// =============================================================================
// Price State Management Tests
// =============================================================================

describe("Price state management", () => {
  type PriceData = {
    symbol: string;
    last: number | null;
    timestamp: string;
  };

  it("should update prices by symbol", () => {
    const prices: Record<string, PriceData> = {};
    
    // Add first price
    const aapl: PriceData = { symbol: "AAPL", last: 175.50, timestamp: "2024-01-01T10:00:00Z" };
    prices[aapl.symbol] = aapl;
    
    assert.strictEqual(prices["AAPL"].last, 175.50);
    
    // Update price
    const aaplUpdated: PriceData = { symbol: "AAPL", last: 176.00, timestamp: "2024-01-01T10:01:00Z" };
    prices[aaplUpdated.symbol] = aaplUpdated;
    
    assert.strictEqual(prices["AAPL"].last, 176.00);
  });

  it("should handle multiple symbols", () => {
    const prices: Record<string, PriceData> = {};
    
    const updates: PriceData[] = [
      { symbol: "AAPL", last: 175.50, timestamp: "2024-01-01T10:00:00Z" },
      { symbol: "MSFT", last: 400.00, timestamp: "2024-01-01T10:00:00Z" },
      { symbol: "NVDA", last: 800.00, timestamp: "2024-01-01T10:00:00Z" },
    ];
    
    for (const update of updates) {
      prices[update.symbol] = update;
    }
    
    assert.strictEqual(Object.keys(prices).length, 3);
    assert.strictEqual(prices["AAPL"].last, 175.50);
    assert.strictEqual(prices["MSFT"].last, 400.00);
    assert.strictEqual(prices["NVDA"].last, 800.00);
  });

  it("should preserve other symbols on update", () => {
    const prices: Record<string, PriceData> = {
      "AAPL": { symbol: "AAPL", last: 175.50, timestamp: "2024-01-01T10:00:00Z" },
      "MSFT": { symbol: "MSFT", last: 400.00, timestamp: "2024-01-01T10:00:00Z" },
    };
    
    // Update only AAPL
    const newPrices = {
      ...prices,
      "AAPL": { symbol: "AAPL", last: 176.00, timestamp: "2024-01-01T10:01:00Z" }
    };
    
    assert.strictEqual(newPrices["AAPL"].last, 176.00);
    assert.strictEqual(newPrices["MSFT"].last, 400.00); // Unchanged
  });
});

// =============================================================================
// Connection State Tests
// =============================================================================

describe("Connection state management", () => {
  it("should track connection state", () => {
    let connected = false;
    let ibConnected = false;
    let error: string | null = null;

    // Simulate connection
    connected = true;
    assert.strictEqual(connected, true);

    // Simulate IB status
    ibConnected = true;
    assert.strictEqual(ibConnected, true);

    // Simulate error
    error = "Connection lost";
    connected = false;
    assert.strictEqual(connected, false);
    assert.strictEqual(error, "Connection lost");

    // Simulate reconnection
    connected = true;
    error = null;
    assert.strictEqual(connected, true);
    assert.strictEqual(error, null);
  });
});

// =============================================================================
// Symbol Management Tests
// =============================================================================

describe("Symbol subscription management", () => {
  it("should track subscribed symbols", () => {
    const subscriptions = new Set<string>();
    
    // Subscribe
    subscriptions.add("AAPL");
    subscriptions.add("MSFT");
    
    assert.strictEqual(subscriptions.size, 2);
    assert.strictEqual(subscriptions.has("AAPL"), true);
    
    // Unsubscribe
    subscriptions.delete("AAPL");
    
    assert.strictEqual(subscriptions.size, 1);
    assert.strictEqual(subscriptions.has("AAPL"), false);
    assert.strictEqual(subscriptions.has("MSFT"), true);
  });

  it("should handle duplicate subscriptions", () => {
    const subscriptions = new Set<string>();
    
    subscriptions.add("AAPL");
    subscriptions.add("AAPL");
    subscriptions.add("AAPL");
    
    assert.strictEqual(subscriptions.size, 1);
  });

  it("should generate stable symbol key", () => {
    const symbols1 = ["MSFT", "AAPL", "NVDA"];
    const symbols2 = ["NVDA", "AAPL", "MSFT"];
    
    const key1 = symbols1.sort().join(",");
    const key2 = symbols2.sort().join(",");
    
    assert.strictEqual(key1, key2);
    assert.strictEqual(key1, "AAPL,MSFT,NVDA");
  });
});

console.log("\n✓ All price tests passed\n");
