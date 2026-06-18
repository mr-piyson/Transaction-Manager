import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookType,
  Building2,
  Coins,
  LogOut,
  Palette,
  Percent,
  User,
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
  { id: 'general', label: 'General', href: '/app/settings/general', icon: Building2 },
  { id: 'financial', label: 'Financial', href: '/app/settings/financial', icon: Coins },
  { id: 'tax-rates', label: 'Tax Rates', href: '/app/settings/tax-rates', icon: Percent },
  {
    id: 'chart-of-accounts',
    label: 'Chart of Accounts',
    href: '/app/settings/chart-of-accounts',
    icon: BookType,
  },
  { id: 'sessions', label: 'Sessions', href: '/app/settings/sessions', icon: LogOut },
  { id: 'appearance', label: 'Appearance', href: '/app/settings/appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', href: '/app/settings/notifications', icon: Bell },
  { id: 'user', label: 'User', href: '/app/settings/user', icon: User },
] as const satisfies {
  id: string;
  label: string;
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
