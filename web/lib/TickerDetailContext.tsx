"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { PriceData } from "@/lib/pricesProtocol";
import type { PortfolioData } from "@/lib/types";

type TickerDetailContextValue = {
  activeTicker: string | null;
  openTicker: (ticker: string) => void;
  closeTicker: () => void;
  getPrices: () => Record<string, PriceData>;
  getPortfolio: () => PortfolioData | null;
  setPrices: (p: Record<string, PriceData>) => void;
  setPortfolio: (p: PortfolioData | null) => void;
};

const TickerDetailContext = createContext<TickerDetailContextValue | null>(null);

export function TickerDetailProvider({ children }: { children: ReactNode }) {
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const pricesRef = useRef<Record<string, PriceData>>({});
  const portfolioRef = useRef<PortfolioData | null>(null);

  const openTicker = useCallback((ticker: string) => {
    setActiveTicker(ticker.toUpperCase());
  }, []);

  const closeTicker = useCallback(() => {
    setActiveTicker(null);
  }, []);

  const getPrices = useCallback(() => pricesRef.current, []);
  const getPortfolio = useCallback(() => portfolioRef.current, []);

  const setPrices = useCallback((p: Record<string, PriceData>) => {
    pricesRef.current = p;
  }, []);

  const setPortfolio = useCallback((p: PortfolioData | null) => {
    portfolioRef.current = p;
  }, []);

  return (
    <TickerDetailContext.Provider
      value={{ activeTicker, openTicker, closeTicker, getPrices, getPortfolio, setPrices, setPortfolio }}
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
