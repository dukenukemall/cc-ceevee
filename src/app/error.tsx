"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[ErrorBoundary]", error);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-sm">
        An unexpected error occurred. Please try again.
      </p>
      <Button
        onClick={reset}
        className="mt-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
      >
        Try Again
      </Button>
    </main>
  );
}
