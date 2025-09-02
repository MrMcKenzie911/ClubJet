export default function NoticeRelease() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-2xl font-semibold text-white text-center">Notice & Release Schedule</h3>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-black/60 border border-amber-400/30 flex items-center justify-center text-amber-300 text-xl font-bold">1st</div>
            <h4 className="mt-3 text-white font-semibold">Notice Deadline</h4>
            <p className="mt-1 text-sm text-gray-300">Submit withdrawal requests by the 1st of each month through your dashboard.</p>
          </div>
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-black/60 border border-amber-400/30 flex items-center justify-center text-amber-300 text-xl font-bold">10th</div>
            <h4 className="mt-3 text-white font-semibold">Fund Release</h4>
            <p className="mt-1 text-sm text-gray-300">Approved withdrawals are processed and funds released by the 10th of the same month.</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-400 text-center">
          All withdrawal requests are subject to approval and processed via your selected method (Stripe, ACH, or Wire Transfer).
        </p>
      </div>
    </section>
  );
}

