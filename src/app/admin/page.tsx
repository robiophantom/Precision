"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { Users, ShieldCheck, Ban, Trash2, Flame, CalendarDays, Sparkles, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

type AdminUser = { id: string; username: string; status: string; role: string; createdAt: string; streak: { currentStreak: number; longestStreak: number } | null };

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState("");
  const [rounds, setRounds] = useState<string[]>(["1570", "3280", "840", "4610", "2350"]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [resetDate, setResetDate] = useState(new Date().toISOString().slice(0, 10));

  const loadUsers = async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) setUsers((await response.json()).users);
    setUsersLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user?.isAdmin) return;
    const timer = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, user?.isAdmin]);

  const activeUsers = users.filter((managedUser) => managedUser.status === "ACTIVE").length;
  const adminCount = users.filter((managedUser) => managedUser.role === "ADMIN").length;
  const totalStreaks = users.reduce((total, managedUser) => total + (managedUser.streak?.currentStreak ?? 0), 0);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Checking admin access...</div>;
  if (!user || !user.isAdmin) return <div className="flex min-h-screen items-center justify-center p-8 text-muted-foreground">You do not have permission to view this page.</div>;

  const updateUser = async (userId: string, field: "status" | "role", value: string) => {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, [field]: value }),
    });
    if (response.ok) await loadUsers();
    else toast.error((await response.json()).error || "Could not update user");
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Delete this user and their scores?")) return;
    const response = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
    if (response.ok) await loadUsers();
    else toast.error((await response.json()).error || "Could not delete user");
  };

  const resetChallenge = async (userId: string, username: string) => {
    if (!window.confirm(`Make the ${resetDate} challenge available again for @${username}?`)) return;
    const response = await fetch("/api/admin/challenge/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, challengeDate: resetDate }),
    });
    const data = await response.json();
    if (response.ok) toast.success(`Challenge reset for @${username}`);
    else toast.error(data.error || "Could not reset challenge");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/admin/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeDate: date,
          rounds: rounds.map(r => parseInt(r, 10))
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Challenge created!");
        setDate("");
      } else {
        toast.error(data.error || "Failed to create");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8">
      <div className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-orange-500/10 blur-3xl animate-ember-pulse" />
      <div className="pointer-events-none absolute right-0 top-0 size-96 rounded-full bg-yellow-300/10 blur-3xl animate-float-up" />
      <div className="relative mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5 animate-reveal-up">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"><ArrowLeft size={16} /> Return to game</Link>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-500 text-slate-950 shadow-[0_10px_30px_rgba(255,133,0,0.3)]"><Sparkles size={24} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Precision control room</p>
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Make today <span className="text-fire">memorable.</span></h1>
              </div>
            </div>
          </div>
          <div className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-sm text-yellow-100">Signed in as <strong>@{user.username}</strong></div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active players", value: activeUsers, icon: Users, color: "text-yellow-300" },
            { label: "Administrators", value: adminCount, icon: ShieldCheck, color: "text-orange-300" },
            { label: "Streak energy", value: totalStreaks, icon: Flame, color: "text-red-300" },
          ].map(({ label, value, icon: Icon, color }, index) => (
            <motion.div key={label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
              <Card className="glass-panel transition-transform duration-300 hover:-translate-y-1">
                <CardContent className="flex items-center justify-between p-5">
                  <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black">{usersLoading ? "—" : value}</p></div>
                  <Icon className={color} size={28} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      
      <Card className="glass-panel animate-reveal-up [animation-delay:180ms]">
        <CardHeader className="border-b border-yellow-100/10">
          <CardTitle className="flex items-center gap-3 text-2xl"><CalendarDays className="text-yellow-300" /> Create a daily spark</CardTitle>
          <p className="text-sm text-muted-foreground">Publish five precise targets and give the community something to chase.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Five targets <span className="font-normal text-muted-foreground">(milliseconds)</span></Label>
              <div className="grid gap-3 sm:grid-cols-5">
                {rounds.map((r, i) => (
                  <motion.div key={i} whileHover={{ y: -3 }} className="relative">
                    <span className="absolute left-3 top-2 text-[10px] font-black uppercase tracking-widest text-orange-300">Round {i + 1}</span>
                    <Input className="h-16 pt-6 text-lg font-bold" type="number" required min={100} max={10000} value={r} onChange={e => { const newRounds = [...rounds]; newRounds[i] = e.target.value; setRounds(newRounds); }} />
                  </motion.div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 font-black text-slate-950 shadow-[0_12px_30px_rgba(255,119,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(255,119,0,0.4)]">
              <Flame size={18} /> {loading ? "Igniting challenge..." : "Publish today's challenge"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-panel animate-reveal-up [animation-delay:260ms]">
        <CardHeader className="border-b border-yellow-100/10">
          <CardTitle className="flex items-center gap-2 text-2xl"><Users className="text-yellow-300" /> Player management</CardTitle>
          <p className="text-sm text-muted-foreground">Keep the community healthy, welcoming, and competitive.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-300/15 bg-orange-300/5 p-3">
            <RotateCcw size={16} className="text-orange-300" />
            <Label htmlFor="reset-date" className="text-sm">Reset challenge date</Label>
            <Input id="reset-date" type="date" className="h-9 w-auto" value={resetDate} onChange={(event) => setResetDate(event.target.value)} />
            <span className="text-xs text-muted-foreground">Use the action on a player below to let them replay.</span>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? <p className="text-muted-foreground">Loading users...</p> : (
            <div className="space-y-3">
              {users.map((managedUser) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={managedUser.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-100/10 bg-black/10 p-4 transition-colors hover:border-orange-300/30 hover:bg-orange-300/5">
                  <div>
                    <div className="font-semibold">@{managedUser.username} {managedUser.role === "ADMIN" && <span className="ml-2 text-xs text-yellow-400">ADMIN</span>}</div>
                    <div className="text-xs text-muted-foreground">🔥 {managedUser.streak?.currentStreak ?? 0} day streak · {managedUser.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateUser(managedUser.id, "status", managedUser.status === "BANNED" ? "ACTIVE" : "BANNED")}><Ban size={14} /> {managedUser.status === "BANNED" ? "Unban" : "Ban"}</Button>
                    <Button size="sm" variant="outline" onClick={() => updateUser(managedUser.id, "role", managedUser.role === "ADMIN" ? "USER" : "ADMIN")}><ShieldCheck size={14} /> {managedUser.role === "ADMIN" ? "Remove admin" : "Make admin"}</Button>
                    <Button size="sm" variant="outline" onClick={() => resetChallenge(managedUser.id, managedUser.username)}><RotateCcw size={14} /> Reset play</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteUser(managedUser.id)}><Trash2 size={14} /></Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
