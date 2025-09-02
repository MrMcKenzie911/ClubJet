export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-white">About Club Jet</h2>
          <p className="mt-3 text-gray-300">
            Club Jet is a private investment platform focused on premium aviation assets. We combine professional
            management, transparent workflows, and institutional‑grade security to deliver a refined investor experience.
          </p>
          <p className="mt-3 text-gray-300">
            Led by CEO Richard Nuffer, our approach emphasizes clear terms, bank‑level security, and an approval workflow that
            keeps investors informed. Users select either a fixed “Lender” account or a performance‑based “Network” account.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-white font-semibold">Key Highlights</h3>
          <ul className="mt-3 list-disc pl-5 text-gray-300 space-y-2">
            <li>Two account types: Lender (1.00% / 1.125% / 1.25%) and Network (50% of gross monthly return).</li>
            <li>Structured withdrawal schedule: notice by the 1st, fund release by the 10th.</li>
            <li>Secure data with RLS and detailed audit trails; transparent admin approvals.</li>
          </ul>
          <p className="mt-4 text-xs text-gray-400">Investment products are not FDIC insured and involve risk of loss.</p>
        </div>
      </div>
    </section>
  );
}

