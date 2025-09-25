"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

const labels: Record<string, string> = {
  user_approved: "Success",
  user_rejected: "User rejected",
  deposit_approved: "Deposit approved",
  deposit_denied: "Deposit denied",
  withdrawal_approved: "Withdrawal approved",
  withdrawal_denied: "Withdrawal denied",
  account_verified: "Account verified",
  account_updated: "Account updated",
  account_deleted: "Account deleted",
  rate_set: "Earnings rate set",
  withdraw_submitted: "Withdrawal request submitted",
  deposit_submitted: "Deposit submitted",
};

export default function ToastFromQuery() {
  const sp = useSearchParams();
  useEffect(() => {
    const t = sp.get("toast");
    if (!t) return;
    if (t === 'rate_set') {
      const applied = sp.get('applied');
      const count = sp.get('count');
      const total = sp.get('total');
      if (applied && count && total) {
        toast.success(`Applied ${applied}% to ${count} accounts, total $${total}`);
        return;
      }
    }
    const msg = labels[t] || t;
    toast.success(msg);
  }, [sp]);
  return null;
}

