import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * portfolio-auto-sync.test.ts
 *
 * Verifies that GET /api/portfolio triggers a background ib_sync.py spawn
 * when portfolio.json is stale (mtime > 60 s old), without blocking the response.
 *
 * Pattern mirrors regime/route.ts stale-while-revalidate (no DOM needed).
 */

// ---------------------------------------------------------------------------
// Module-level mocks (vi.mock is hoisted before imports)
// ---------------------------------------------------------------------------

// Mock fs/promises — used by portfolio/route.ts for stat()
const mockStat = vi.fn();
vi.mock("fs/promises", () => ({
  stat: mockStat,
}));

// Mock child_process — we assert spawn is called for background sync
const mockSpawn = vi.fn();
vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

// Mock @tools/data-reader so we control what portfolio.json "contains"
const mockReadDataFile = vi.fn();
vi.mock("@tools/data-reader", () => ({
  readDataFile: mockReadDataFile,
}));

// Mock @tools/wrappers/ib-sync (used only by POST, but must be resolvable)
vi.mock("@tools/wrappers/ib-sync", () => ({
  ibSync: vi.fn().mockResolvedValue({ ok: false, stderr: "mocked" }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid PortfolioData object */
function makePortfolio(lastSync: string) {
  return {
    bankroll: 100_000,
    peak_value: 100_000,
    last_sync: lastSync,
    positions: [],
    total_deployed_pct: 0,
    total_deployed_dollars: 0,
    remaining_capacity_pct: 100,
    position_count: 0,
    defined_risk_count: 0,
    undefined_risk_count: 0,
    avg_kelly_optimal: null,
  };
}

/** Returns an ISO timestamp that is `ageMs` milliseconds in the past */
function ageAgo(ageMs: number): string {
  return new Date(Date.now() - ageMs).toISOString();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/portfolio — stale-while-revalidate background sync", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Default spawn: return a minimal EventEmitter-like stub (fire-and-forget)
    mockSpawn.mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      unref: vi.fn(),
    });
  });

  it("spawns ib_sync.py when portfolio.json mtime is >60 s old", async () => {
    // Arrange — file mtime is 90 seconds old (stale)
    const staleMtime = new Date(Date.now() - 90_000);
    mockStat.mockResolvedValue({ mtimeMs: staleMtime.getTime() });

    const portfolio = makePortfolio(ageAgo(90_000));
    mockReadDataFile.mockResolvedValue({ ok: true, data: portfolio });

    // Act — dynamic import so module-level bgSyncInFlight resets per test
    const { GET } = await import("../app/api/portfolio/route");
    const response = await GET();
    const body = await response.json();

    // Assert — response is served immediately with the cached data
    expect(response.status).toBe(200);
    expect(body.last_sync).toBe(portfolio.last_sync);

    // Assert — spawn was called with python3 + ib_sync.py
    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("python3");
    expect(args.some((a) => a.includes("ib_sync.py"))).toBe(true);
  });

  it("does NOT spawn ib_sync.py when portfolio.json mtime is <60 s old (fresh)", async () => {
    // Arrange — file mtime is 10 seconds old (fresh)
    const freshMtime = new Date(Date.now() - 10_000);
    mockStat.mockResolvedValue({ mtimeMs: freshMtime.getTime() });

    const portfolio = makePortfolio(ageAgo(10_000));
    mockReadDataFile.mockResolvedValue({ ok: true, data: portfolio });

    const { GET } = await import("../app/api/portfolio/route");
    await GET();

    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("spawns ib_sync.py when stat() throws (file missing counts as stale)", async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    mockReadDataFile.mockResolvedValue({ ok: false, error: "not found" });

    const { GET } = await import("../app/api/portfolio/route");
    const response = await GET();

    // Route returns 404 when readDataFile fails
    expect(response.status).toBe(404);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  it("does not spawn a second concurrent sync when one is already in-flight", async () => {
    // First call triggers background sync
    const staleMtime = new Date(Date.now() - 90_000);
    mockStat.mockResolvedValue({ mtimeMs: staleMtime.getTime() });

    const portfolio = makePortfolio(ageAgo(90_000));
    mockReadDataFile.mockResolvedValue({ ok: true, data: portfolio });

    const { GET } = await import("../app/api/portfolio/route");

    // Both calls use the same module instance (same bgSyncInFlight flag)
    await GET();
    await GET();

    // spawn should only be called once despite two stale GETs
    expect(mockSpawn).toHaveBeenCalledOnce();
  });
});
