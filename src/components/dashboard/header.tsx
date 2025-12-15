"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Plus, Menu } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Search - Oculto em mobile muito pequeno, visível em tablets+ */}
      <div className="flex-1 max-w-md hidden sm:block ml-4 md:ml-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          <Input
            placeholder="Buscar..."
            className="pl-9 md:pl-10 h-9 md:h-10 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-primary-200 text-sm md:text-base"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Bell className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
