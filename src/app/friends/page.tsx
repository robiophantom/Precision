"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, UserPlus, Users, X, Search, Flame, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Friend = { friendshipId: string; user: { id: string; username: string } };
type SearchResult = {
  user: { id: string; username: string; avatarUrl: string | null; createdAt: string; streak: { currentStreak: number; longestStreak: number } | null };
  relationship: { status: string; outgoing: boolean } | null;
};

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [username, setUsername] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFriends = async () => {
    const response = await fetch("/api/friends");
    if (!response.ok) return;
    const data = await response.json();
    setFriends(data.friends ?? []);
    setPendingRequests(data.pendingRequests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFriends(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const searchUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearching(true);
    const response = await fetch(`/api/friends/search?username=${encodeURIComponent(username.trim())}`);
    const data = await response.json();
    setSearching(false);
    if (!response.ok) {
      setSearchResult(null);
      return toast.error(data.error ?? "Could not find that player");
    }
    setSearchResult(data);
  };

  const sendRequest = async () => {
    if (!searchResult) return;
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: searchResult.user.username }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error ?? "Could not send request");
    setSearchResult({ ...searchResult, relationship: { status: "PENDING", outgoing: true } });
    toast.success(`Friend request sent to @${searchResult.user.username}`);
  };

  const respond = async (friendshipId: string, action: "ACCEPT" | "REJECT") => {
    const response = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    if (response.ok) await loadFriends();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your crew...</div>;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Back to game</Link>
          <h1 className="text-4xl font-black tracking-tight">Your crew <span className="text-orange-400">✦</span></h1>
        </div>
        <Users className="text-blue-300" size={32} />
      </div>

      <Card className="glass-panel border-orange-400/20 bg-orange-400/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus size={18} /> Add a friend</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={searchUser} className="flex gap-3">
            <Input value={username} onChange={(event) => { setUsername(event.target.value); setSearchResult(null); }} placeholder="Search by exact username" required />
            <Button type="submit" disabled={searching}><Search size={16} /> {searching ? "Searching..." : "Search"}</Button>
          </form>
          {searchResult && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-200/15 bg-black/15 p-4 animate-reveal-up">
              <div className="flex items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-500 text-xl font-black text-slate-950">{searchResult.user.username[0].toUpperCase()}</div>
                <div>
                  <p className="text-lg font-bold">@{searchResult.user.username}</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Flame size={14} className="text-orange-300" /> {searchResult.user.streak?.currentStreak ?? 0} day streak <span>·</span> <CalendarDays size={14} /> Joined {new Date(searchResult.user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {searchResult.relationship ? (
                <span className="rounded-full bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {searchResult.relationship.status === "ACCEPTED" ? "Already connected" : searchResult.relationship.outgoing ? "Request pending" : "Check your requests"}
                </span>
              ) : <Button onClick={sendRequest} className="bg-gradient-to-r from-yellow-300 to-orange-500 font-bold text-slate-950">Connect with @{searchResult.user.username}</Button>}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Friend requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.friendshipId} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                <span className="font-semibold">@{request.user.username}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respond(request.friendshipId, "ACCEPT")}><Check size={16} /></Button>
                  <Button size="sm" variant="outline" onClick={() => respond(request.friendshipId, "REJECT")}><X size={16} /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Friends <span className="text-muted-foreground">({friends.length})</span></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {friends.length === 0 ? <p className="text-muted-foreground">No friends yet. Invite someone and start a leaderboard rivalry.</p> : friends.map((friend) => (
            <div key={friend.friendshipId} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-orange-400 font-bold text-slate-950">{friend.user.username[0].toUpperCase()}</div>
              <span className="font-semibold">@{friend.user.username}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
