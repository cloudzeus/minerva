"use client";

import * as React from "react";

interface TimeRangeContextType {
  timeRange: string;
  setTimeRange: (range: string) => void;
}

const defaultContextValue: TimeRangeContextType = {
  timeRange: "24h", // Default to 24 hours
  setTimeRange: () => {
    console.warn("setTimeRange called outside TimeRangeProvider");
  },
};

const TimeRangeContext = React.createContext<TimeRangeContextType>(defaultContextValue);

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [timeRange, setTimeRange] = React.useState<string>("24h");

  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  const context = React.useContext(TimeRangeContext);
  // Return default context if provider is not available (shouldn't happen, but defensive)
  return context || defaultContextValue;
}

