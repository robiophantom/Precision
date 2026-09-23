"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRef } from "react";

function VerifyContent() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const hasVerified = useRef(false);
  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;
    fetch(`/api/auth/verify?token=${encodeURIComponent(params.get("token") ?? "")}`)
      .then(async (res) => setMessage(res.ok ? "Your email has been verified successfully. You can now log in." : (await res.json()).error))
      .catch(() => setMessage("We could not verify this link. Please request a new one."));
  }, [params]);
  return <main className="flex min-h-screen items-center justify-center p-6 text-center"><div><Link className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground" href="/login">← Back to login</Link><h1 className="text-3xl font-black">{message}</h1><Link className="mt-6 inline-block text-primary hover:underline" href="/login">Go to login</Link></div></main>;
}

export default function VerifyPage() {
  return <Suspense fallback={<main className="p-8">Verifying...</main>}><VerifyContent /></Suspense>;
}
