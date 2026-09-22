"use client";

import { useState, useEffect } from "react";
import { GameEngine, Challenge } from "./GameEngine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { ChevronDown, Flame, HelpCircle, Target, Timer, Trophy } from "lucide-react";
import { SCORING_EXAMPLES, ROUND_COUNT } from "@/domain/game/scoring";

export function DailyChallengeController() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalError, setFinalError] = useState<number | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [resumeAttemptId, setResumeAttemptId] = useState<string | null>(null);
  const [resumeRoundIndex, setResumeRoundIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const res = await fetch("/api/challenge/today");
        const data = await res.json();
        if (data.challenge) {
          setChallenge(data.challenge);
          setHasPlayed(Boolean(data.hasPlayed));
          setResumeAttemptId(data.resumableAttemptId ?? null);
          setResumeRoundIndex(data.completedRoundNumbers?.length ?? 0);
        }
      } catch (err) {
        toast.error("Failed to load today's challenge");
      } finally {
        setLoading(false);
      }
    };
    fetchToday();
  }, []);

  const handleStartAttempt = async () => {
    if (!challenge) return;
    setLoading(true);
    try {
      const res = await fetch("/api/challenge/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, mode: "COMPETITIVE" }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setAttemptId(data.attemptId);
        setResumeRoundIndex(0);
      } else {
        toast.error(data.error || "Could not start challenge");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (score: number, error: number) => {
    setFinalScore(score);
    setFinalError(error);
  };

  const handleShare = async () => {
    const text = `I scored ${finalScore}/5000 on today's Precision challenge. Can you beat me?\n\nPlay at: ${window.location.origin}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Precision Challenge",
          text,
          url: window.location.origin,
        });
      } catch (err) {
        // user cancelled or failed, fallback to clipboard
        fallbackShare(text);
      }
    } else {
      fallbackShare(text);
    }
  };

  const fallbackShare = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Result copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy result.");
    });
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center">Loading...</div>;
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-muted-foreground">No active challenge today.</h2>
        <p className="text-muted-foreground">Check back tomorrow!</p>
      </div>
    );
  }

  if (finalScore !== null) {
    return (
      <Card className="glass-panel w-full max-w-md mx-auto mt-8 border-2 border-orange-400/25 bg-orange-400/5 animate-reveal-up">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tighter">CHALLENGE COMPLETE</CardTitle>
          <CardDescription>Great job, {user?.username}!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div>
            <div className="text-sm text-muted-foreground mb-1 uppercase tracking-widest">Total Score</div>
            <div className="text-6xl font-black text-primary">{finalScore} <span className="text-xl text-muted-foreground font-normal">/ 5000</span></div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1 uppercase tracking-widest">Total Error</div>
            <div className="text-2xl font-mono">{(finalError! / 1000).toFixed(3)}s</div>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <Button className="w-full h-12" onClick={handleShare}>
              Share Result
            </Button>
            <Button className="w-full h-12" variant="outline" onClick={() => window.location.href = '/leaderboard'}>
              View Leaderboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attemptId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 w-full max-w-md mx-auto text-center px-4">
        <div className="space-y-2 animate-reveal-up">
          <h1 className="text-4xl font-bold tracking-tighter">Today&apos;s Challenge</h1>
          <p className="text-muted-foreground">5 rounds. 1 attempt. Perfect precision.</p>
        </div>
        
        <Card className="glass-panel w-full animate-reveal-up [animation-delay:120ms]">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Rounds</span>
              <span className="font-bold">{ROUND_COUNT}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Max Score</span>
              <span className="font-bold">5000</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Attempts Allowed</span>
              <span className="font-bold">1</span>
            </div>
          </CardContent>
        </Card>

        {resumeAttemptId && !hasPlayed && (
          <Button onClick={() => setAttemptId(resumeAttemptId)} className="w-full h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(255,111,24,0.35)]">
            RESUME CHALLENGE
          </Button>
        )}
        <div className="w-full space-y-3 animate-reveal-up [animation-delay:220ms]">
          <Button onClick={handleStartAttempt} disabled={hasPlayed || Boolean(resumeAttemptId)} className="w-full h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(255,111,24,0.35)] disabled:cursor-not-allowed disabled:opacity-70">
            {hasPlayed ? "ALREADY PLAYED" : resumeAttemptId ? "CHALLENGE IN PROGRESS" : "PLAY COMPETITIVE"}
          </Button>
          {hasPlayed && <p className="text-sm text-orange-200/80">Your competitive attempt is locked in. Come back tomorrow for a fresh shot.</p>}
        </div>

        <Card className="glass-panel w-full animate-reveal-up [animation-delay:300ms]">
          <button type="button" onClick={() => setShowGuide((visible) => !visible)} className="flex w-full items-center justify-between p-5 text-left">
            <span className="flex items-center gap-3 font-bold"><HelpCircle className="text-yellow-300" size={20} /> How to play & scoring</span>
            <ChevronDown className={`transition-transform ${showGuide ? "rotate-180" : ""}`} size={20} />
          </button>
          {showGuide && (
            <CardContent className="grid gap-4 border-t border-yellow-100/10 pt-5 text-left sm:grid-cols-2">
              <div className="space-y-3">
                <p className="flex gap-3"><Timer className="mt-0.5 text-orange-300" size={18} /><span><strong>Start</strong> when you are ready, then stop when your internal clock reaches the target.</span></p>
                <p className="flex gap-3"><Target className="mt-0.5 text-yellow-300" size={18} /><span>There are <strong>{ROUND_COUNT} rounds</strong>. You get one competitive attempt each day.</span></p>
                <p className="flex gap-3"><Trophy className="mt-0.5 text-orange-300" size={18} /><span>Your total can reach <strong>5,000 points</strong> and verified scores enter the leaderboard.</span></p>
                <div className="rounded-xl border border-yellow-200/10 bg-yellow-200/5 p-3 text-sm text-yellow-50/85">
                  <strong className="text-yellow-100">The simple rule:</strong> the closer you stop to the target, the more points you earn. Being early or late by the same amount gives the same score.
                  <span className="mt-2 block text-xs text-muted-foreground">Example: stopping 100 ms away earns about 607 points. A perfect stop earns 1,000.</span>
                </div>
              </div>
              <div className="rounded-2xl bg-black/15 p-4">
                <p className="mb-3 flex items-center gap-2 font-bold text-yellow-100"><Flame size={17} /> Score per round</p>
                <div className="space-y-2 text-sm">
                  {SCORING_EXAMPLES.map((example) => (
                    <div key={example.errorMs} className="flex justify-between gap-3">
                      <span className={example.errorMs <= 10 ? "text-yellow-200" : example.errorMs <= 100 ? "text-orange-300" : "text-muted-foreground"}>
                        {example.errorMs === 0 ? "Exactly on target" : `${example.errorMs} ms away`}
                      </span>
                      <span className="font-semibold">{example.score} pts</span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-muted-foreground">Each round is worth up to 1,000 points. Add all {ROUND_COUNT} rounds for a maximum of 5,000.</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <GameEngine
      challenge={challenge}
      attemptId={attemptId}
      initialRoundIndex={resumeRoundIndex}
      onComplete={handleComplete}
    />
  );
}
