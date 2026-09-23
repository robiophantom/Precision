"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { BackButton } from "@/components/ui/back-button";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth(); const [message, setMessage] = useState("");
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !file.type.startsWith("image/") || file.size > 1_800_000) { setMessage("Choose an image smaller than 1.8 MB."); return; } const reader = new FileReader(); reader.onload = async () => { const response = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: reader.result }) }); setMessage(response.ok ? "Profile image updated." : "Could not update image."); await refreshUser(); }; reader.readAsDataURL(file); };
  if (!user) return <main className="p-4 sm:p-8"><BackButton /><p>Please log in.</p></main>;
  return <main className="mx-auto max-w-xl space-y-8 p-4 sm:p-8"><BackButton /><h1 className="text-4xl font-black">Your <span className="text-fire">profile.</span></h1><div className="flex items-center gap-5">{user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-24 rounded-full object-cover ring-4 ring-orange-400" /> : <div className="flex size-24 items-center justify-center rounded-full bg-orange-500 text-3xl font-black">{user.username[0].toUpperCase()}</div>}<label className="cursor-pointer rounded-md border px-4 py-2">Upload image<input className="hidden" type="file" accept="image/*" onChange={upload} /></label></div><div className="rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-500/25 via-yellow-300/10 to-transparent p-8 text-center shadow-[0_0_70px_rgba(255,120,0,0.2)]"><p className="text-sm uppercase tracking-[0.3em] text-orange-200">Personal best</p><p className="mt-2 text-7xl font-black text-orange-300 drop-shadow-[0_0_20px_rgba(255,150,0,0.8)]">{user.bestScore ?? 0}</p><p className="mt-2 text-muted-foreground">Your best verified score ever</p></div>{message && <p className="text-sm text-muted-foreground">{message}</p>}</main>;
}
