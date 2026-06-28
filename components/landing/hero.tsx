'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const routes = [
  { label: 'Invoices', href: '/app/invoices' },
  { label: 'Customers', href: '/app/customers' },
  { label: 'Suppliers', href: '/app/suppliers' },
  { label: 'Stock', href: '/app/stock' },
  { label: 'Reports', href: '/app/reports' },
  { label: 'Purchase Orders', href: '/app/purchase-orders' },
  { label: 'Contracts', href: '/app/contracts' },
  { label: 'Warehouses', href: '/app/warehouses' },
];

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-4rem)] items-center overflow-hidden pt-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--color-info)_0%,_transparent_50%)] opacity-5" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <motion.div variants={itemVariants} className="mb-6 flex justify-center">
            <Badge variant="outline" className="gap-1.5 px-4 py-1.5 text-xs">
              <Sparkles className="size-3.5 text-info" />
              Open-source ERP — Invoices, Inventory, Purchasing & Reports
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Manage Your
            <span className="bg-linear-to-r from-primary to-info bg-clip-text text-transparent">
              {' '}Transactions
            </span>
            , Grow Your Business
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            A complete ERP platform for invoicing, inventory, purchasing, and financial reporting.
            Built for teams that need precision, control, and scale.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/auth">
              <Button size="lg" className="gap-2 text-base">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-base">
                Explore Features
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          className="mx-auto mt-16 flex max-w-4xl flex-wrap justify-center gap-2"
        >
          {routes.map((route) => (
            <Link key={route.href} href={route.href}>
              <Badge
                variant="secondary"
                className="px-3 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {route.label}
              </Badge>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
