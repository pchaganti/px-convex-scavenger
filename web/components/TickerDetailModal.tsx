"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { PortfolioPosition } from "@/lib/types";
import type { PriceData } from "@/lib/pricesProtocol";
import { useTickerDetail } from "@/lib/TickerDetailContext";
import { fmtPrice, fmtUsd } from "@/components/WorkspaceSections";
import Modal from "./Modal";
import PositionTab from "./ticker-detail/PositionTab";
import OrderTab from "./ticker-detail/OrderTab";
import NewsTab from "./ticker-detail/NewsTab";
import RatingsTab from "./ticker-detail/RatingsTab";

type TabId = "position" | "order" | "news" | "ratings";

function PriceBar({ priceData }: { priceData: PriceData | null }) {
  if (!priceData) {
    return <div className="price-bar price-bar-empty">No real-time data</div>;
  }

  const { bid, ask, last, volume, close } = priceData;
  const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
  const spread = bid != null && ask != null ? ask - bid : null;
  const dayChange = last != null && last > 0 && close != null && close > 0
    ? ((last - close) / close) * 100
    : null;

  return (
    <div className="price-bar">
      <div className="price-bar-item">
        <span className="price-bar-label">BID</span>
        <span className="price-bar-value">{bid != null ? fmtPrice(bid) : "---"}</span>
      </div>
      <div className="price-bar-item">
        <span className="price-bar-label">ASK</span>
        <span className="price-bar-value">{ask != null ? fmtPrice(ask) : "---"}</span>
      </div>
      <div className="price-bar-item">
        <span className="price-bar-label">MID</span>
        <span className="price-bar-value">{mid != null ? fmtPrice(mid) : "---"}</span>
      </div>
      <div className="price-bar-item">
        <span className="price-bar-label">SPREAD</span>
        <span className="price-bar-value">{spread != null ? fmtPrice(spread) : "---"}</span>
      </div>
      <div className="price-bar-item">
        <span className="price-bar-label">LAST</span>
        <span className="price-bar-value">{last != null ? fmtPrice(last) : "---"}</span>
      </div>
      <div className="price-bar-item">
        <span className="price-bar-label">VOLUME</span>
        <span className="price-bar-value">{volume != null ? volume.toLocaleString() : "---"}</span>
      </div>
      <div className="price-bar-item">
        <span className="price-bar-label">DAY</span>
        <span className={`price-bar-value ${dayChange != null ? (dayChange >= 0 ? "positive" : "negative") : ""}`}>
          {dayChange != null ? (
            <>
              {dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)}%
              {dayChange > 0 && <ArrowUp size={10} className="price-trend-icon price-trend-up" />}
              {dayChange < 0 && <ArrowDown size={10} className="price-trend-icon price-trend-down" />}
            </>
          ) : "---"}
        </span>
      </div>
    </div>
  );
}

export default function TickerDetailModal() {
  const { activeTicker, closeTicker, getPrices, getPortfolio } = useTickerDetail();
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  const prices = getPrices();
  const portfolio = getPortfolio();

  const position: PortfolioPosition | null = useMemo(() => {
    if (!activeTicker || !portfolio) return null;
    return portfolio.positions.find((p) => p.ticker === activeTicker) ?? null;
  }, [activeTicker, portfolio]);

  const priceData = activeTicker ? prices[activeTicker] ?? null : null;

  // Reset tab when ticker changes
  useEffect(() => {
    setActiveTab(null);
  }, [activeTicker]);

  // Default tab: position if position exists, else order
  const resolvedTab = activeTab ?? (position ? "position" : "order");

  if (!activeTicker) return null;

  const tabs: { id: TabId; label: string; hidden?: boolean }[] = [
    { id: "position", label: "Position", hidden: !position },
    { id: "order", label: "Order" },
    { id: "news", label: "News" },
    { id: "ratings", label: "Ratings" },
  ];

  const positionSummary = position
    ? `${position.direction} ${position.contracts}x ${position.structure}`
    : "No Position";

  return (
    <Modal open={true} onClose={closeTicker} title={activeTicker} className="ticker-detail-modal">
      <div className="ticker-detail-content">
        {/* Position summary pill */}
        <div className="ticker-detail-header">
          <span className={`pill ${position ? "defined" : "neutral"}`} style={{ fontSize: "9px" }}>
            {positionSummary}
          </span>
        </div>

        {/* Price bar */}
        <PriceBar priceData={priceData} />

        {/* Tab bar */}
        <div className="ticker-tabs">
          {tabs.filter((t) => !t.hidden).map((tab) => (
            <button
              key={tab.id}
              className={`ticker-tab ${resolvedTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="ticker-tab-content">
          {resolvedTab === "position" && position && (
            <PositionTab position={position} prices={prices} />
          )}
          {resolvedTab === "order" && (
            <OrderTab ticker={activeTicker} position={position} prices={prices} />
          )}
          {resolvedTab === "news" && (
            <NewsTab ticker={activeTicker} active={resolvedTab === "news"} />
          )}
          {resolvedTab === "ratings" && (
            <RatingsTab
              ticker={activeTicker}
              active={resolvedTab === "ratings"}
              currentPrice={priceData?.last}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
