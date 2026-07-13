'use client';

import { motion } from 'framer-motion';
import { FileText, Users, Globe, Shield } from 'lucide-react';

const stats = [
  { icon: FileText, value: '10+', label: 'ERP Modules', description: 'Invoices, Stock, POs & more' },
  { icon: Users, value: 'Multi', label: 'User Roles', description: 'Role-based access control' },
  { icon: Globe, value: '2', label: 'Languages', description: 'English & Arabic (RTL)' },
  { icon: Shield, value: '100%', label: 'Open Source', description: 'Self-host & customize' },
];

export default function Stats() {
  return (
    <section className="relative border-y border-border/40 bg-card/30 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-sm font-medium">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
