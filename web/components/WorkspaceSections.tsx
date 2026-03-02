"use client";

import { useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Search,
  Sparkles,
  TrendingDown,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { PortfolioData, PortfolioPosition, WorkspaceSection } from "@/lib/types";
import { against, neutralRows, supports, watchRows } from "@/lib/data";
import { useSort, type SortDirection } from "@/lib/useSort";

/* ─── Sortable header cell ──────────────────────────────── */

function SortTh<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onToggle,
  className,
}: {
  label: string;
  sortKey: K;
  activeKey: K | null;
  direction: SortDirection;
  onToggle: (key: K) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      className={`sortable-th ${className ?? ""} ${active ? "sort-active" : ""}`}
      onClick={() => onToggle(sortKey)}
    >
      <span className="sort-label">
        {label}
        <span className="sort-icon">
          {active ? (
            direction === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
          ) : (
            <ChevronDown size={10} className="sort-icon-idle" />
          )}
        </span>
      </span>
    </th>
  );
}

/* ─── Flow tables ───────────────────────────────────────── */

type FlowKey = "ticker" | "position" | "flowLabel" | "strength" | "note";

const flowExtract = (item: { ticker: string; position: string; flowLabel: string; strength: string; note: string }, key: FlowKey) => {
  if (key === "strength") return parseFloat(item[key]);
  return item[key];
};

function FlowSections() {
  const supSort = useSort(supports, flowExtract);
  const againstSort = useSort(against, flowExtract);

  type WatchKey = "ticker" | "position" | "flow" | "note";
  const watchExtract = useCallback((item: (typeof watchRows)[number], key: WatchKey) => item[key], []);
  const wSort = useSort(watchRows, watchExtract);

  type NeutralKey = "ticker" | "strength" | "prints";
  const neutralExtract = useCallback((item: (typeof neutralRows)[number], key: NeutralKey) => {
    if (key === "prints") return parseInt(item[key].replace(/,/g, ""), 10);
    if (key === "strength") return parseInt(item[key], 10);
    return item[key];
  }, []);
  const nSort = useSort(neutralRows, neutralExtract);

  return (
    <>
      <div className="section">
        <div className="alert-box">
          <div className="alert-title">
            <TriangleAlert size={14} />
            ACTION ITEMS
          </div>
          <div className="alert-item">
            <span className="alert-ticker">BRZE</span> — Long calls expiring Mar 20 (20 days) with 42% distribution flow. Consider exit or reduced exposure.
          </div>
          <div className="alert-item">
            <span className="alert-ticker">RR</span> — Sustained distribution. Review thesis for continued hold.
          </div>
          <div className="alert-item">
            <span className="alert-ticker">MSFT</span> — $469K position saw massive Friday selling (0.8% buy ratio). Monitor Monday.
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <CheckCircle2 size={14} />
            Flow Supports Position
          </div>
          <span className="pill defined">6 POSITIONS</span>
        </div>
        <div className="section-body">
          <table>
            <thead>
              <tr>
                <SortTh label="Ticker" sortKey="ticker" activeKey={supSort.sort.key} direction={supSort.sort.direction} onToggle={supSort.toggle} />
                <SortTh label="Position" sortKey="position" activeKey={supSort.sort.key} direction={supSort.sort.direction} onToggle={supSort.toggle} />
                <SortTh label="Flow" sortKey="flowLabel" activeKey={supSort.sort.key} direction={supSort.sort.direction} onToggle={supSort.toggle} />
                <SortTh label="Strength" sortKey="strength" activeKey={supSort.sort.key} direction={supSort.sort.direction} onToggle={supSort.toggle} />
                <SortTh label="Signal" sortKey="note" activeKey={supSort.sort.key} direction={supSort.sort.direction} onToggle={supSort.toggle} />
              </tr>
            </thead>
            <tbody>
              {supSort.sorted.map((item) => (
                <tr key={`support-${item.ticker}`}>
                  <td><strong>{item.ticker}</strong></td>
                  <td>{item.position}</td>
                  <td><span className={`pill ${item.flowClass}`}>{item.flowLabel}</span></td>
                  <td>
                    <div className="strength-bar">
                      <div className="strength-fill" style={{ width: `${item.strength}%` }} />
                    </div>
                    <div className="strength-value">{item.strength}</div>
                  </td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <TrendingDown size={14} />
            Flow Against Position
          </div>
          <span className="pill distrib">2 POSITIONS</span>
        </div>
        <div className="section-body">
          <table>
            <thead>
              <tr>
                <SortTh label="Ticker" sortKey="ticker" activeKey={againstSort.sort.key} direction={againstSort.sort.direction} onToggle={againstSort.toggle} />
                <SortTh label="Position" sortKey="position" activeKey={againstSort.sort.key} direction={againstSort.sort.direction} onToggle={againstSort.toggle} />
                <SortTh label="Flow" sortKey="flowLabel" activeKey={againstSort.sort.key} direction={againstSort.sort.direction} onToggle={againstSort.toggle} />
                <SortTh label="Strength" sortKey="strength" activeKey={againstSort.sort.key} direction={againstSort.sort.direction} onToggle={againstSort.toggle} />
                <SortTh label="Concern" sortKey="note" activeKey={againstSort.sort.key} direction={againstSort.sort.direction} onToggle={againstSort.toggle} />
              </tr>
            </thead>
            <tbody>
              {againstSort.sorted.map((item) => (
                <tr key={`against-${item.ticker}`}>
                  <td><strong>{item.ticker}</strong></td>
                  <td>{item.position}</td>
                  <td><span className={`pill ${item.flowClass}`}>{item.flowLabel}</span></td>
                  <td>
                    <div className="strength-bar">
                      <div className="strength-fill" style={{ width: `${item.strength}%` }} />
                    </div>
                    <div className="strength-value">{item.strength}</div>
                  </td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-header">
            <div className="section-title">
              <Bell size={14} />
              Watch Closely
            </div>
            <span className="pill undefined">2 POSITIONS</span>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <SortTh label="Ticker" sortKey="ticker" activeKey={wSort.sort.key} direction={wSort.sort.direction} onToggle={wSort.toggle} />
                  <SortTh label="Position" sortKey="position" activeKey={wSort.sort.key} direction={wSort.sort.direction} onToggle={wSort.toggle} />
                  <SortTh label="Flow" sortKey="flow" activeKey={wSort.sort.key} direction={wSort.sort.direction} onToggle={wSort.toggle} />
                  <SortTh label="Note" sortKey="note" activeKey={wSort.sort.key} direction={wSort.sort.direction} onToggle={wSort.toggle} />
                </tr>
              </thead>
              <tbody>
                {wSort.sorted.map((item) => (
                  <tr key={item.ticker}>
                    <td><strong>{item.ticker}</strong></td>
                    <td>{item.position}</td>
                    <td><span className={`pill ${item.className}`}>{item.flow}</span></td>
                    <td>{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <div className="section-title">
              <Circle size={14} />
              Neutral / Low Signal
            </div>
            <span className="pill neutral">8 POSITIONS</span>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <SortTh label="Ticker" sortKey="ticker" activeKey={nSort.sort.key} direction={nSort.sort.direction} onToggle={nSort.toggle} />
                  <SortTh label="Flow" sortKey="strength" activeKey={nSort.sort.key} direction={nSort.sort.direction} onToggle={nSort.toggle} />
                  <SortTh label="Prints" sortKey="prints" className="right" activeKey={nSort.sort.key} direction={nSort.sort.direction} onToggle={nSort.toggle} />
                </tr>
              </thead>
              <tbody>
                {nSort.sorted.map((row) => (
                  <tr key={`neutral-${row.ticker}`}>
                    <td>{row.ticker}</td>
                    <td><span className={`pill ${row.className}`}>{row.strength}</span></td>
                    <td className="right">{row.prints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="report-meta">
          Report Generated: 2026-02-28 18:12:12 PST • Source: IB Gateway (4001) • Dark Pool Lookback: 5 Trading Days
        </div>
      </div>
    </>
  );
}

/* ─── Portfolio tables ──────────────────────────────────── */

const fmtUsd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtPrice = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function resolveMarketValue(pos: PortfolioPosition): number | null {
  if (pos.market_value != null) return pos.market_value;
  // Fallback: sum leg market values when position-level is null
  const known = pos.legs.filter((l) => l.market_value != null);
  return known.length > 0 ? known.reduce((s, l) => s + l.market_value!, 0) : null;
}

function getMultiplier(pos: PortfolioPosition): number {
  return pos.structure_type === "Stock" ? 1 : 100;
}

function getAvgEntry(pos: PortfolioPosition): number {
  const mult = getMultiplier(pos);
  return pos.entry_cost / (pos.contracts * mult);
}

function getLastPrice(pos: PortfolioPosition): number | null {
  const mv = resolveMarketValue(pos);
  if (mv == null) return null;
  const mult = getMultiplier(pos);
  return mv / (pos.contracts * mult);
}

function PositionRow({ pos }: { pos: PortfolioPosition }) {
  const mv = resolveMarketValue(pos);
  const pnl = mv != null ? mv - pos.entry_cost : null;
  const pnlPct = pnl != null && pos.entry_cost !== 0 ? (pnl / Math.abs(pos.entry_cost)) * 100 : null;
  const avgEntry = getAvgEntry(pos);
  const lastPrice = getLastPrice(pos);

  return (
    <>
      <tr>
        <td><strong>{pos.ticker}</strong></td>
        <td>{pos.structure}</td>
        <td>
          <span className={`pill ${pos.risk_profile === "defined" ? "defined" : pos.risk_profile === "equity" ? "neutral" : "undefined"}`}>
            {pos.direction}
          </span>
        </td>
        <td className="right">{fmtPrice(avgEntry)}</td>
        <td className="right">{lastPrice != null ? fmtPrice(lastPrice) : "—"}</td>
        <td className="right">{fmtUsd(pos.entry_cost)}</td>
        <td className="right">{mv != null ? fmtUsd(mv) : "—"}</td>
        <td className={`right ${pnl != null ? (pnl >= 0 ? "positive" : "negative") : ""}`}>
          {pnl != null ? `${pnl >= 0 ? "+" : ""}${fmtUsd(Math.abs(pnl))} (${pnlPct!.toFixed(1)}%)` : "—"}
        </td>
        <td>{pos.expiry !== "N/A" ? pos.expiry : "—"}</td>
      </tr>
      {pos.legs.length > 1 && pos.legs.map((leg, i) => (
        <tr key={`${pos.id}-leg-${i}`} className="leg-row">
          <td></td>
          <td colSpan={2} style={{ paddingLeft: "1.5rem", opacity: 0.7, fontSize: "0.85em" }}>
            {leg.direction} {leg.contracts}x {leg.type}{leg.strike ? ` $${leg.strike}` : ""}
          </td>
          <td className="right" style={{ opacity: 0.7, fontSize: "0.85em" }}>{fmtPrice(leg.avg_cost / (leg.type === "Stock" ? 1 : 100))}</td>
          <td className="right" style={{ opacity: 0.7, fontSize: "0.85em" }}>{leg.market_price != null ? fmtPrice(leg.market_price) : "—"}</td>
          <td className="right" style={{ opacity: 0.7, fontSize: "0.85em" }}>{fmtUsd(leg.entry_cost)}</td>
          <td className="right" style={{ opacity: 0.7, fontSize: "0.85em" }}>{leg.market_value != null ? fmtUsd(leg.market_value) : "—"}</td>
          <td></td>
          <td></td>
        </tr>
      ))}
    </>
  );
}

type PositionSortKey = "ticker" | "structure" | "direction" | "avg_entry" | "last_price" | "entry_cost" | "market_value" | "pnl" | "expiry";

const positionExtract = (pos: PortfolioPosition, key: PositionSortKey): string | number | null => {
  const mv = resolveMarketValue(pos);
  switch (key) {
    case "ticker": return pos.ticker;
    case "structure": return pos.structure;
    case "direction": return pos.direction;
    case "avg_entry": return getAvgEntry(pos);
    case "last_price": return getLastPrice(pos);
    case "entry_cost": return pos.entry_cost;
    case "market_value": return mv;
    case "pnl": return mv != null ? mv - pos.entry_cost : null;
    case "expiry": return pos.expiry === "N/A" ? null : pos.expiry;
    default: return null;
  }
};

function PositionTable({ positions }: { positions: PortfolioPosition[] }) {
  const { sorted, sort, toggle } = useSort(positions, positionExtract);

  return (
    <table>
      <thead>
        <tr>
          <SortTh<PositionSortKey> label="Ticker" sortKey="ticker" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Structure" sortKey="structure" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Direction" sortKey="direction" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Avg Entry" sortKey="avg_entry" className="right" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Last Price" sortKey="last_price" className="right" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Entry Cost" sortKey="entry_cost" className="right" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Market Value" sortKey="market_value" className="right" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="P&L" sortKey="pnl" className="right" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
          <SortTh<PositionSortKey> label="Expiry" sortKey="expiry" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
        </tr>
      </thead>
      <tbody>
        {sorted.map((pos) => (
          <PositionRow key={pos.id} pos={pos} />
        ))}
      </tbody>
    </table>
  );
}

function PortfolioSections({ portfolio }: { portfolio: PortfolioData | null }) {
  if (!portfolio) {
    return (
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <Circle size={14} />
            Portfolio
          </div>
          <span className="pill neutral">LOADING</span>
        </div>
        <div className="section-body">
          <div className="alert-item">Waiting for portfolio data...</div>
        </div>
      </div>
    );
  }

  const definedPositions = portfolio.positions.filter((p) => p.risk_profile === "defined");
  const equityPositions = portfolio.positions.filter((p) => p.risk_profile === "equity");
  const undefinedPositions = portfolio.positions.filter((p) => p.risk_profile === "undefined");

  return (
    <>
      {definedPositions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title">
              <CheckCircle2 size={14} />
              Defined Risk Positions
            </div>
            <span className="pill defined">{definedPositions.length} POSITIONS</span>
          </div>
          <div className="section-body">
            <PositionTable positions={definedPositions} />
          </div>
        </div>
      )}

      {equityPositions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title">
              <Circle size={14} />
              Equity Positions
            </div>
            <span className="pill neutral">{equityPositions.length} POSITIONS</span>
          </div>
          <div className="section-body">
            <PositionTable positions={equityPositions} />
          </div>
        </div>
      )}

      {undefinedPositions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title">
              <TriangleAlert size={14} />
              Undefined Risk Positions
            </div>
            <span className="pill undefined">{undefinedPositions.length} POSITIONS</span>
          </div>
          <div className="section-body">
            <PositionTable positions={undefinedPositions} />
          </div>
        </div>
      )}

      <div className="section">
        <div className="report-meta">
          Last Sync: {new Date(portfolio.last_sync).toLocaleString()} • Source: IB Gateway (4001)
        </div>
      </div>
    </>
  );
}

/* ─── Scanner table ─────────────────────────────────────── */

type ScannerKey = "ticker" | "signal" | "strength";

function ScannerSections() {
  const data = neutralRows.slice(0, 4);
  const scannerExtract = useCallback((item: (typeof neutralRows)[number], key: ScannerKey) => {
    if (key === "signal") return "Neutral Flow";
    if (key === "strength") return parseInt(item.strength, 10);
    return item[key];
  }, []);
  const { sorted, sort, toggle } = useSort(data, scannerExtract);

  return (
    <>
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <Sparkles size={14} />
            Scanner Signals
          </div>
          <span className="pill defined">SCANNER</span>
        </div>
        <div className="section-body">
          <table>
            <thead>
              <tr>
                <SortTh<ScannerKey> label="Ticker" sortKey="ticker" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
                <SortTh<ScannerKey> label="Signal" sortKey="signal" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
                <SortTh<ScannerKey> label="Signal Strength" sortKey="strength" activeKey={sort.key} direction={sort.direction} onToggle={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={`scanner-${row.ticker}`}>
                  <td>{row.ticker}</td>
                  <td>Neutral Flow</td>
                  <td>{row.strength}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Non-table sections ────────────────────────────────── */

function DiscoverSections() {
  return (
    <>
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <Search size={14} />
            Discovery Queue
          </div>
          <span className="pill defined">DISCOVER</span>
        </div>
        <div className="section-body">
          <div className="alert-item">Discovering by premise and options flow strength.</div>
          <div className="alert-item">BKD, MSFT, and IGV currently in active watch set.</div>
        </div>
      </div>
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <Bell size={14} />
            Watch candidates
          </div>
          <span className="pill neutral">LIVE</span>
        </div>
        <div className="section-body">
          <div className="report-meta">
            Report Generated: 2026-02-28 18:12:12 PST • Source: Internal Market Scanner
          </div>
        </div>
      </div>
    </>
  );
}

function JournalSections() {
  return (
    <>
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <Wrench size={14} />
            Journal Log
          </div>
          <span className="pill defined">JOURNAL</span>
        </div>
        <div className="section-body">
          <div className="alert-item">No trade decision yet. Request `/journal --limit N` for most recent entries.</div>
          <div className="alert-item">BRZE and RR flagged by recent flow event.</div>
        </div>
      </div>
    </>
  );
}

/* ─── Root switch ───────────────────────────────────────── */

type WorkspaceSectionsProps = {
  section: WorkspaceSection;
  portfolio?: PortfolioData | null;
};

export default function WorkspaceSections({ section, portfolio }: WorkspaceSectionsProps) {
  switch (section) {
    case "dashboard":
      return null;
    case "flow-analysis":
      return <FlowSections />;
    case "portfolio":
      return <PortfolioSections portfolio={portfolio ?? null} />;
    case "scanner":
      return <ScannerSections />;
    case "discover":
      return <DiscoverSections />;
    case "journal":
      return <JournalSections />;
    default:
      return <FlowSections />;
  }
}
