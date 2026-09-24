"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { Crown, Swords, Trophy } from "lucide-react";

interface Participant { user: { username: string }; totalScore: number; scores: number[] | null }
interface Challenge { id: string; inviteToken: string; rounds: number; status: string; createdAt: string; creator: { id: string; username: string }; challengeRounds: { targetMs: number }[]; participants: Participant[]; _count: { participants: number } }

export default function ChallengeHistoryPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [message, setMessage] = useState("Loading your arenas...");
  const { user } = useAuth();
  useEffect(() => { fetch("/api/challenge/custom").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setChallenges(data.challenges); setMessage(""); }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load challenge history.")); }, []);
  const removeChallenge = async (challenge: Challenge) => {
    if (!window.confirm("Delete this arena and its leaderboard?")) return;
    const response = await fetch(`/api/challenge/custom?challengeId=${encodeURIComponent(challenge.id)}`, { method: "DELETE" });
    if (response.ok) setChallenges((items) => items.filter((item) => item.id !== challenge.id));
    else setMessage((await response.json()).error || "Could not delete arena.");
  };
  const closeChallenge = async (challenge: Challenge) => {
    const response = await fetch("/api/challenge/custom", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: challenge.id, action: "close" }) });
    if (response.ok) setChallenges((items) => items.map((item) => item.id === challenge.id ? { ...item, status: "CLOSED" } : item));
    else setMessage((await response.json()).error || "Could not close arena.");
  };
  return <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-8"><BackButton /><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Your arenas</p><h1 className="text-4xl font-black sm:text-6xl">Challenge <span className="text-fire">history.</span></h1></div><Link href="/challenge/new" className="rounded-xl bg-gradient-to-r from-violet-400 to-orange-300 px-4 py-3 text-sm font-black text-slate-950">+ New arena</Link></div>{message && <p className="rounded-xl border border-border/60 p-4 text-muted-foreground">{message}</p>}<div className="grid gap-5 lg:grid-cols-2">{challenges.map((challenge) => <article key={challenge.id} className="rounded-[1.75rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-card to-orange-400/5 p-5 shadow-[0_0_45px_rgba(139,92,246,0.1)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">{new Date(challenge.createdAt).toLocaleDateString()}</p><h2 className="mt-1 text-2xl font-black"><Swords className="mr-2 inline text-violet-300" size={22} />{challenge.rounds} round arena <span className="text-xs text-orange-200">{challenge.status.toLowerCase()}</span></h2><p className="text-sm text-muted-foreground">Created by @{challenge.creator.username} · {challenge._count.participants} player{challenge._count.participants === 1 ? "" : "s"}</p></div><Crown className="text-yellow-300" /></div><div className="mt-4 flex flex-wrap gap-2">{challenge.challengeRounds.map((round, index) => <span key={index} className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs">{round.targetMs} ms</span>)}</div><div className="mt-5 space-y-2"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-200"><Trophy size={15} /> Arena leaderboard</p>{challenge.participants.map((participant, index) => <div key={participant.user.username} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-sm"><span>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`} @{participant.user.username}</span><strong>{participant.totalScore}</strong></div>)}</div><div className="mt-5 grid gap-2 sm:grid-cols-2"><Link href={`/challenge/${challenge.inviteToken}`} className="block rounded-xl border border-violet-300/30 p-3 text-center text-sm font-bold transition hover:bg-violet-300/10">Open arena</Link>{user?.id === challenge.creator.id && <><button disabled={challenge.status === "CLOSED"} onClick={() => void closeChallenge(challenge)} className="rounded-xl border border-orange-300/30 p-3 text-sm font-bold disabled:opacity-50">Close arena</button><button onClick={() => void removeChallenge(challenge)} className="rounded-xl border border-red-400/30 p-3 text-sm font-bold text-red-200 sm:col-span-2">Delete arena</button></>}</div></article>)}</div></main>;
}
