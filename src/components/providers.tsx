"use client";

import { RealtimeProvider } from "@/lib/realtime-context";
import { TimeRangeProvider } from "@/lib/time-range-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <TimeRangeProvider>
        {children}
      </TimeRangeProvider>
    </RealtimeProvider>
  );
}

