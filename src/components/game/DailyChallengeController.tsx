"use client";

import { useState, useEffect } from "react";
import { GameEngine, Challenge } from "./GameEngine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";

export function DailyChallengeController() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalError, setFinalError] = useState<number | null>(null);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const res = await fetch("/api/challenge/today");
        const data = await res.json();
        if (data.challenge) {
          setChallenge(data.challenge);
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
      <Card className="w-full max-w-md mx-auto mt-8 border-2 border-primary/20 bg-primary/5">
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
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">Today's Challenge</h1>
          <p className="text-muted-foreground">5 rounds. 1 attempt. Perfect precision.</p>
        </div>
        
        <Card className="w-full">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Rounds</span>
              <span className="font-bold">5</span>
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

        <Button onClick={handleStartAttempt} className="w-full h-16 text-xl font-bold rounded-2xl">
          PLAY COMPETITIVE
        </Button>
      </div>
    );
  }

  return (
    <GameEngine
      challenge={challenge}
      attemptId={attemptId}
      onComplete={handleComplete}
    />
  );
}
