"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { PriceData } from "@/lib/pricesProtocol";
import type { OrdersData, PortfolioData } from "@/lib/types";

type TickerDetailContextValue = {
  activeTicker: string | null;
  activePositionId: number | null;
  openTicker: (ticker: string, positionId?: number) => void;
  closeTicker: () => void;
  getPrices: () => Record<string, PriceData>;
  getPortfolio: () => PortfolioData | null;
  getOrders: () => OrdersData | null;
  setPrices: (p: Record<string, PriceData>) => void;
  setPortfolio: (p: PortfolioData | null) => void;
  setOrders: (o: OrdersData | null) => void;
};

const TickerDetailContext = createContext<TickerDetailContextValue | null>(null);

export function TickerDetailProvider({ children }: { children: ReactNode }) {
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [activePositionId, setActivePositionId] = useState<number | null>(null);
  const pricesRef = useRef<Record<string, PriceData>>({});
  const portfolioRef = useRef<PortfolioData | null>(null);
  const ordersRef = useRef<OrdersData | null>(null);

  const openTicker = useCallback((ticker: string, positionId?: number) => {
    setActiveTicker(ticker.toUpperCase());
    setActivePositionId(positionId ?? null);
  }, []);

  const closeTicker = useCallback(() => {
    setActiveTicker(null);
    setActivePositionId(null);
  }, []);

  const getPrices = useCallback(() => pricesRef.current, []);
  const getPortfolio = useCallback(() => portfolioRef.current, []);
  const getOrders = useCallback(() => ordersRef.current, []);

  const setPrices = useCallback((p: Record<string, PriceData>) => {
    pricesRef.current = p;
  }, []);

  const setPortfolio = useCallback((p: PortfolioData | null) => {
    portfolioRef.current = p;
  }, []);

  const setOrders = useCallback((o: OrdersData | null) => {
    ordersRef.current = o;
  }, []);

  return (
    <TickerDetailContext.Provider
      value={{ activeTicker, activePositionId, openTicker, closeTicker, getPrices, getPortfolio, getOrders, setPrices, setPortfolio, setOrders }}
    >
      {children}
    </TickerDetailContext.Provider>
  );
}

export function useTickerDetail(): TickerDetailContextValue {
  const ctx = useContext(TickerDetailContext);
  if (!ctx) throw new Error("useTickerDetail must be used within TickerDetailProvider");
  return ctx;
}
