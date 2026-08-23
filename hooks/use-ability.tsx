// components/AbilityProvider.tsx
"use client";

import { createContext, useContext } from "react";
import type { AppAbilityType } from "@/lib/abilities";

const AbilityContext = createContext<AppAbilityType | null>(null);

export const useAbility = () => useContext(AbilityContext);

export function AbilityProvider({
  ability,
  children,
}: {
  ability: AppAbilityType;
  children: React.ReactNode;
}) {
  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
