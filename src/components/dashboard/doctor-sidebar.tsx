"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/hooks/use-swipe";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  FileText,
  Pill,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  CalendarDays,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface UserProfile {
  full_name: string | null;
  email: string | null;
}

const doctorNavigation = [
  { name: "Dashboard", href: "/dashboard/doctor", icon: LayoutDashboard },
  { name: "Agenda", href: "/dashboard/doctor/schedule", icon: Calendar },
  { name: "Consultas", href: "/dashboard/doctor/consultations", icon: Clock },
  {
    name: "Disponibilidade",
    href: "/dashboard/doctor/availability",
    icon: CalendarDays,
  },
  {
    name: "Prontuários",
    href: "/dashboard/doctor/medical-records",
    icon: FileText,
  },
  { name: "Receitas", href: "/dashboard/doctor/prescriptions", icon: Pill },
  {
    name: "Laudos",
    href: "/dashboard/doctor/medical-reports",
    icon: ClipboardList,
  },
  { name: "Configurações", href: "/dashboard/doctor/settings", icon: Settings },
];

interface DoctorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DoctorSidebar({ isOpen = true, onClose }: DoctorSidebarProps) {
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
            full_name: user.email?.split("@")[0] || "Médico",
            email: user.email || null,
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
    if (!name) return "M";
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
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg" />
            <span className="font-bold text-green-600">MediConnect</span>
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
        <div className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg" />
              <span className="font-bold text-green-600">MediConnect</span>
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
          {doctorNavigation.map((item) => {
            // Para Dashboard, verificar apenas rota exata
            // Para outras rotas, verificar rota exata ou sub-rotas
            const isActive =
              item.href === "/dashboard/doctor"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                  isActive
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive
                      ? "text-green-600"
                      : "text-gray-500 group-hover:text-gray-700"
                  )}
                />
                {!collapsed && <span className="text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200 mt-auto flex-shrink-0">
          <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(profile?.full_name || null)}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">
                  {profile?.full_name || "Médico"}
                </p>
                <p className="text-xs text-gray-500">{profile?.email || ""}</p>
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
