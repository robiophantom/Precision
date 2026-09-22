"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe2, Users } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  errorMs: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"global" | "friends">("global");
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard/${scope}`);
        const data = await res.json();
        setEntries(data.leaderboard || []);
      } catch (err) {
        console.error("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [scope]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 flex flex-col pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Back to game</Link>
          <h1 className="text-4xl font-black tracking-tighter">{scope === "global" ? "GLOBAL" : "FRIENDS"} <span className="text-orange-400">RANKINGS</span></h1>
        </div>
        <div className="flex rounded-xl border border-border/60 bg-card p-1">
          <Button size="sm" variant={scope === "global" ? "default" : "ghost"} onClick={() => setScope("global")}><Globe2 size={15} /> Global</Button>
          <Button size="sm" variant={scope === "friends" ? "default" : "ghost"} onClick={() => setScope("friends")}><Users size={15} /> Friends</Button>
        </div>
      </div>

      <Card className="bg-transparent border-primary/20">
        <CardHeader>
          <CardTitle>Today&apos;s Top Players</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground uppercase tracking-wider p-4 border-b border-primary/10">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-4 text-right">Score</div>
          </div>
          
          <div className="divide-y divide-primary/5">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No entries yet for today&apos;s challenge. Be the first!
              </div>
            ) : (
              entries.map((entry) => {
                const isCurrentUser = user?.id === entry.userId;
                return (
                  <div 
                    key={entry.userId} 
                    className={`grid grid-cols-12 items-center p-4 transition-colors ${
                      isCurrentUser ? "bg-primary/10 font-bold" : "hover:bg-primary/5"
                    }`}
                  >
                    <div className="col-span-2 text-center text-xl">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                    </div>
                    <div className="col-span-6 flex items-center gap-2">
                      <span className={isCurrentUser ? "text-primary" : ""}>
                        {entry.username} {isCurrentUser && "(You)"}
                      </span>
                    </div>
                    <div className="col-span-4 text-right">
                      <div className="text-lg">{entry.score}</div>
                      <div className="text-xs text-muted-foreground">{(entry.errorMs / 1000).toFixed(3)}s err</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
