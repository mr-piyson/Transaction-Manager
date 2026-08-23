"use client";

import CTA from "@/components/landing/cta";
import Features from "@/components/landing/features";
import Footer from "@/components/landing/footer";
import Header from "@/components/landing/header";
import Hero from "@/components/landing/hero";
import Particles from "@/components/landing/particles";
import Stats from "@/components/landing/stats";
import WhyUs from "@/components/landing/why-us";

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
