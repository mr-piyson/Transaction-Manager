"use client";
import { createContext, useContext, useState } from "react";

type ToolbarContextType = {
  setSlot: (node: React.ReactNode) => void;
  clearSlot: () => void;
  slot: React.ReactNode;
};

const ToolbarContext = createContext<ToolbarContextType | null>(null);

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlotState] = useState<React.ReactNode>(null);

  function setSlot(node: React.ReactNode) {
    setSlotState(node);
  }

  function clearSlot() {
    setSlotState(null);
  }

  return <ToolbarContext.Provider value={{ slot, setSlot, clearSlot }}>{children}</ToolbarContext.Provider>;
}

export function useToolbar() {
  const ctx = useContext(ToolbarContext);
  if (!ctx) throw new Error("useDynamicSlot must be used inside ToolbarProvider");
  return ctx;
}
