import { NAV_ITEMS } from '@/lib/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export { NAV_ITEMS };

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
