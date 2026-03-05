"use client";

import { OrderActionsProvider } from "@/lib/OrderActionsContext";
import { TickerDetailProvider } from "@/lib/TickerDetailContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OrderActionsProvider>
      <TickerDetailProvider>{children}</TickerDetailProvider>
    </OrderActionsProvider>
  );
}
