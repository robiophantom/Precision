"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-border/60 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
      aria-label="Go back"
    >
      <ArrowLeft size={16} /> Back
    </button>
  );
}
