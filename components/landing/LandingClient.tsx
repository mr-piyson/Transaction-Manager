'use client';

import Particles from '@/components/landing/particles';
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import CTA from '@/components/landing/cta';
import Footer from '@/components/landing/footer';

export default function LandingClient() {
  return (
    <>
      <Particles />
      <Header />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
