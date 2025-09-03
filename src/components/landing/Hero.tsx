"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Hero({ onOpenSignup }: { onOpenSignup: () => void }) {
  return (
    <section className="relative overflow-hidden min-h-[100svh] pt-16 flex items-center">
      {/* Background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover object-center"
        src="/media/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      {/* Dark + gold overlays for readability */}
      <div className="absolute inset-0 bg-black/65" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_-20%,rgba(252,187,0,0.18),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-[#0b0f14]/80 border border-amber-400/60 flex items-center justify-center shadow-[0_0_40px_rgba(252,187,0,0.25)]">
              <Image src="/brand/new-logo.jpg" alt="Club Aureus" width={40} height={40} />
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full">
            <p className="mx-auto inline-block rounded-full border border-amber-400/30 bg-white/5 px-3 py-1 text-xs text-amber-300">
              Premium Asset Management Platform
            </p>
            <h1 className="mx-auto mt-5 text-[6.3vw] sm:text-[3.4rem] font-light tracking-tight text-white whitespace-normal sm:whitespace-nowrap leading-tight">
              A Different Altitude. A Different Perspective.
            </h1>
            <p className="mt-5 max-w-3xl mx-auto text-center text-gray-300">
              Own a share of the inaccessible, curated for the few where membership isn&apos;t purchased, it&apos;s referred
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button whileTap={{ scale: 0.98 }} onClick={onOpenSignup}
                className="rounded-md bg-amber-400 px-6 py-3 font-semibold text-black hover:bg-amber-300 transition shadow-xl shadow-amber-400/15">
                Start Investing
              </motion.button>
              <a href="#services" className="rounded-md border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10 transition">
                Learn More
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

