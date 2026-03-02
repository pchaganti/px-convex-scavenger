export type PriceData = {
  symbol: string;
  last: number | null;
  lastIsCalculated: boolean;
  bid: number | null;
  ask: number | null;
  bidSize: number | null;
  askSize: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  timestamp: string;
};

export type WSPriceMessage = {
  type: "price";
  symbol: string;
  data: PriceData;
};

export type WSSubscribedMessage = {
  type: "subscribed";
  symbols: string[];
};

export type WSUnsubscribedMessage = {
  type: "unsubscribed";
  symbols: string[];
};

export type WSSnapshotMessage = {
  type: "snapshot";
  symbol: string;
  data: PriceData;
};

export type WSErrorMessage = {
  type: "error";
  message: string;
};

export type WSPongMessage = {
  type: "pong";
};

export type WSStatusMessage = {
  type: "status";
  ib_connected: boolean;
  subscriptions: string[];
};

export type WSMessage =
  | WSPriceMessage
  | WSSubscribedMessage
  | WSUnsubscribedMessage
  | WSSnapshotMessage
  | WSErrorMessage
  | WSPongMessage
  | WSStatusMessage;

export function normalizeSymbolList(symbols: string[]): string[] {
  return [...symbols]
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbol.length > 0);
}

export function symbolKey(symbols: string[]): string {
  return normalizeSymbolList(symbols).sort().join(",");
}
