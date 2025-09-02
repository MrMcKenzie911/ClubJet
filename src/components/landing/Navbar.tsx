"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar({ onOpenSignup }: { onOpenSignup: () => void }) {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/40 border-b border-white/10">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="Club Jet" width={126} height={28} priority className="h-[2.3rem] w-auto object-contain" />
          <span className="sr-only">Club Jet</span>
          <span className="hidden sm:inline-block ml-2 text-xs text-gray-400">Exclusive Asset Growth</span>
        </div>
        <div className="hidden sm:flex items-center gap-8 text-sm sm:-ml-10">
          <a href="#services" className="text-gray-300 hover:text-white transition">Services</a>
          <a href="#about" className="text-gray-300 hover:text-white transition">About</a>
          <a href="#contact" className="text-gray-300 hover:text-white transition">Contact</a>
        </div>
        <div className="flex items-center gap-3">
          <Link prefetch href="/login" className="text-gray-300 hover:text-white text-sm" aria-label="Go to login">Login</Link>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onOpenSignup}
            className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
          >
            Get Started
          </motion.button>
        </div>
      </div>
    </nav>
  );
}

