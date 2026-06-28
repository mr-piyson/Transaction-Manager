'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTA() {
  return (
    <section id="cta" className="relative py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_60%)] opacity-5" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center shadow-sm sm:px-16"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--color-info)_0%,_transparent_60%)] opacity-10" />

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to streamline your operations?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Get started with Transaction Manager — invoices, inventory, purchasing, and
            financial reports in one platform.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth">
              <Button size="lg" className="gap-2 text-base">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="outline" size="lg" className="text-base">
                View Dashboard
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
