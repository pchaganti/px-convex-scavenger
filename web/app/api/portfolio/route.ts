import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { PortfolioData } from "@/lib/types";

export const runtime = "nodejs";

const SYNC_TIMEOUT_MS = 30_000;

const resolveProjectRoot = (): string => {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "..", ".."),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "data", "portfolio.json"))) {
      return candidate;
    }
  }

  return process.cwd();
};

const readPortfolio = async (): Promise<PortfolioData | null> => {
  const root = resolveProjectRoot();
  const filePath = path.join(root, "data", "portfolio.json");

  if (!existsSync(filePath)) {
    return null;
  }

  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as PortfolioData;
};

const runSync = (root: string): Promise<{ ok: boolean; stderr: string }> => {
  return new Promise((resolve) => {
    const scriptPath = path.join("scripts", "ib_sync.py");
    const proc = spawn("python3", [scriptPath, "--sync", "--port", "4001"], {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
    }, SYNC_TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stderr });
    });

    proc.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, stderr: "Failed to spawn ib_sync.py" });
    });
  });
};

export async function GET(): Promise<Response> {
  try {
    const data = await readPortfolio();
    if (!data) {
      return NextResponse.json(
        { error: "portfolio.json not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read portfolio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(): Promise<Response> {
  try {
    const root = resolveProjectRoot();
    const result = await runSync(root);

    if (!result.ok) {
      return NextResponse.json(
        { error: "Sync failed", stderr: result.stderr },
        { status: 502 },
      );
    }

    const data = await readPortfolio();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
