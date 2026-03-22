// components/AbilityProvider.tsx
'use client';

import { AppAbility } from '@/lib/permissions';
import { createContext, useContext } from 'react';

const AbilityContext = createContext<AppAbility>(null!);

export const useAbility = () => useContext(AbilityContext);

export function AbilityProvider({
  ability,
  children,
}: {
  ability: AppAbility;
  children: React.ReactNode;
}) {
  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
