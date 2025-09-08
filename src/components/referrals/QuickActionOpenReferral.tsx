"use client";

export default function QuickActionOpenReferral() {
  const base = "rounded-lg border border-gray-800 bg-[#0F141B] text-gray-200 hover:border-amber-600 hover:text-amber-400 px-3 py-2 text-sm text-center";
  const onClick = () => {
    if (typeof document !== "undefined") {
      const ev = new CustomEvent("open-referral-detailed", { bubbles: true });
      document.dispatchEvent(ev);
    }
  };
  return (
    <button type="button" className={base} onClick={onClick}>
      View Detailed Referral Tree
    </button>
  );
}

