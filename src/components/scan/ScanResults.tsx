"use client";

import { ScanSummary } from "./ScanSummary";
import { ScanResultCard } from "./ScanResultCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe } from "lucide-react";
import type { ScanWithResults } from "@/types/scan";

interface ScanResultsProps {
  scan: ScanWithResults;
  onReset: () => void;
}

export function ScanResults({ scan, onReset }: ScanResultsProps) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <Button
        variant="ghost"
        onClick={onReset}
        className="text-sm text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Scan another CV
      </Button>

      <ScanSummary
        candidateName={scan.extracted_name}
        summary={scan.summary || "No summary available."}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Globe className="h-4 w-4" />
          <span>Web findings ({scan.scan_results.length})</span>
        </div>
        {scan.scan_results.map((result) => (
          <ScanResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
