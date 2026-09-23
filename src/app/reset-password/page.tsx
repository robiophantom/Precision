"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function ResetPasswordForm() {
  const params = useSearchParams(); const router = useRouter(); const [password, setPassword] = useState(""); const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token"), password }) }); const data = await response.json(); if (response.ok) router.push("/login"); else setMessage(data.error); };
  return <main className="flex min-h-screen items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4"><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">← Back to login</Link><h1 className="text-3xl font-black">Choose a new password</h1><input className="w-full rounded-md border bg-transparent p-3" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /><button className="w-full rounded-md bg-primary p-3 text-primary-foreground">Update password</button>{message && <p className="text-sm text-destructive">{message}</p>}</form></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="p-8">Loading...</main>}><ResetPasswordForm /></Suspense>;
}
