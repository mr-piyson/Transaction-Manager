"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FabConfig {
  /** Custom icon for the default FAB button */
  icon?: React.ReactNode;
  /** Click handler for the default FAB button */
  onClick?: () => void;
  /** Accessibility label for the FAB */
  label?: string;
  /** Whether the FAB is visible */
  visible?: boolean;
  /**
   * Custom render function for complete control over FAB content.
   * When provided, this overrides icon/onClick and renders whatever you return.
   */
  render?: () => React.ReactNode;
}

interface FabContextValue {
  config: FabConfig;
  setFabConfig: (config: Partial<FabConfig>) => void;
  resetFabConfig: () => void;
}

const defaultConfig: FabConfig = {
  icon: <Plus className="size-6" />,
  onClick: () => {},
  label: "Primary action",
  visible: true,
  render: undefined,
};

const FabContext = React.createContext<FabContextValue | undefined>(undefined);

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<FabConfig>(defaultConfig);

  const setFabConfig = React.useCallback((newConfig: Partial<FabConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetFabConfig = React.useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  const value = React.useMemo(() => ({ config, setFabConfig, resetFabConfig }), [config, setFabConfig, resetFabConfig]);

  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

export function useFab() {
  const context = React.useContext(FabContext);
  if (!context) {
    throw new Error("useFab must be used within a FabProvider");
  }
  return context;
}

/**
 * Hook to configure FAB for a specific page/route
 * Automatically resets when the component unmounts
 */
export function useFabConfig(config: Partial<FabConfig>) {
  const { setFabConfig, resetFabConfig } = useFab();

  React.useEffect(() => {
    setFabConfig(config);
    return () => resetFabConfig();
  }, [config]); // Only re-run if these stable values change

  // Return a function to update the config dynamically
  return setFabConfig;
}
