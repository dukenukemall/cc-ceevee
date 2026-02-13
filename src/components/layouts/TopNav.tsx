"use client";

import { Button } from "@/components/ui/button";
import { ScanSearch, Menu } from "lucide-react";

interface TopNavProps {
  onMenuToggle: () => void;
}

export function TopNav({ onMenuToggle }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden transition-all duration-200 hover:bg-accent active:scale-90"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ScanSearch className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Ceevee</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-sm transition-all duration-200 hover:bg-accent active:scale-[0.97]"
          >
            Log in
          </Button>
          <Button
            className="text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
          >
            Sign up
          </Button>
        </div>
      </div>
    </header>
  );
}
