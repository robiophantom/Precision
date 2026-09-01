"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { DailyChallengeController } from "@/components/game/DailyChallengeController";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl font-mono text-muted-foreground">PRECISION</div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-center mb-12 w-full">
        <div className="text-2xl font-black tracking-tighter">PRECISION</div>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">{user.username}</div>
            {user.streak && user.streak.currentStreak > 0 && (
              <div className="text-sm font-bold text-orange-500">
                🔥 {user.streak.currentStreak}
              </div>
            )}
            <Button variant="ghost" asChild>
              <Link href="/api/auth/logout" onClick={(e) => {
                 e.preventDefault();
                 fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
              }}>Logout</Link>
            </Button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Play Now</Link>
            </Button>
          </div>
        )}
      </header>

      {user ? (
        <DailyChallengeController />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center max-w-2xl mx-auto">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-tight">
            How accurately can you <br/>
            <span className="text-primary">measure time?</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            A daily competitive timing game. 5 rounds. 1 attempt. Perfect precision.
          </p>
          <div className="flex gap-4 pt-8">
            <Button size="lg" className="h-14 px-8 text-lg rounded-2xl" asChild>
              <Link href="/signup">Start Playing</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
