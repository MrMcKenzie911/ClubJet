"use client";

import { useState } from "react";
import SignupModal from "@/components/auth/SignupModal";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import InvestmentOptions from "@/components/landing/InvestmentOptions";
import FeaturesRow from "@/components/landing/FeaturesRow";
import NoticeRelease from "@/components/landing/NoticeRelease";
import About from "@/components/landing/About";
import ContactAlt from "@/components/landing/ContactAlt";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black">
      <Navbar onOpenSignup={() => setOpen(true)} />
      <Hero onOpenSignup={() => setOpen(true)} />
      <FeaturesRow />
      <InvestmentOptions onOpenSignup={() => setOpen(true)} />
      <NoticeRelease />
      <About />
      <ContactAlt onOpenSignup={() => setOpen(true)} />
      <Footer />
      <SignupModal open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
