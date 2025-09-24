export default function Services() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">Services</h2>
      <p className="mt-2 text-center text-gray-400">Choose a structure that fits your goals - fixed monthly payouts or performance-based participation.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-white font-semibold">Fixed Accounts ("Fixed Memberships")</h3>
          <p className="mt-2 text-sm text-gray-300">Designed for predictability - steady monthly payouts at published rates.</p>
          <ul className="mt-3 list-disc pl-5 text-gray-300 space-y-2 text-sm">
            <li>Monthly payout options: 1.00%, 1.125%, or 1.25%.</li>
            <li>Higher tiers generally carry longer notice/holding parameters.</li>
            <li>Structured timing: request by the 1st, typical release window by the 10th.</li>
            <li>Admin approvals, audit trails, and live KPI updates.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-white font-semibold">Variable Accounts ("Variable Memberships")</h3>
          <p className="mt-2 text-sm text-gray-300">Participate in monthly performance with no fixed rate.</p>
          <ul className="mt-3 list-disc pl-5 text-gray-300 space-y-2 text-sm">
            <li>Payout is a share of gross monthly results once finalized by admin.</li>
            <li>Flexible by design; results may vary by month.</li>
            <li>Real-time visibility with transparent admin actions and audit trails.</li>
            <li>Same structured timing window for requests and releases.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

