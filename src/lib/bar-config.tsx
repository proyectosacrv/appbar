"use client";

import { createContext, useContext } from "react";

export interface BarConfig {
  barId: string;
  barSlug: string;
  cartMaxQuantity: number;
  oldOrderThresholdMin: number;
}

const DEFAULT_CONFIG: BarConfig = {
  barId: "",
  barSlug: "",
  cartMaxQuantity: 20,
  oldOrderThresholdMin: 15,
};

const BarConfigContext = createContext<BarConfig>(DEFAULT_CONFIG);

export function BarConfigProvider({
  config,
  children,
}: {
  config: BarConfig;
  children: React.ReactNode;
}) {
  return (
    <BarConfigContext.Provider value={config}>
      {children}
    </BarConfigContext.Provider>
  );
}

export function useBarConfig(): BarConfig {
  return useContext(BarConfigContext);
}
