"use client";

import { useState } from "react";
import type { PortfolioData, PortfolioPosition, AccountSummary } from "@/lib/types";
import type { PriceData } from "@/lib/pricesProtocol";
import { legPriceKey } from "@/lib/positionUtils";
import { computeExposureDetailed, type ExposureDataWithBreakdown } from "@/lib/exposureBreakdown";
import ExposureBreakdownModal, { type ExposureMetric } from "./ExposureBreakdownModal";

type MetricCardsProps = {
  portfolio: PortfolioData | null;
  prices?: Record<string, PriceData>;
  realizedPnl?: number;
  section?: string;
};

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const fmtSigned = (n: number) =>
  `${n >= 0 ? "+" : ""}${fmt(Math.abs(n))}`;

const fmtExact = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtSignedExact = (n: number) =>
  `${n >= 0 ? "+" : "-"}${fmtExact(n)}`;

const tone = (n: number) => (n > 0 ? "positive" as const : n < 0 ? "negative" as const : "neutral" as const);

function resolveMarketValue(pos: PortfolioData["positions"][number]): number | null {
  if (pos.market_value != null) return pos.market_value;
  const known = pos.legs.filter((l) => l.market_value != null);
  return known.length > 0 ? known.reduce((s, l) => s + l.market_value!, 0) : null;
}

function computePnL(portfolio: PortfolioData) {
  let totalPnL = 0;
  for (const pos of portfolio.positions) {
    const mv = resolveMarketValue(pos);
    if (mv != null) {
      totalPnL += mv - pos.entry_cost;
    }
  }
  return totalPnL;
}

function computeTodayUnrealizedPnl(
  portfolio: PortfolioData,
  prices: Record<string, PriceData>,
): { pnl: number; positionsWithData: number; totalPositions: number } {
  let pnl = 0;
  let positionsWithData = 0;
  const totalPositions = portfolio.positions.length;

  for (const pos of portfolio.positions) {
    if (pos.structure_type === "Stock") {
      const p = prices[pos.ticker];
      if (p?.last != null && p.last > 0 && p?.close != null && p.close > 0) {
        pnl += (p.last - p.close) * pos.contracts;
        positionsWithData++;
      }
      continue;
    }

    // Options / spreads: sum across legs
    let legPnl = 0;
    let allLegsValid = true;
    for (const leg of pos.legs) {
      const key = legPriceKey(pos.ticker, pos.expiry, leg);
      const lp = key ? prices[key] : null;
      if (!lp || lp.last == null || lp.last <= 0 || lp.close == null || lp.close <= 0) {
        allLegsValid = false;
        break;
      }
      const sign = leg.direction === "LONG" ? 1 : -1;
      legPnl += sign * (lp.last - lp.close) * leg.contracts * 100;
    }
    if (allLegsValid) {
      pnl += legPnl;
      positionsWithData++;
    }
  }

  return { pnl, positionsWithData, totalPositions };
}

/* ─── Metric card helper ─────────────────────────────────── */

type CardDef = { label: string; value: string; change: string; tone: "positive" | "negative" | "neutral" };

function MetricCard({ card, onClick }: { card: CardDef; onClick?: () => void }) {
  return (
    <div className={`metric-card${onClick ? " metric-card-clickable" : ""}`} onClick={onClick}>
      <div className="metric-label">{card.label}</div>
      <div className={`metric-value ${card.tone !== "neutral" ? card.tone : ""}`}>{card.value}</div>
      <div className={`metric-change ${card.tone}`}>{card.change}</div>
    </div>
  );
}

/* ─── Account row (IB authoritative) ─────────────────────── */

function AccountRow({ acct }: { acct: AccountSummary }) {
  const dailyAvailable = acct.daily_pnl != null;
  const cards: CardDef[] = [
    { label: "Net Liquidation", value: fmtExact(acct.net_liquidation), change: "BANKROLL", tone: "neutral" },
    { label: "Day P&L", value: dailyAvailable ? fmtSignedExact(acct.daily_pnl!) : "---", change: dailyAvailable ? "TODAY" : "MARKET CLOSED", tone: dailyAvailable ? tone(acct.daily_pnl!) : "neutral" },
    { label: "Unrealized P&L", value: fmtSignedExact(acct.unrealized_pnl), change: "OPEN POSITIONS", tone: acct.unrealized_pnl !== 0 ? tone(acct.unrealized_pnl) : "neutral" },
    { label: "Realized P&L", value: fmtSignedExact(acct.realized_pnl), change: "CLOSED TODAY", tone: tone(acct.realized_pnl) },
    { label: "Dividends", value: fmtExact(acct.dividends), change: "ACCRUED", tone: acct.dividends > 0 ? "positive" : "neutral" },
  ];

  return (
    <>
      <div className="section-label-mono">ACCOUNT</div>
      <div className="metrics-grid-5">
        {cards.map((c) => <MetricCard key={c.label} card={c} />)}
      </div>
    </>
  );
}

/* ─── Risk row (margin / capacity) ───────────────────────── */

function RiskRow({ acct }: { acct: AccountSummary }) {
  const cards: CardDef[] = [
    { label: "Buying Power", value: fmtExact(acct.buying_power), change: "AVAILABLE", tone: "neutral" },
    { label: "Maintenance Margin", value: fmtExact(acct.maintenance_margin), change: "REQUIRED", tone: "neutral" },
    { label: "Excess Liquidity", value: fmtExact(acct.excess_liquidity), change: "CUSHION", tone: tone(acct.excess_liquidity) },
    { label: "Settled Cash", value: fmtSignedExact(acct.settled_cash), change: "NET CASH", tone: tone(acct.settled_cash) },
  ];

  return (
    <>
      <div className="section-label-mono">RISK</div>
      <div className="metrics-grid">
        {cards.map((c) => <MetricCard key={c.label} card={c} />)}
      </div>
    </>
  );
}

/* ─── Exposure row (real-time computed, clickable) ────────── */

function ExposureRow({
  exposure,
  onCardClick,
}: {
  exposure: ExposureDataWithBreakdown | null;
  onCardClick: (metric: ExposureMetric) => void;
}) {
  return (
    <>
      <div className="section-label-mono">EXPOSURE</div>
      {exposure ? (
        <div className="metrics-grid">
          <MetricCard
            card={{ label: "Net Long", value: fmt(exposure.netLong), change: "LONG BIASED", tone: "positive" }}
            onClick={() => onCardClick("netLong")}
          />
          <MetricCard
            card={{ label: "Net Short", value: fmt(exposure.netShort), change: "SHORT BIASED", tone: "negative" }}
            onClick={() => onCardClick("netShort")}
          />
          <MetricCard
            card={{
              label: "Dollar Delta",
              value: fmtSigned(exposure.dollarDelta),
              change: "NOTIONAL EXPOSURE",
              tone: tone(exposure.dollarDelta),
            }}
            onClick={() => onCardClick("dollarDelta")}
          />
          <MetricCard
            card={{
              label: "Net Exposure",
              value: `${exposure.netExposurePct >= 0 ? "+" : ""}${exposure.netExposurePct.toFixed(1)}%`,
              change: "OF BANKROLL",
              tone: tone(exposure.netExposurePct),
            }}
            onClick={() => onCardClick("netExposure")}
          />
        </div>
      ) : (
        <div className="metrics-grid">
          {["Net Long", "Net Short", "Dollar Delta", "Net Exposure"].map((label) => (
            <div key={label} className="metric-card metric-card-loading">
              <div className="metric-label">{label}</div>
              <div className="metric-value">---</div>
              <div className="metric-change neutral">AWAITING PRICES</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Today's P&L row (WS real-time) ────────────────────── */

function TodayPnlRow({
  todayUnrealized,
  hasDaily,
  unrealized,
  realized,
  total,
  realizedPnl,
}: {
  todayUnrealized: { pnl: number; positionsWithData: number; totalPositions: number } | null;
  hasDaily: boolean;
  unrealized: number;
  realized: number;
  total: number;
  realizedPnl?: number;
}) {
  return (
    <>
      <div className="section-label-mono">TODAY&apos;S P&amp;L</div>
      {hasDaily ? (
        <div className="metrics-grid-3">
          <MetricCard card={{
            label: "Unrealized",
            value: fmtSigned(unrealized),
            change: `${todayUnrealized!.positionsWithData} OF ${todayUnrealized!.totalPositions} POSITIONS`,
            tone: "neutral",
          }} />
          <MetricCard card={{ label: "Realized", value: fmtSigned(realized), change: "TODAY'S FILLS", tone: "neutral" }} />
          <MetricCard card={{ label: "Total", value: fmtSigned(total), change: "COMBINED", tone: tone(total) }} />
        </div>
      ) : (
        <div className="metrics-grid-3">
          <div className="metric-card metric-card-loading">
            <div className="metric-label">Unrealized</div>
            <div className="metric-value">---</div>
            <div className="metric-change neutral">MARKET CLOSED</div>
          </div>
          <div className="metric-card metric-card-loading">
            <div className="metric-label">Realized</div>
            <div className="metric-value">{realizedPnl != null ? fmtSigned(realized) : "---"}</div>
            <div className="metric-change neutral">{realizedPnl != null ? "TODAY'S FILLS" : "MARKET CLOSED"}</div>
          </div>
          <div className="metric-card metric-card-loading">
            <div className="metric-label">Total</div>
            <div className="metric-value">---</div>
            <div className="metric-change neutral">MARKET CLOSED</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Legacy NET LEVERAGE row (no account_summary) ───────── */

function LegacyLeverageRow({ portfolio, pnl, pnlPct }: { portfolio: PortfolioData; pnl: number; pnlPct: number }) {
  const cards: CardDef[] = [
    { label: "Net Liquidation", value: fmt(portfolio.bankroll), change: "BANKROLL", tone: "neutral" },
    {
      label: "Positions",
      value: String(portfolio.position_count),
      change: `${portfolio.defined_risk_count} DEFINED / ${portfolio.undefined_risk_count} UNDEFINED`,
      tone: "neutral",
    },
    {
      label: "Deployed",
      value: fmt(portfolio.total_deployed_dollars),
      change: `${portfolio.total_deployed_pct.toFixed(1)}% OF BANKROLL`,
      tone: portfolio.total_deployed_pct > 100 ? "negative" : "neutral",
    },
    {
      label: "Open P&L",
      value: `${pnl >= 0 ? "+" : ""}${fmt(Math.abs(pnl))}`,
      change: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`,
      tone: tone(pnl),
    },
  ];

  return (
    <>
      <div className="section-label-mono">NET LEVERAGE</div>
      <div className="metrics-grid">
        {cards.map((c) => <MetricCard key={c.label} card={c} />)}
      </div>
    </>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function MetricCards({ portfolio, prices, realizedPnl, section }: MetricCardsProps) {
  const [activeMetric, setActiveMetric] = useState<ExposureMetric | null>(null);

  const isPortfolio = section === "portfolio";
  if (!portfolio) {
    if (!isPortfolio) return null;
    const placeholders = ["Net Liquidation", "Day P&L", "Unrealized P&L", "Realized P&L", "Dividends"];
    return (
      <>
        <div className="section-label-mono">ACCOUNT</div>
        <div className="metrics-grid-5">
          {placeholders.map((label, i) => (
            <div key={i} className="metric-card metric-card-loading">
              <div className="metric-label">{label}</div>
              <div className="metric-value">$0,000</div>
              <div className="metric-change neutral">AWAITING SYNC</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  const pnl = computePnL(portfolio);
  const pnlPct = portfolio.total_deployed_dollars > 0
    ? (pnl / portfolio.total_deployed_dollars) * 100
    : 0;

  // Exposure computation (detailed, with breakdown rows)
  const hasPrices = prices && Object.keys(prices).length > 0;
  const exposure = hasPrices ? computeExposureDetailed(portfolio, prices) : null;

  // Today's P&L computation
  const todayUnrealized = hasPrices
    ? computeTodayUnrealizedPnl(portfolio, prices)
    : null;
  const hasDaily = todayUnrealized != null && todayUnrealized.positionsWithData > 0;
  const unrealized = todayUnrealized?.pnl ?? 0;
  const realized = realizedPnl ?? 0;
  const total = unrealized + realized;

  if (!isPortfolio) return null;

  const acct = portfolio.account_summary;

  return (
    <>
      {/* Row 1: ACCOUNT (IB authoritative) or legacy NET LEVERAGE */}
      {acct ? <AccountRow acct={acct} /> : <LegacyLeverageRow portfolio={portfolio} pnl={pnl} pnlPct={pnlPct} />}

      {/* Row 2: RISK (only when account_summary present) */}
      {acct && <RiskRow acct={acct} />}

      {/* Row 3: EXPOSURE (real-time computed, clickable) */}
      <ExposureRow exposure={exposure} onCardClick={setActiveMetric} />

      {/* Row 4: TODAY'S P&L (WS real-time) */}
      <TodayPnlRow
        todayUnrealized={todayUnrealized}
        hasDaily={hasDaily}
        unrealized={unrealized}
        realized={realized}
        total={total}
        realizedPnl={realizedPnl}
      />

      {/* Exposure breakdown modal */}
      {exposure && (
        <ExposureBreakdownModal
          metric={activeMetric}
          exposure={exposure}
          bankroll={portfolio.bankroll}
          onClose={() => setActiveMetric(null)}
        />
      )}
    </>
  );
}
