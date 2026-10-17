"use client";

import CTA from "./cta";
import Features from "./features";
import Footer from "./footer";
import Header from "./header";
import Hero from "./hero";
import Particles from "./particles";
import Stats from "./stats";
import WhyUs from "./why-us";

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
