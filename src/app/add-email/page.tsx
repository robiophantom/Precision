"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AddEmailForm() {
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState(params.get("identifier") ?? "");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendVerification = async (resend = false) => {
    if (resend && cooldown > 0) return;
    setLoading(true);
    setMessage("");
    try {
      const endpoint = resend ? "/api/auth/resend-verification" : "/api/auth/add-email";
      const body = resend ? { identifier } : { identifier, password, email };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "The verification email could not be sent.");
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds);
        return;
      }
      setSent(true);
      setCooldown(60);
      setMessage(`Verification email sent successfully to ${resend ? "your saved Gmail address" : email}. Check your inbox and spam folder.`);
    } catch {
      setMessage("The verification email could not be sent. Check your Gmail settings and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={(event) => { event.preventDefault(); void sendVerification(); }} className="w-full max-w-sm space-y-4">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">← Back to login</Link>
        <h1 className="text-3xl font-black">Add or verify Gmail</h1>
        <p className="text-sm text-muted-foreground">Use your existing username and password, then add a Gmail address before playing.</p>
        <input className="w-full rounded-md border bg-transparent p-3" required placeholder="Username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
        <input className="w-full rounded-md border bg-transparent p-3" type="password" required placeholder="Current password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <input className="w-full rounded-md border bg-transparent p-3" type="email" required placeholder="Gmail address" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button disabled={loading} className="w-full rounded-md bg-primary p-3 text-primary-foreground">{loading ? "Sending..." : "Add Gmail and send verification"}</button>
        {sent && (
          <button type="button" disabled={loading || cooldown > 0} onClick={() => void sendVerification(true)} className="w-full rounded-md border p-3 disabled:cursor-not-allowed disabled:opacity-50">
            {cooldown > 0 ? `Resend verification link in ${cooldown}s` : "Resend verification link"}
          </button>
        )}
        {message && <p className="rounded-md border border-orange-400/30 bg-orange-400/10 p-3 text-sm">{message}</p>}
      </form>
    </main>
  );
}

export default function AddEmailPage() {
  return <Suspense fallback={<main className="p-8">Loading...</main>}><AddEmailForm /></Suspense>;
}
