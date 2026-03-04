"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { OpenOrder, OrdersData } from "@/lib/types";

/** Snapshot of a cancelled order for the executed table */
export type CancelledOrder = {
  permId: number;
  symbol: string;
  action: string;
  orderType: string;
  totalQuantity: number;
  limitPrice: number | null;
  cancelledAt: string; // ISO timestamp
};

type Notification = {
  type: "error" | "warning" | "success";
  message: string;
  duration?: number;
};

type CancelOrdersContextValue = {
  pendingCancels: Map<number, OpenOrder>;
  cancelledOrders: CancelledOrder[];
  requestCancel: (order: OpenOrder) => Promise<void>;
  drainNotifications: () => Notification[];
  setOrdersUpdater: (fn: ((data: OrdersData) => void) | null) => void;
};

const CancelOrdersContext = createContext<CancelOrdersContextValue | null>(null);

const CANCEL_POLL_MS = 5_000;
const CANCEL_POLL_MAX = 24; // ~2 min

export function CancelOrdersProvider({ children }: { children: ReactNode }) {
  const [pendingCancels, setPendingCancels] = useState<Map<number, OpenOrder>>(new Map());
  const [cancelledOrders, setCancelledOrders] = useState<CancelledOrder[]>([]);

  const pollTimersRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const pollCountsRef = useRef<Map<number, number>>(new Map());
  const notificationsRef = useRef<Notification[]>([]);
  const ordersUpdaterRef = useRef<((data: OrdersData) => void) | null>(null);

  const pushNotification = useCallback((n: Notification) => {
    notificationsRef.current.push(n);
  }, []);

  const startCancelPoll = useCallback((order: OpenOrder) => {
    const permId = order.permId;
    pollCountsRef.current.set(permId, 0);

    const interval = setInterval(async () => {
      const count = (pollCountsRef.current.get(permId) ?? 0) + 1;
      pollCountsRef.current.set(permId, count);

      try {
        const res = await fetch("/api/orders", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as OrdersData;

        const stillOpen = data.open_orders.some(
          (o) => o.permId === permId || (o.orderId === order.orderId && order.orderId !== 0),
        );

        if (!stillOpen) {
          clearInterval(interval);
          pollTimersRef.current.delete(permId);
          pollCountsRef.current.delete(permId);

          setPendingCancels((prev) => {
            const next = new Map(prev);
            next.delete(permId);
            return next;
          });
          setCancelledOrders((prev) => [
            {
              permId,
              symbol: order.symbol,
              action: order.action,
              orderType: order.orderType,
              totalQuantity: order.totalQuantity,
              limitPrice: order.limitPrice,
              cancelledAt: new Date().toISOString(),
            },
            ...prev,
          ]);

          ordersUpdaterRef.current?.(data);
          pushNotification({ type: "success", message: `${order.symbol} order cancelled` });
        } else if (count >= CANCEL_POLL_MAX) {
          clearInterval(interval);
          pollTimersRef.current.delete(permId);
          pollCountsRef.current.delete(permId);
          setPendingCancels((prev) => {
            const next = new Map(prev);
            next.delete(permId);
            return next;
          });
          ordersUpdaterRef.current?.(data);
          pushNotification({
            type: "error",
            message: `${order.symbol} cancellation failed — order still open. Try cancelling again.`,
            duration: 0,
          });
        } else {
          ordersUpdaterRef.current?.(data);
        }
      } catch {
        // Network error, keep polling
      }
    }, CANCEL_POLL_MS);

    pollTimersRef.current.set(permId, interval);
  }, [pushNotification]);

  const requestCancel = useCallback(async (order: OpenOrder) => {
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, permId: order.permId }),
      });
      const json = await res.json();
      if (!res.ok) {
        pushNotification({ type: "error", message: json.error || "Cancel failed" });
      } else {
        setPendingCancels((prev) => new Map(prev).set(order.permId, order));
        startCancelPoll(order);
        if (json.orders) ordersUpdaterRef.current?.(json.orders);
      }
    } catch {
      pushNotification({ type: "error", message: "Cancel request failed" });
    }
  }, [pushNotification, startCancelPoll]);

  const drainNotifications = useCallback((): Notification[] => {
    if (notificationsRef.current.length === 0) return [];
    const batch = notificationsRef.current;
    notificationsRef.current = [];
    return batch;
  }, []);

  const setOrdersUpdater = useCallback((fn: ((data: OrdersData) => void) | null) => {
    ordersUpdaterRef.current = fn;
  }, []);

  // Cleanup all poll intervals on unmount
  useEffect(() => {
    return () => {
      for (const timer of pollTimersRef.current.values()) {
        clearInterval(timer);
      }
    };
  }, []);

  return (
    <CancelOrdersContext.Provider
      value={{ pendingCancels, cancelledOrders, requestCancel, drainNotifications, setOrdersUpdater }}
    >
      {children}
    </CancelOrdersContext.Provider>
  );
}

export function useCancelOrders(): CancelOrdersContextValue {
  const ctx = useContext(CancelOrdersContext);
  if (!ctx) throw new Error("useCancelOrders must be used within CancelOrdersProvider");
  return ctx;
}
