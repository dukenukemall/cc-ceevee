"use client";

import { FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadedFileProps {
  file: File;
  onClear: () => void;
  onScan: () => void;
  isScanning: boolean;
}

export function UploadedFile({ file, onClear, onScan, isScanning }: UploadedFileProps) {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{sizeMB} MB — PDF</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={isScanning}
          className="shrink-0 h-9 w-9 rounded-full transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-90"
          onClick={onClear}
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Button
        onClick={onScan}
        disabled={isScanning}
        className="w-full mt-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
        size="lg"
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scanning...
          </>
        ) : (
          "Scan CV"
        )}
      </Button>
    </div>
  );
}
