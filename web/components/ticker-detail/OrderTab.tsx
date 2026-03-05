"use client";

import { useCallback, useMemo, useState } from "react";
import type { PortfolioPosition } from "@/lib/types";
import type { PriceData } from "@/lib/pricesProtocol";
import { fmtPrice } from "@/components/WorkspaceSections";

type OrderTabProps = {
  ticker: string;
  position: PortfolioPosition | null;
  prices: Record<string, PriceData>;
  onOrderPlaced?: () => void;
};

type OrderAction = "BUY" | "SELL";

export default function OrderTab({ ticker, position, prices, onOrderPlaced }: OrderTabProps) {
  const isCombo = position != null && position.legs.length > 1 && position.structure_type !== "Stock";

  const priceData = prices[ticker] ?? null;
  const bid = priceData?.bid ?? null;
  const ask = priceData?.ask ?? null;
  const mid = bid != null && ask != null ? (bid + ask) / 2 : null;

  // Default action based on position
  const defaultAction: OrderAction = position != null ? "SELL" : "BUY";
  const [action, setAction] = useState<OrderAction>(defaultAction);
  const [quantity, setQuantity] = useState(() => {
    if (position && position.structure_type === "Stock") return String(position.contracts);
    return "";
  });
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<"DAY" | "GTC">("DAY");
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parsedQty = parseInt(quantity, 10);
  const parsedPrice = parseFloat(limitPrice);
  const isValid = !isNaN(parsedQty) && parsedQty > 0 && !isNaN(parsedPrice) && parsedPrice > 0;

  const handlePlace = useCallback(async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stock",
          symbol: ticker,
          action,
          quantity: parsedQty,
          limitPrice: parsedPrice,
          tif,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Order placement failed");
      } else {
        setSuccess(`Order placed: ${action} ${parsedQty} ${ticker} @ ${fmtPrice(parsedPrice)}`);
        setConfirmStep(false);
        onOrderPlaced?.();
      }
    } catch {
      setError("Network error placing order");
    } finally {
      setLoading(false);
    }
  }, [confirmStep, ticker, action, parsedQty, parsedPrice, tif, onOrderPlaced]);

  const handleCancel = useCallback(() => {
    setConfirmStep(false);
  }, []);

  if (isCombo) {
    return (
      <div className="order-tab">
        <div className="order-combo-notice">
          This is a multi-leg position ({position.structure}). Close individual legs via the Orders page or use the CLI evaluate command for complex option orders.
        </div>
      </div>
    );
  }

  return (
    <div className="order-tab">
      <div className="order-form">
        {/* Action selector */}
        <div className="order-field">
          <label className="order-label">Action</label>
          <div className="order-action-buttons">
            <button
              className={`order-action-btn ${action === "BUY" ? "order-action-active order-action-buy" : ""}`}
              onClick={() => { setAction("BUY"); setConfirmStep(false); }}
            >
              BUY
            </button>
            <button
              className={`order-action-btn ${action === "SELL" ? "order-action-active order-action-sell" : ""}`}
              onClick={() => { setAction("SELL"); setConfirmStep(false); }}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div className="order-field">
          <label className="order-label">Quantity</label>
          <input
            className="order-input"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => { setQuantity(e.target.value); setConfirmStep(false); }}
            placeholder="Shares"
          />
        </div>

        {/* Limit Price */}
        <div className="order-field">
          <label className="order-label">Limit Price</label>
          <div className="modify-price-input-row">
            <span className="modify-price-prefix">$</span>
            <input
              className="modify-price-input"
              type="number"
              step="0.01"
              min="0.01"
              value={limitPrice}
              onChange={(e) => { setLimitPrice(e.target.value); setConfirmStep(false); }}
              placeholder="0.00"
            />
          </div>
          {/* Quick-set buttons */}
          <div className="modify-quick-buttons">
            <button
              className="btn-quick"
              disabled={bid == null}
              onClick={() => { if (bid != null) { setLimitPrice(bid.toFixed(2)); setConfirmStep(false); } }}
            >
              BID
            </button>
            <button
              className="btn-quick"
              disabled={mid == null}
              onClick={() => { if (mid != null) { setLimitPrice(mid.toFixed(2)); setConfirmStep(false); } }}
            >
              MID
            </button>
            <button
              className="btn-quick"
              disabled={ask == null}
              onClick={() => { if (ask != null) { setLimitPrice(ask.toFixed(2)); setConfirmStep(false); } }}
            >
              ASK
            </button>
          </div>
        </div>

        {/* TIF */}
        <div className="order-field">
          <label className="order-label">Time in Force</label>
          <div className="order-action-buttons">
            <button
              className={`order-action-btn ${tif === "DAY" ? "order-action-active" : ""}`}
              onClick={() => setTif("DAY")}
            >
              DAY
            </button>
            <button
              className={`order-action-btn ${tif === "GTC" ? "order-action-active" : ""}`}
              onClick={() => setTif("GTC")}
            >
              GTC
            </button>
          </div>
        </div>

        {/* Error / Success */}
        {error && <div className="order-error">{error}</div>}
        {success && <div className="order-success">{success}</div>}

        {/* Submit */}
        <div className="order-submit">
          {confirmStep ? (
            <div className="order-confirm-row">
              <button className="btn-secondary" onClick={handleCancel} disabled={loading}>
                Back
              </button>
              <button
                className={`btn-primary ${action === "SELL" ? "btn-danger" : ""}`}
                onClick={handlePlace}
                disabled={!isValid || loading}
              >
                {loading ? "Placing..." : `Confirm: ${action} ${parsedQty} ${ticker} @ ${fmtPrice(parsedPrice)}`}
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={handlePlace}
              disabled={!isValid || loading}
              style={{ width: "100%" }}
            >
              Place Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
