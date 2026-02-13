"use client";

import { Upload, History, Settings, FileText, BarChart3 } from "lucide-react";
import { SidebarNavItem } from "./SidebarNavItem";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
}

export function Sidebar({ open }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 z-30",
        "bg-card border-r border-border",
        "flex flex-col gap-2 p-4",
        "transition-transform duration-300 ease-out",
        "lg:translate-x-0",
        !open && "-translate-x-full"
      )}
    >
      <nav className="flex flex-col gap-1">
        <SidebarNavItem icon={Upload} label="Upload CV" active />
        <SidebarNavItem icon={FileText} label="My Scans" />
        <SidebarNavItem icon={BarChart3} label="Insights" />
        <SidebarNavItem icon={History} label="History" />
      </nav>

      <Separator className="my-2" />

      <nav className="flex flex-col gap-1 mt-auto">
        <SidebarNavItem icon={Settings} label="Settings" />
      </nav>
    </aside>
  );
}
