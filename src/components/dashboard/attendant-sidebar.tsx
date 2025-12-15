"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/hooks/use-swipe";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Clock,
  CheckCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface UserProfile {
  full_name: string | null;
  email: string | null;
}

const attendantNavigation = [
  { name: "Dashboard", href: "/dashboard/attendant", icon: LayoutDashboard },
  { name: "Tickets", href: "/dashboard/attendant/tickets", icon: MessageSquare },
  { name: "Em Andamento", href: "/dashboard/attendant/in-progress", icon: Clock },
  { name: "Resolvidos", href: "/dashboard/attendant/resolved", icon: CheckCircle },
  { name: "Usuários", href: "/dashboard/attendant/users", icon: Users },
  { name: "Configurações", href: "/dashboard/attendant/settings", icon: Settings },
];

interface AttendantSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AttendantSidebar({ isOpen = true, onClose }: AttendantSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Fechar sidebar em mobile ao clicar em link
  const handleLinkClick = () => {
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  // Swipe para fechar drawer em mobile
  const sidebarRef = useSwipe({
    onSwipeLeft: () => {
      if (window.innerWidth < 1024 && onClose) {
        onClose();
      }
    },
    threshold: 50,
    preventDefault: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile(data);
        } else {
          setProfile({
            full_name: user.email?.split("@")[0] || "Atendente",
            email: user.email,
          });
        }
      }
    };
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string | null) => {
    if (!name) return "AT";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 z-50",
          // Mobile: drawer que desliza
          "fixed lg:static inset-y-0 left-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: sidebar fixo
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Botão fechar mobile */}
        <div className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg" />
            <span className="font-bold text-orange-600">MediConnect</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo - Oculto em mobile (já está no topo) */}
        <div className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-gray-200 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg" />
              <span className="font-bold text-orange-600">MediConnect</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {attendantNavigation.map((item) => {
          const isActive = item.href === "/dashboard/attendant"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                isActive
                  ? "bg-orange-50 text-orange-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  isActive
                    ? "text-orange-600"
                    : "text-gray-500 group-hover:text-gray-700"
                )}
              />
              {!collapsed && (
                <span className="text-sm">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 mt-auto shrink-0">
        <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(profile?.full_name || null)}
          </div>
          {!collapsed && (
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">
                {profile?.full_name || "Atendente"}
              </p>
              <p className="text-xs text-gray-500">
                {profile?.email || ""}
              </p>
            </div>
          )}
        </button>

        {!collapsed && (
          <button
            onClick={handleSignOut}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        )}
      </div>
    </aside>
    </>
  );
}

