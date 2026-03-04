"use client";

import { CancelOrdersProvider } from "@/lib/CancelOrdersContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CancelOrdersProvider>{children}</CancelOrdersProvider>;
}
