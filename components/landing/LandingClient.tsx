'use client';

import Particles from '@/components/landing/particles';
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Stats from '@/components/landing/stats';
import WhyUs from '@/components/landing/why-us';
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
        <Stats />
        <Features />
        <WhyUs />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
