'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Rocket } from 'lucide-react';
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

          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Rocket className="size-6" />
          </div>

          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Start managing your business today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Set up in minutes. No credit card required. Self-host or use our managed platform —
            the choice is yours.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth">
              <Button size="lg" className="gap-2 text-base">
                Get Started Free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="outline" size="lg" className="text-base">
                View Live Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
