"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }) }); const data = await response.json(); setMessage(response.ok ? "If that account has a verified Gmail, a reset link has been sent." : data.error); };
  return <main className="flex min-h-screen items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4"><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">← Back to login</Link><h1 className="text-3xl font-black">Reset password</h1><p className="text-sm text-muted-foreground">Enter your username or registered Gmail.</p><input className="w-full rounded-md border bg-transparent p-3" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} /><button className="w-full rounded-md bg-primary p-3 text-primary-foreground">Send reset link</button>{message && <p className="text-sm text-muted-foreground">{message}</p>}<Link href="/login" className="text-sm text-primary hover:underline">Back to login</Link></form></main>;
}
