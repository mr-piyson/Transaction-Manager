'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  Package,
  ShoppingCart,
  FileCheck,
  BarChart3,
  Globe,
  Users,
  Warehouse,
  Settings,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    title: 'Invoices',
    description:
      'Full invoice lifecycle — create, send, track, cancel. AR aging reports and payment reconciliation built in.',
    icon: FileText,
    href: '/erp/invoices',
    color: 'blue',
  },
  {
    title: 'Customers',
    description:
      'Manage customer contacts, transaction history, and outstanding balances in one place.',
    icon: Users,
    href: '/erp/customers',
    color: 'emerald',
  },
  {
    title: 'Suppliers',
    description:
      'Supplier directory with item assignments, purchase history, and payment tracking.',
    icon: Building2,
    href: '/erp/suppliers',
    color: 'violet',
  },
  {
    title: 'Stock & Inventory',
    description:
      'Real-time stock levels per warehouse with movements, adjustments, transfers, and low-stock tracking.',
    icon: Package,
    href: '/erp/stock',
    color: 'amber',
  },
  {
    title: 'Warehouses',
    description:
      'Multi-warehouse inventory management with per-location stock visibility.',
    icon: Warehouse,
    href: '/erp/warehouses',
    color: 'cyan',
  },
  {
    title: 'Purchase Orders',
    description:
      'End-to-end procurement from PO creation through receiving, payments, and cancellation.',
    icon: ShoppingCart,
    href: '/erp/purchase-orders',
    color: 'rose',
  },
  {
    title: 'Contracts',
    description:
      'Customer and supplier contract management with renewal tracking.',
    icon: FileCheck,
    href: '/erp/contracts',
    color: 'indigo',
  },
  {
    title: 'Reports',
    description:
      'Dashboard summaries, sales analytics, inventory reports, and AR aging at a glance.',
    icon: BarChart3,
    href: '/erp/reports',
    color: 'orange',
  },
  {
    title: 'Multi-currency & i18n',
    description:
      'Full English and Arabic support with RTL layout and multi-currency transaction handling.',
    icon: Globe,
    href: '/settings/general',
    color: 'teal',
  },
  {
    title: 'Settings',
    description:
      'Tax rates, chart of accounts, categories, financial settings, appearance, and user preferences.',
    icon: Settings,
    href: '/settings',
    color: 'slate',
  },
];

const palettes: Record<string, { border: string; iconBg: string; iconRing: string; glow: string; watermark: string }> = {
  blue: {
    border: 'border-blue-500/20 group-hover:border-blue-500/40',
    iconBg: 'bg-linear-to-br from-blue-500 to-blue-600',
    iconRing: 'ring-blue-500/20',
    glow: 'group-hover:shadow-blue-500/10',
    watermark: 'text-blue-500/5',
  },
  emerald: {
    border: 'border-emerald-500/20 group-hover:border-emerald-500/40',
    iconBg: 'bg-linear-to-br from-emerald-500 to-emerald-600',
    iconRing: 'ring-emerald-500/20',
    glow: 'group-hover:shadow-emerald-500/10',
    watermark: 'text-emerald-500/5',
  },
  violet: {
    border: 'border-violet-500/20 group-hover:border-violet-500/40',
    iconBg: 'bg-linear-to-br from-violet-500 to-violet-600',
    iconRing: 'ring-violet-500/20',
    glow: 'group-hover:shadow-violet-500/10',
    watermark: 'text-violet-500/5',
  },
  amber: {
    border: 'border-amber-500/20 group-hover:border-amber-500/40',
    iconBg: 'bg-linear-to-br from-amber-500 to-amber-600',
    iconRing: 'ring-amber-500/20',
    glow: 'group-hover:shadow-amber-500/10',
    watermark: 'text-amber-500/5',
  },
  cyan: {
    border: 'border-cyan-500/20 group-hover:border-cyan-500/40',
    iconBg: 'bg-linear-to-br from-cyan-500 to-cyan-600',
    iconRing: 'ring-cyan-500/20',
    glow: 'group-hover:shadow-cyan-500/10',
    watermark: 'text-cyan-500/5',
  },
  rose: {
    border: 'border-rose-500/20 group-hover:border-rose-500/40',
    iconBg: 'bg-linear-to-br from-rose-500 to-rose-600',
    iconRing: 'ring-rose-500/20',
    glow: 'group-hover:shadow-rose-500/10',
    watermark: 'text-rose-500/5',
  },
  indigo: {
    border: 'border-indigo-500/20 group-hover:border-indigo-500/40',
    iconBg: 'bg-linear-to-br from-indigo-500 to-indigo-600',
    iconRing: 'ring-indigo-500/20',
    glow: 'group-hover:shadow-indigo-500/10',
    watermark: 'text-indigo-500/5',
  },
  orange: {
    border: 'border-orange-500/20 group-hover:border-orange-500/40',
    iconBg: 'bg-linear-to-br from-orange-500 to-orange-600',
    iconRing: 'ring-orange-500/20',
    glow: 'group-hover:shadow-orange-500/10',
    watermark: 'text-orange-500/5',
  },
  teal: {
    border: 'border-teal-500/20 group-hover:border-teal-500/40',
    iconBg: 'bg-linear-to-br from-teal-500 to-teal-600',
    iconRing: 'ring-teal-500/20',
    glow: 'group-hover:shadow-teal-500/10',
    watermark: 'text-teal-500/5',
  },
  slate: {
    border: 'border-slate-500/20 group-hover:border-slate-500/40',
    iconBg: 'bg-linear-to-br from-slate-500 to-slate-600',
    iconRing: 'ring-slate-500/20',
    glow: 'group-hover:shadow-slate-500/10',
    watermark: 'text-slate-500/5',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--color-muted)_0%,_transparent_70%)] opacity-30" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run your business
          </h2>
          <p className="mt-4 text-muted-foreground">
            A complete ERP suite designed for growing companies that need powerful financial
            tools without the complexity.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            const palette = palettes[feature.color];
            return (
              <motion.div key={feature.title} variants={cardVariants}>
                <Link href={feature.href} className="group relative block h-full">
                  <div
                    className={cn(
                      'relative flex h-full flex-col gap-6 overflow-hidden rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-all duration-300',
                      palette.border,
                      palette.glow,
                      'hover:shadow-lg hover:-translate-y-0.5'
                    )}
                  >
                    <div className={cn('absolute -right-6 -top-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100', palette.watermark)}>
                      <Icon className="size-28" />
                    </div>

                    <div className={cn('flex size-11 items-center justify-center rounded-xl text-white shadow-xs ring-4', palette.iconBg, palette.iconRing)}>
                      <Icon className="size-5" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-semibold">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
