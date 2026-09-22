"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { DailyChallengeController } from "@/components/game/DailyChallengeController";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl font-mono text-muted-foreground">
          PRECISION
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex-1 flex flex-col overflow-hidden pt-8 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="pointer-events-none absolute -right-24 top-24 size-64 rounded-full bg-orange-500/10 blur-3xl animate-ember-pulse" />
      <div className="pointer-events-none absolute left-8 top-48 size-32 rounded-full bg-yellow-300/10 blur-3xl animate-float-up" />
      <header className="relative z-10 flex justify-between items-center mb-12 w-full animate-reveal-up">
        <Link href="/" className="text-2xl font-black tracking-tighter">PRECISION<span className="text-fire">.</span></Link>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">{user.username}</div>

            {user.streak && user.streak.currentStreak > 0 && (
              <div className="text-sm font-bold text-orange-500">
                🔥 {user.streak.currentStreak}
              </div>
            )}

            <Link href="/friends" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Friends</Link>
            <Link href="/leaderboard" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Rankings</Link>
            <Button
              variant="ghost"
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                });
                window.location.reload();
              }}
            >
              Logout
            </Button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/login")}
            >
              Login
            </Button>

            <Button onClick={() => router.push("/signup")}>
              Play Now
            </Button>
          </div>
        )}
      </header>

      {user ? (
        <DailyChallengeController />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center max-w-2xl mx-auto">
          <div className="animate-reveal-up mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-300">
            <span>✦</span> A new challenge every day
          </div>
          <h1 className="animate-reveal-up text-5xl sm:text-7xl font-black tracking-tighter leading-tight [animation-delay:120ms]">
            Find your <span className="text-fire">perfect</span><br />
            moment<span className="text-fire">.</span>
          </h1>

          <p className="animate-reveal-up text-xl text-muted-foreground [animation-delay:220ms]">
            A tiny daily ritual for your timing instincts. Five rounds, one shot,
            and a leaderboard full of friendly rivals.
          </p>

          <div className="animate-reveal-up flex gap-4 pt-8 [animation-delay:320ms]">
            <Button
              size="lg"
              className="h-14 px-8 text-lg rounded-2xl"
              onClick={() => router.push("/signup")}
            >
              Start Playing
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
