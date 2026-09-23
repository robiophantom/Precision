"use client";

import { useRef, useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { Target, Timer, Trophy, Sparkles } from "lucide-react";

type Phase = "setup" | "ready" | "timing" | "result" | "complete";

export default function PracticePage() {
  const [rounds, setRounds] = useState(3);
  const [targets, setTargets] = useState(["1000", "2000", "3000", "4000", "5000"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionId, setSessionId] = useState("");
  const [roundIndex, setRoundIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [lastError, setLastError] = useState(0);
  const [message, setMessage] = useState("");
  const startedAt = useRef<number | null>(null);
  const target = Number(targets[roundIndex]);

  const start = async () => {
    const response = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rounds, targets: targets.slice(0, rounds).map(Number) }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not start practice."); return; }
    setSessionId(data.sessionId); setScores([]); setRoundIndex(0); setPhase("ready"); setMessage("");
  };

  const stop = () => {
    if (startedAt.current === null) return;
    const measured = Math.round(performance.now() - startedAt.current);
    startedAt.current = null;
    const error = Math.abs(measured - target);
    const score = Math.max(0, 1000 - error);
    setLastError(error); setLastScore(score); setScores((current) => [...current, score]); setPhase("result");
  };

  const next = async () => {
    if (roundIndex < rounds - 1) { setRoundIndex((value) => value + 1); setPhase("ready"); return; }
    const finalScores = scores;
    const response = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, scores: finalScores }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not save practice result."); return; }
    setLastScore(data.totalScore); setPhase("complete");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-8">
      <BackButton />
      <section className="rounded-[2rem] border border-orange-400/20 bg-gradient-to-br from-orange-500/20 via-card to-yellow-300/5 p-5 shadow-[0_0_80px_rgba(249,115,22,0.12)] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-orange-300">Training grounds</p><h1 className="text-4xl font-black sm:text-5xl">Practice <span className="text-fire">arena.</span></h1></div><Sparkles className="text-yellow-300" /></div>
        {phase === "setup" && <div className="space-y-6">
          <p className="text-muted-foreground">Tune your instincts with a private session. Practice scores never affect rankings.</p>
          <div className="rounded-2xl border border-orange-300/30 bg-orange-300/10 p-4 text-center"><p className="text-xs uppercase tracking-widest text-orange-200">Selected rounds</p><p className="text-5xl font-black text-orange-300">{rounds}</p><p className="text-sm text-muted-foreground">round{rounds === 1 ? "" : "s"}</p></div>
          <div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRounds(value)} className={`rounded-xl border p-3 text-lg font-black transition ${rounds === value ? "border-orange-300 bg-orange-400 text-slate-950 shadow-[0_0_24px_rgba(251,146,60,0.5)]" : "border-border/60 bg-background/40 text-muted-foreground hover:border-orange-300/50"}`}>{value}</button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">{targets.slice(0, rounds).map((value, index) => <label key={index} className="text-sm font-semibold">Target {index + 1} (ms)<input className="mt-2 w-full rounded-xl border border-border/60 bg-background/60 p-3 text-lg font-bold" type="number" min={100} max={10000} value={value} onChange={(event) => setTargets((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}</div>
          <button onClick={() => void start()} className="w-full rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-300 p-4 font-black text-slate-950 shadow-lg">Enter the arena</button>
        </div>}
        {phase !== "setup" && phase !== "complete" && <div className="space-y-6 text-center">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Round {roundIndex + 1} of {rounds}</span><span className="flex items-center gap-1"><Target size={16} /> {target} ms</span></div>
          {phase === "ready" && <button onClick={() => { startedAt.current = performance.now(); setPhase("timing"); }} className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-full border-8 border-orange-400/40 bg-orange-400/20 text-3xl font-black text-orange-200 shadow-[0_0_70px_rgba(249,115,22,0.35)]">START</button>}
          {phase === "timing" && <button onClick={stop} className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-full border-8 border-red-400/50 bg-red-500/30 text-3xl font-black text-red-100 shadow-[0_0_70px_rgba(239,68,68,0.4)]">STOP</button>}
          {phase === "result" && <div className="space-y-4"><Timer className="mx-auto text-orange-300" size={42} /><p className="text-6xl font-black text-orange-300">{lastScore}</p><p className="text-muted-foreground">Off by {lastError} ms</p><button onClick={() => void next()} className="w-full rounded-2xl bg-primary p-4 font-bold text-primary-foreground">{roundIndex < rounds - 1 ? "Next round" : "See final result"}</button></div>}
        </div>}
        {phase === "complete" && <div className="space-y-5 text-center"><Trophy className="mx-auto text-yellow-300" size={56} /><p className="text-sm uppercase tracking-widest text-orange-200">Practice complete</p><p className="text-7xl font-black text-orange-300">{lastScore}</p><p className="text-muted-foreground">Great session. Ready for another run?</p><button onClick={() => setPhase("setup")} className="w-full rounded-2xl border p-4 font-bold">Practice again</button></div>}
        {message && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm">{message}</p>}
      </section>
    </main>
  );
}
