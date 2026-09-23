"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = window.setInterval(() => setVerificationCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [verificationCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Logged in successfully");
        await refreshUser();
        router.push("/");
      } else {
        const isLegacyAccount = data.needsEmail || data.needsVerification || res.status === 428 || data.error?.toLowerCase().includes("add and verify a gmail") || data.error?.toLowerCase().includes("verify your gmail");
        if (isLegacyAccount) {
          setNeedsEmail(true);
          setNeedsVerification(Boolean(data.needsVerification));
          toast.info(data.needsVerification ? "Your Gmail is not verified yet." : "Add and verify your Gmail before playing.");
        } else {
          toast.error(data.error || "Login failed");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4"><div className="w-full max-w-sm"><BackButton fallback="/" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your credentials to access Precision.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Gmail</Label>
              <Input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative"><Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </div>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            {needsEmail && (
              <div className="space-y-3 rounded-md border border-orange-400/40 bg-orange-400/10 p-3 text-sm">
                <p className="text-orange-100">{needsVerification ? "Your saved Gmail is not verified. Resend the link or replace it with another Gmail address." : "This older account does not have a Gmail address yet. Add and verify one to continue."}</p>
                {needsVerification && (
                  <Button type="button" className="w-full" disabled={verificationCooldown > 0} onClick={async () => {
                    const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }) });
                    const resendData = await response.json();
                    if (response.ok) {
                      setVerificationCooldown(60);
                      toast.success("Verification link sent successfully.");
                    } else {
                      if (resendData.retryAfterSeconds) setVerificationCooldown(resendData.retryAfterSeconds);
                      toast.error(resendData.error);
                    }
                  }}>
                    {verificationCooldown > 0 ? `Resend link in ${verificationCooldown}s` : "Resend verification link"}
                  </Button>
                )}
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/add-email?identifier=${encodeURIComponent(identifier.trim())}`)}>
                  Add Gmail and verify
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card></div>
    </div>
  );
}
