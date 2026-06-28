'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Package,
  ShoppingCart,
  FileCheck,
  BarChart3,
  Globe,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    title: 'Invoice Management',
    description:
      'Create, send, and track invoices with automated payment reconciliation and AR aging reports.',
    icon: FileText,
  },
  {
    title: 'Inventory Control',
    description:
      'Real-time stock tracking across warehouses with automated movement logs and low-stock alerts.',
    icon: Package,
  },
  {
    title: 'Purchase Orders',
    description:
      'End-to-end procurement workflow from PO creation to receiving and payment tracking.',
    icon: ShoppingCart,
  },
  {
    title: 'Contracts',
    description:
      'Manage customer and supplier contracts with approval workflows and renewal tracking.',
    icon: FileCheck,
  },
  {
    title: 'Financial Reports',
    description:
      'Comprehensive dashboards with sales summaries, expense tracking, and profit analysis.',
    icon: BarChart3,
  },
  {
    title: 'Multi-currency & i18n',
    description:
      'Full Arabic and English support with RTL layouts and multi-currency transaction handling.',
    icon: Globe,
  },
  {
    title: 'Multi-tenant Architecture',
    description:
      'Secure organization-level isolation with role-based access control and audit logging.',
    icon: Building2,
  },
  {
    title: 'Enterprise Security',
    description:
      'JWT authentication, CASL authorization, optimistic locking, and immutable audit trails.',
    icon: ShieldCheck,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={cardVariants}>
                <Card className="group h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-card text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
