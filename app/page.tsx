'use client';

import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import Stats from '@/components/landing/stats';
import CTA from '@/components/landing/cta';
import Footer from '@/components/landing/footer';

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
