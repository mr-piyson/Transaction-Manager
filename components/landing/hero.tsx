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
              Enterprise-grade ERP for modern businesses
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
                Get Started Free
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
          className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { label: 'Invoices', value: '10K+' },
            { label: 'Users', value: '5K+' },
            { label: 'Countries', value: '40+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-card/50 p-4 text-center backdrop-blur-sm"
            >
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
