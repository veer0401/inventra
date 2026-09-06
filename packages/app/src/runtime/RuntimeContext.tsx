import React, { createContext, useContext, useMemo } from "react";
import type { IRuntimeAdapter } from "./types";
import { WebRuntimeAdapter } from "./WebRuntimeAdapter";

const RuntimeContext = createContext<IRuntimeAdapter>(new WebRuntimeAdapter());

export interface RuntimeProviderProps {
  adapter?: IRuntimeAdapter;
  children: React.ReactNode;
}

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({ adapter, children }) => {
  const runtime = useMemo(() => adapter || new WebRuntimeAdapter(), [adapter]);

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
};

export function useRuntimeAdapter(): IRuntimeAdapter {
  return useContext(RuntimeContext);
}
