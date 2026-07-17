/**
 * System role definitions — single source of truth.
 * Used by: prisma/seed.ts, setup.router.ts, migrate-roles.ts
 */

export interface SystemRoleDefinition {
  systemKey: string;
  name: string;
  icon: string;
  color: string;
}

export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  { systemKey: 'OWNER',      name: 'Owner',      icon: 'crown',      color: '#eab308' },
  { systemKey: 'ADMIN',      name: 'Admin',      icon: 'shield',     color: '#3b82f6' },
  { systemKey: 'MANAGER',    name: 'Manager',    icon: 'briefcase',  color: '#8b5cf6' },
  { systemKey: 'ACCOUNTANT', name: 'Accountant', icon: 'calculator', color: '#06b6d4' },
  { systemKey: 'SALES',      name: 'Sales',      icon: 'trending-up',color: '#10b981' },
  { systemKey: 'WAREHOUSE',  name: 'Warehouse',  icon: 'package',    color: '#f59e0b' },
  { systemKey: 'VIEWER',     name: 'Viewer',     icon: 'eye',        color: '#6b7280' },
] as const;
