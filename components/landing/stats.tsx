'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useCountAnimation } from '@/hooks/use-count-animation';
import { BarChart3, FileText, Users, ShieldCheck } from 'lucide-react';

const stats = [
  { value: 50, suffix: 'K+', label: 'Invoices Processed', icon: FileText },
  { value: 10, suffix: 'K+', label: 'Active Users', icon: Users },
  { value: 99.9, suffix: '%', label: 'Uptime Guaranteed', icon: ShieldCheck, decimals: 1 },
  { value: 500, suffix: 'K+', label: 'Transactions Tracked', icon: BarChart3 },
];

function AnimatedStat({
  value,
  suffix,
  label,
  icon: Icon,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  label: string;
  icon: React.ElementType;
  decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const count = useCountAnimation(isInView ? value : 0, decimals);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-xl border bg-card text-primary">
        <Icon className="size-6" />
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {count}
        {suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}

export default function Stats() {
  return (
    <section id="stats" className="relative border-y border-border/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          {stats.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
