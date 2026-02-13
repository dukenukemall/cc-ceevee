"use client";

import { QueryProvider } from "./QueryProvider";
import { ReduxProvider } from "./ReduxProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
