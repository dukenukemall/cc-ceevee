"use client";

import { User } from "lucide-react";

interface ScanSummaryProps {
  candidateName: string | null;
  summary: string;
}

export function ScanSummary({ candidateName, summary }: ScanSummaryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {candidateName || "Candidate"}
          </h2>
          <p className="text-xs text-muted-foreground">AI-generated summary</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
    </div>
  );
}
