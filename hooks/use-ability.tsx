// components/AbilityProvider.tsx
'use client';

import { AppAbilityType } from '@/lib/abilities';
import { createContext, useContext } from 'react';

const AbilityContext = createContext<AppAbilityType>(null!);

export const useAbility = () => useContext(AbilityContext);

export function AbilityProvider({
  ability,
  children,
}: {
  ability: AppAbilityType;
  children: React.ReactNode;
}) {
  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}
