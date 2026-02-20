"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface HeaderConfig {
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
  showBorder?: boolean;
  sticky?: boolean;
  transparent?: boolean;
}

interface HeaderContextType {
  config: HeaderConfig;
  configureHeader: (config: HeaderConfig) => void;
  resetHeader: () => void;
}

const defaultConfig: HeaderConfig = {
  leftContent: null,
  centerContent: null,
  rightContent: null,
  className: "",
  showBorder: true,
  sticky: true,
  transparent: false,
};

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>(defaultConfig);

  const configureHeader = useCallback((newConfig: HeaderConfig) => {
    setConfig(newConfig);
  }, []);

  const resetHeader = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return <HeaderContext.Provider value={{ config, configureHeader, resetHeader }}>{children}</HeaderContext.Provider>;
}

export function useHeader() {
  const context = useContext(HeaderContext);

  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }

  return context;
}
