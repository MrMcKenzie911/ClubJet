import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between gap-6 whitespace-nowrap overflow-x-auto">
          <div className="flex items-center gap-3">
            <Image src="/brand/icon.png" alt="ClubJet" width={20} height={20} />
            <span className="text-sm text-white">Club Jet</span>
            <span className="ml-2 text-xs text-gray-400">Exclusive Asset Growth</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#privacy" className="hover:text-white transition">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition">Terms of Service</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
          </nav>

          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Club Jet. All rights reserved. Investment products are not FDIC insured and involve risk of loss.
          </p>
        </div>
      </div>
    </footer>
  );
}

