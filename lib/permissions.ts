// lib/auth/permissions.ts
import { User, Invoice, Customer, InventoryItem, Contract } from '@prisma/client';
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery, Subjects } from '@casl/prisma';

// 1. Define Actions as a standalone type
export type AppActions = 'manage' | 'read' | 'create' | 'update' | 'delete';

// 2. Define Subjects (keep your existing logic)
export type AppSubjects =
  | Subjects<{
      User: User;
      Invoice: Invoice;
      Customer: Customer;
      inventoryItems: InventoryItem;
      Contracts: Contract;
    }>
  | 'all';

// 3. Use them in your Ability type
export type AppAbility = PureAbility<[AppActions, AppSubjects], PrismaQuery>;

/**
 * 1. MANUAL PRISMA FILTERS (For Readability/Performance)
 * Use these in your prisma.findMany({ where: ... })
 */
export const PrismaFilters = {
  Invoice: (user: User) => {
    if (user.role === 'ADMIN') return {};
    return { userId: user.id }; // Non-admins only see their own
  },
  Customer: (user: User) => {
    return {}; // Everyone can see all customers in this business logic
  },
};

/**
 * 2. CASL RULES (For UI and Server Actions)
 * Use these for can('update', invoice)
 */
export function defineAbilitiesFor(user: User) {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  if (user.role === 'ADMIN') {
    can('manage', 'all');
  } else {
    // Sync this logic with PrismaFilters above
    can('read', 'Invoice', PrismaFilters.Invoice(user));
    can('update', 'Invoice', PrismaFilters.Invoice(user));
    can('read', 'Customer', PrismaFilters.Customer(user));
  }

  return build();
}
