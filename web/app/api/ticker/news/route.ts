import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    const limit = searchParams.get("limit") || "20";

    if (!ticker) {
      return NextResponse.json({ error: "ticker parameter required" }, { status: 400 });
    }

    const token = process.env.UW_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "UW_TOKEN not configured" }, { status: 500 });
    }

    const url = new URL("https://api.unusualwhales.com/api/news/headlines");
    url.searchParams.set("ticker", ticker.toUpperCase());
    url.searchParams.set("limit", limit);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `UW API error: ${res.status}` },
        { status: res.status },
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
