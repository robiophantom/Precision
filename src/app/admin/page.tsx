"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [rounds, setRounds] = useState<string[]>(["1570", "3280", "840", "4610", "2350"]);
  const [loading, setLoading] = useState(false);

  if (!user) return <div className="p-8">Unauthorized</div>;

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
    <div className="p-8 max-w-xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Daily Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Date (YYYY-MM-DD)</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Rounds (Targets in MS)</Label>
              {rounds.map((r, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-8">R{i + 1}</span>
                  <Input 
                    type="number" 
                    required 
                    min={100}
                    max={10000}
                    value={r} 
                    onChange={e => {
                      const newRounds = [...rounds];
                      newRounds[i] = e.target.value;
                      setRounds(newRounds);
                    }} 
                  />
                </div>
              ))}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              Create Published Challenge
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
