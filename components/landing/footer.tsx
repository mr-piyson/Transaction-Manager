'use client';

import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/Logo';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Dashboard', href: '/app' },
      { label: 'Invoices', href: '/erp/invoices' },
      { label: 'Inventory', href: '/erp/stock' },
      { label: 'Reports', href: '/erp/reports' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Customers', href: '/erp/customers' },
      { label: 'Suppliers', href: '/erp/suppliers' },
      { label: 'Purchase Orders', href: '/erp/purchase-orders' },
      { label: 'Contracts', href: '/erp/contracts' },
      { label: 'Warehouses', href: '/erp/warehouses' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Sign In', href: '/auth' },
      { label: 'Get Started', href: '/auth' },
      { label: 'Setup Wizard', href: '/setup' },
      { label: 'Settings', href: '/settings' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo width="24" height="24" />
              <span className="text-sm font-semibold">Transaction Manager</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open-source ERP for invoicing, inventory, purchasing, and financial reporting.
              Self-hosted and customizable.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Open Source
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-sm font-semibold">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Transaction Manager. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Built with Next.js & Prisma</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
