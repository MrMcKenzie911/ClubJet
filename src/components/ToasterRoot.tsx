"use client";
import { Toaster } from "react-hot-toast";

export default function ToasterRoot() {
  return <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F14', color: '#fff', border: '1px solid #1f2937' } }} />;
}

