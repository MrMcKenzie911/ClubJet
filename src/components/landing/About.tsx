export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-white">About Club Aureus</h2>
          <p className="mt-3 text-gray-300">
            Club Aureus is a private, member‑referred investment platform. We focus on disciplined process,
            clear approvals, and capital stewardship—delivering a refined experience with transparency at every step.
          </p>
          <p className="mt-3 text-gray-300">
            Our approach emphasizes predictable operations, bank‑level security, and simple choices: a fixed‑rate
            membership for steady monthly payouts, or a performance‑based variable membership that participates in monthly results.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-white font-semibold">Key Highlights</h3>
          <ul className="mt-3 list-disc pl-5 text-gray-300 space-y-2">
            <li>
              Fixed Memberships (monthly payout):
              1.00% (standard access), 1.125% (enhanced access), 1.25% (preferred access).
              Higher tiers generally carry longer notice/holding parameters.
            </li>
            <li>
              Variable Memberships: performance‑based, calculated monthly; payout is a share of gross monthly results
              after finalized admin actions. No fixed rate.
            </li>
            <li>Structured timing: requests by the 1st, typical release window by the 10th (subject to approval and status).</li>
            <li>Secure data with RLS, audit trails, and transparent admin approvals.</li>
          </ul>
          <p className="mt-4 text-xs text-gray-400">Investment products are not FDIC insured and involve risk of loss.</p>
        </div>
      </div>
    </section>
  );
}

