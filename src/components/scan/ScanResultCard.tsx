"use client";

import { ExternalLink } from "lucide-react";
import type { ScanResult } from "@/types/scan";

interface ScanResultCardProps {
  result: ScanResult;
}

export function ScanResultCard({ result }: ScanResultCardProps) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-card p-4 transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {result.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{result.url}</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
      </div>
      {result.content && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{result.content}</p>
      )}
    </a>
  );
}
