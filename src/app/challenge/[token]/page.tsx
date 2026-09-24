"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Swords, Trophy } from "lucide-react";
import { calculateRoundScore } from "@/domain/game/scoring";

interface RoundResult { roundNumber: number; targetMs: number; actualMs: number; errorMs: number; score: number }
interface Participant { user: { id: string; username: string }; totalScore: number | null; scores: number[] | RoundResult[] | null }
interface ChallengeSummary {
  challenge: { id: string; rounds: number; status: string; creator: { id: string; username: string }; challengeRounds: { targetMs: number; roundNumber: number }[]; participants: Participant[] };
  currentParticipant: { userId: string; hasPlayed: boolean; totalScore: number | null } | null;
}

export default function ChallengeInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [data, setData] = useState<ChallengeSummary | null>(null);
  const [joined, setJoined] = useState(false);
  const [phase, setPhase] = useState<"join" | "ready" | "timing" | "result" | "complete">("join");
  const [index, setIndex] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    fetch(`/api/challenge/custom?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const nextData = await response.json() as ChallengeSummary;
        if (!response.ok) throw new Error(nextData ? "Challenge could not be loaded." : "Challenge could not be loaded.");
        setData(nextData);
        if (nextData.currentParticipant?.hasPlayed) {
          setJoined(true);
          const saved = nextData.challenge.participants.find((participant) => participant.user.id === nextData.currentParticipant?.userId)?.scores;
          if (Array.isArray(saved) && saved.length > 0 && typeof saved[0] === "object") {
            setRoundResults(saved as RoundResult[]);
          }
          setPhase("complete");
        }
      })
      .catch(() => setMessage("Challenge could not be loaded."));
  }, [token]);

  const join = async () => {
    const response = await fetch("/api/challenge/custom", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const result = await response.json();
    if (response.ok) { setJoined(true); setPhase("ready"); }
    else setMessage(result.error || "Could not join challenge.");
  };

  const current = data?.challenge.challengeRounds[index];

  const stop = () => {
    if (startedAt.current === null || !current) return;
    const actualMs = Math.max(1, Math.round(performance.now() - startedAt.current));
    startedAt.current = null;
    const result = { roundNumber: index + 1, targetMs: current.targetMs, actualMs, errorMs: Math.abs(actualMs - current.targetMs), score: calculateRoundScore(current.targetMs, actualMs) };
    setLastResult(result);
    setRoundResults((items) => [...items.filter((item) => item.roundNumber !== result.roundNumber), result]);
    setPhase("result");
  };

  const next = async () => {
    if (!data || !lastResult || submitting) return;
    if (index < data.challenge.rounds - 1) {
      setIndex((value) => value + 1);
      setLastResult(null);
      setPhase("ready");
      return;
    }
    const finalResults = [...roundResults.filter((item) => item.roundNumber !== lastResult.roundNumber), lastResult].sort((a, b) => a.roundNumber - b.roundNumber);
    if (finalResults.length !== data.challenge.rounds) {
      setMessage(`Please complete all ${data.challenge.rounds} rounds before submitting.`);
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/challenge/custom", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: data.challenge.id, results: finalResults.map(({ actualMs }) => ({ actualMs })) }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "Could not save result. You can try again."); return; }
      const savedResults = result.results as RoundResult[];
      setRoundResults(savedResults);
      setData((currentData) => currentData ? { ...currentData, currentParticipant: { userId: currentData.currentParticipant?.userId ?? "", hasPlayed: true, totalScore: result.totalScore }, challenge: { ...currentData.challenge, participants: currentData.challenge.participants.map((participant) => participant.user.id === currentData.currentParticipant?.userId ? { ...participant, scores: savedResults, totalScore: result.totalScore } : participant) } } : currentData);
      setLastResult(savedResults[savedResults.length - 1] ?? lastResult);
      setPhase("complete");
    } catch {
      setMessage("Could not reach the server. Your round results are still on this screen; try submitting again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) return <main className="p-6"><BackButton /><p>{message || "Loading challenge..."}</p></main>;
  const scored = data.challenge.participants.filter((participant) => participant.scores !== null).length;
  const totalScore = roundResults.reduce((sum, result) => sum + result.score, 0);
  const totalError = roundResults.reduce((sum, result) => sum + result.errorMs, 0);

  return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-8"><BackButton /><section className="rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 via-card to-orange-400/10 p-5 shadow-[0_0_80px_rgba(139,92,246,0.15)] sm:p-8"><div className="mb-8 flex justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Head-to-head arena</p><h1 className="text-4xl font-black">You&apos;re <span className="text-fire">challenged.</span></h1><p className="mt-2 text-sm text-muted-foreground">{scored} of {data.challenge.participants.length} players scored · {data.challenge.rounds} rounds</p></div><Swords className="text-violet-300" /></div>{phase === "join" && <div className="space-y-5"><p className="text-lg">@{data.challenge.creator.username} created a {data.challenge.rounds}-round challenge.</p><p className="text-sm text-muted-foreground">Match every target, then share your result with the lobby.</p><button disabled={data.challenge.status !== "OPEN"} onClick={() => void join()} className="w-full rounded-2xl bg-gradient-to-r from-violet-400 to-orange-300 p-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{data.challenge.status === "OPEN" ? "Join challenge" : "Arena closed"}</button></div>}{joined && phase !== "complete" && <div className="space-y-6 text-center"><p className="text-sm text-muted-foreground">Round {index + 1} of {data.challenge.rounds} · Target {current?.targetMs} ms</p>{phase === "ready" && <button onClick={() => { startedAt.current = performance.now(); setPhase("timing"); }} className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-full border-8 border-violet-400/40 bg-violet-400/20 text-3xl font-black">START</button>}{phase === "timing" && <button onClick={stop} className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-full border-8 border-red-400/50 bg-red-500/30 text-3xl font-black">STOP</button>}{phase === "result" && lastResult && <div className="space-y-3"><p className="text-6xl font-black text-orange-300">{lastResult.score}</p><p className="text-sm text-muted-foreground">You stopped at <strong>{(lastResult.actualMs / 1000).toFixed(3)}s</strong> · Error <strong>{lastResult.errorMs}ms</strong></p><button disabled={submitting} onClick={() => void next()} className="mt-5 w-full rounded-2xl bg-primary p-4 font-bold text-primary-foreground disabled:opacity-50">{submitting ? "Saving result..." : index < data.challenge.rounds - 1 ? "Next round" : "Finish challenge"}</button></div>}</div>}{phase === "complete" && <div className="space-y-4 text-center"><Trophy className="mx-auto text-yellow-300" size={56} /><p className="text-6xl font-black text-orange-300">{data.currentParticipant?.totalScore ?? totalScore}</p><p className="text-muted-foreground">{data.currentParticipant?.hasPlayed ? "You already played this challenge. Your score is locked." : "Challenge result saved."}</p>{roundResults.length > 0 && <div className="space-y-2 text-left"><p className="text-xs font-bold uppercase tracking-widest text-orange-200">Your round results · {totalError}ms total error</p>{roundResults.map((result) => <div key={result.roundNumber} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-sm"><span>Round {result.roundNumber} · {(result.actualMs / 1000).toFixed(3)}s · {result.errorMs}ms error</span><strong>{result.score}</strong></div>)}</div>}<div className="space-y-2 text-left"><p className="text-xs font-bold uppercase tracking-widest text-orange-200">Arena leaderboard</p>{data.challenge.participants.filter((participant) => participant.scores !== null).map((participant, rank) => <div key={participant.user.username} className="flex justify-between rounded-xl bg-background/40 px-3 py-2 text-sm"><span>#{rank + 1} @{participant.user.username}</span><strong>{participant.totalScore}</strong></div>)}</div><button onClick={() => router.push("/challenge/history")} className="w-full rounded-2xl border p-4 font-bold">View challenge history</button></div>}{message && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm">{message}</p>}</section></main>;
}
