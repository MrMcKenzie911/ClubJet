"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

const labels: Record<string, string> = {
  withdraw_submitted: "Withdrawal request submitted",
  deposit_submitted: "Deposit submitted",
  error: "Action failed",
};

export default function ToastFromQueryDashboard() {
  const sp = useSearchParams();
  useEffect(() => {
    const t = sp.get("toast");
    if (t) toast.success(labels[t] || t);
  }, [sp]);
  return null;
}

