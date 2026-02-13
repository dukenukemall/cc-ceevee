"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DropAreaProps {
  isDragging: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onBrowse: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DropArea({
  isDragging, onDrop, onDragOver, onDragLeave, onBrowse, inputRef, onInputChange,
}: DropAreaProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onBrowse}
      className={cn(
        "w-full max-w-2xl cursor-pointer rounded-2xl border-2 border-dashed",
        "flex flex-col items-center justify-center gap-4 px-8 py-16 md:py-24",
        "transition-all duration-300 ease-out",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 hover:shadow-lg",
        "active:scale-[0.99]"
      )}
      role="button"
      tabIndex={0}
      aria-label="Upload PDF file"
    >
      <div className={cn(
        "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300",
        isDragging ? "bg-primary/10 text-primary scale-110" : "bg-muted text-muted-foreground"
      )}>
        <Upload className="h-8 w-8" />
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">
          {isDragging ? "Drop your CV here" : "Drag & drop your CV"}
        </p>
        <p className="text-sm text-muted-foreground">or click to browse. PDF files only.</p>
      </div>

      <Button
        variant="outline"
        className="mt-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
        onClick={(e) => { e.stopPropagation(); onBrowse(); }}
      >
        Choose File
      </Button>

      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onInputChange} />
    </div>
  );
}
