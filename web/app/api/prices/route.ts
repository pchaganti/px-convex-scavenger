import { NextRequest, NextResponse } from "next/server";
import { normalizeSymbolList, type PriceData, type WSMessage } from "@/lib/pricesProtocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WS_SERVER_URL = process.env.IB_REALTIME_WS_URL || "ws://localhost:8765";

/**
 * GET /api/prices
 * 
 * Legacy SSE endpoint removed.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Connect directly to the websocket server with ws://... rather than SSE."
    },
    { status: 405 }
  );
}

/**
 * POST /api/prices
 * 
 * Get a one-time snapshot of prices for the given symbols.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json() as { symbols?: string[] };
    const symbols = normalizeSymbolList(Array.isArray(body.symbols) ? body.symbols : []);
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols array required" },
        { status: 400 }
      );
    }

    // Import ws module
    let WebSocket: typeof import("ws").WebSocket;
    try {
      const ws = await import("ws");
      WebSocket = ws.WebSocket;
    } catch {
      return NextResponse.json(
        { error: "WebSocket not available" },
        { status: 500 }
      );
    }

    return new Promise((resolve) => {
      const wsClient = new WebSocket(WS_SERVER_URL);
      const results: Record<string, PriceData> = {};
      const pending = new Set(symbols);
      
      const timeout = setTimeout(() => {
        wsClient.close();
        resolve(NextResponse.json({
          prices: results,
          missing: Array.from(pending),
          partial: pending.size > 0
        }));
      }, 5000);

      wsClient.on("open", () => {
        wsClient.send(JSON.stringify({
          action: "snapshot",
          symbols
        }));
      });

      wsClient.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          
          if (message.type === "snapshot") {
            const symbol = message.data.symbol.toUpperCase();
            results[symbol] = message.data;
            pending.delete(symbol);
            
            if (pending.size === 0) {
              clearTimeout(timeout);
              wsClient.close();
              resolve(NextResponse.json({ prices: results }));
            }
          }
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      });

      wsClient.on("error", () => {
        clearTimeout(timeout);
        resolve(NextResponse.json(
          { error: "Failed to connect to price server" },
          { status: 502 }
        ));
      });
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
