import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookType,
  Building2,
  Coins,
  Layers,
  LogOut,
  Palette,
  Percent,
  Shield,
  User,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export const NAV_ITEMS = [
  { id: 'general', labelKey: 'settings.general', href: '/settings/general', icon: Building2 },
  { id: 'financial', labelKey: 'settings.financial', href: '/settings/financial', icon: Coins },
  { id: 'tax-rates', labelKey: 'settings.defaultTaxRate', href: '/settings/tax-rates', icon: Percent },
  { id: 'categories', labelKey: 'items.category', href: '/settings/categories', icon: Layers },
  {
    id: 'chart-of-accounts',
    labelKey: 'settings.chartOfAccounts',
    href: '/settings/chart-of-accounts',
    icon: BookType,
  },
  { id: 'sessions', labelKey: 'settings.sessions', href: '/settings/sessions', icon: LogOut },
  { id: 'appearance', labelKey: 'settings.appearance', href: '/settings/appearance', icon: Palette },
  { id: 'notifications', labelKey: 'settings.notifications', href: '/settings/notifications', icon: Bell },
  { id: 'user', labelKey: 'auth.name', href: '/settings/user', icon: User },
  { id: 'users', labelKey: 'users.title', href: '/settings/users', icon: Users },
  { id: 'permissions', labelKey: 'users.permissionsPageTitle', href: '/settings/permissions', icon: Shield },
] as const satisfies {
  id: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
}[];

export interface OrgData {
  name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  crNumber: string | null;
  currency: string | null;
  vatRegistered: boolean | null;
  paymentTermsDays: number | null;
  defaultTermsText: string | null;
  invoiceFooter: string | null;
  fiscalYearStartMonth: number | null;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
