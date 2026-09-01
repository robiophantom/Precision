"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export interface ChallengeRound {
  roundNumber: number;
  targetMs: number;
}

export interface Challenge {
  id: string;
  date: string;
  rounds: ChallengeRound[];
}

interface GameEngineProps {
  challenge: Challenge;
  attemptId: string;
  onComplete: (score: number, error: number) => void;
}

type GameState = "READY" | "TIMING" | "ROUND_RESULT";

export function GameEngine({ challenge, attemptId, onComplete }: GameEngineProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>("READY");
  const [lastResult, setLastResult] = useState<{ score: number; errorMs: number; actualMs: number; qualitative: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const startTimestampRef = useRef<number | null>(null);
  
  const currentRound = challenge.rounds[currentRoundIndex];

  const handleStart = () => {
    setGameState("TIMING");
    startTimestampRef.current = performance.now();
  };

  const handleStop = async () => {
    if (!startTimestampRef.current || gameState !== "TIMING") return;
    
    const tapTimestamp = performance.now();
    const actualMs = Math.round(tapTimestamp - startTimestampRef.current);
    const clientStartTimestamp = Math.round(startTimestampRef.current);
    const clientTapTimestamp = Math.round(tapTimestamp);
    
    startTimestampRef.current = null;
    setLoading(true);

    try {
      const res = await fetch("/api/round/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          roundNumber: currentRound.roundNumber,
          clientStartTimestamp,
          clientTapTimestamp,
          measuredMs: actualMs,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        let qualitative = "MISS";
        if (data.score >= 950) qualitative = "PERFECT";
        else if (data.score >= 800) qualitative = "GREAT";
        else if (data.score >= 500) qualitative = "GOOD";

        setLastResult({
          score: data.score,
          errorMs: data.errorMs,
          actualMs,
          qualitative,
        });
        setGameState("ROUND_RESULT");
      } else {
        toast.error(data.error || "Failed to submit round");
        setGameState("READY");
      }
    } catch (err) {
      toast.error("Network error");
      setGameState("READY");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentRoundIndex < 4) {
      setCurrentRoundIndex((prev) => prev + 1);
      setLastResult(null);
      setGameState("READY");
    } else {
      setLoading(true);
      try {
        const res = await fetch("/api/challenge/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId }),
        });
        const data = await res.json();
        if (res.ok) {
          onComplete(data.totalScore, data.totalErrorMs);
        } else {
          toast.error(data.error || "Failed to complete challenge");
        }
      } catch (err) {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-md mx-auto p-4 select-none touch-manipulation">
      <div className="mb-8 text-center">
        <h2 className="text-sm font-medium tracking-widest text-muted-foreground mb-2 uppercase">
          Round {currentRoundIndex + 1} of 5
        </h2>
        <div className="text-5xl font-bold tracking-tighter">
          {(currentRound?.targetMs / 1000).toFixed(3)}s
        </div>
        <p className="text-sm text-muted-foreground mt-2">Target duration</p>
      </div>

      <AnimatePresence mode="wait">
        {gameState === "READY" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <Button 
              onClick={handleStart} 
              className="w-full h-40 text-3xl font-bold rounded-3xl"
              disabled={loading}
            >
              START
            </Button>
          </motion.div>
        )}

        {gameState === "TIMING" && (
          <motion.div
            key="timing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <Button 
              onClick={handleStop} 
              variant="destructive"
              className="w-full h-40 text-3xl font-bold rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.5)]"
            >
              STOP
            </Button>
          </motion.div>
        )}

        {gameState === "ROUND_RESULT" && lastResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-2xl font-bold text-primary tracking-widest">
                  {lastResult.qualitative}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Actual</div>
                    <div className="text-xl font-mono">{(lastResult.actualMs / 1000).toFixed(3)}s</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Error</div>
                    <div className="text-xl font-mono">
                      {lastResult.errorMs > 0 ? "+" : ""}{(lastResult.errorMs / 1000).toFixed(3)}s
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-primary/10">
                  <div className="text-muted-foreground text-sm mb-1">Score</div>
                  <div className="text-4xl font-bold tracking-tighter">{lastResult.score}</div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleNext} className="w-full h-14 text-lg" disabled={loading}>
              {loading ? "SAVING..." : currentRoundIndex === 4 ? "VIEW FINAL RESULT" : "CONTINUE"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
