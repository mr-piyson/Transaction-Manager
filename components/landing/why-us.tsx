'use client';

import { motion } from 'framer-motion';
import { Layers, ArrowRightLeft, Palette, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const reasons = [
  {
    icon: Layers,
    title: 'All-in-One Platform',
    description:
      'Replace disconnected spreadsheets and tools with a unified system for invoices, inventory, purchasing, and reporting.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: ArrowRightLeft,
    title: 'Multi-Currency & i18n',
    description:
      'Full English and Arabic support with RTL layout, multi-currency transactions, and localized formatting.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Palette,
    title: 'Dark Mode & Themes',
    description:
      'Light, dark, and system themes with customizable accent colors. Built for comfort during long work sessions.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Lock,
    title: 'Role-Based Access',
    description:
      'Granular permissions per module. Control who can view, create, edit, or delete across your organization.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

export default function WhyUs() {
  return (
    <section className="relative py-24">
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
            Why Transaction Manager?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Built from the ground up for businesses that need a powerful, self-hosted ERP
            without the enterprise price tag.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-4"
              >
                <div
                  className={cn(
                    'flex size-11 items-center justify-center rounded-xl',
                    reason.bg,
                    reason.color
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {reason.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
