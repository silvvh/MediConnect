"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Stethoscope,
  Pill,
  ClipboardList,
  History,
  Clock,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types";

interface UserProfile {
  full_name: string | null;
  email: string | null;
  role: UserRole | null;
}

// Menu para pacientes
const patientNavigation = [
  { name: "Início", href: "/dashboard/patient", icon: LayoutDashboard },
  { name: "Agendar Consulta", href: "/dashboard/schedule", icon: Calendar },
  { name: "Minhas Consultas", href: "/dashboard/consultations", icon: Clock },
  { name: "Histórico Médico", href: "/dashboard/medical-history", icon: History },
  { name: "Documentos", href: "/dashboard/documents", icon: FileText },
  { name: "Médicos", href: "/dashboard/doctors", icon: Users },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

// Menu para médicos
const doctorNavigation = [
  { name: "Início", href: "/dashboard/doctor", icon: LayoutDashboard },
  { name: "Agenda", href: "/dashboard/schedule", icon: Calendar },
  { name: "Consultas de Hoje", href: "/dashboard/consultations", icon: Clock },
  { name: "Prontuários", href: "/dashboard/medical-records", icon: FileText },
  { name: "Receitas", href: "/dashboard/prescriptions", icon: Pill },
  { name: "Laudos", href: "/dashboard/medical-reports", icon: ClipboardList },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

// Menu para admin
const adminNavigation = [
  { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
  { name: "Usuários", href: "/dashboard/admin/users", icon: Users },
  { name: "Médicos", href: "/dashboard/admin/doctors", icon: Stethoscope },
  { name: "Relatórios", href: "/dashboard/admin/reports", icon: FileText },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

// Menu para atendentes
const attendantNavigation = [
  { name: "Dashboard", href: "/dashboard/attendant", icon: LayoutDashboard },
  { name: "Tickets", href: "/dashboard/attendant/tickets", icon: FileText },
  { name: "Chat", href: "/dashboard/attendant/chat", icon: Users },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email, role")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile(data);
        } else {
          // Fallback para email do auth
          setProfile({
            full_name: user.email?.split("@")[0] || "Usuário",
            email: user.email || null,
            role: null,
          });
        }
      }
    };
    loadProfile();
  }, []);

  // Selecionar menu baseado no role
  const getNavigation = () => {
    switch (profile?.role) {
      case "patient":
        return patientNavigation;
      case "doctor":
        return doctorNavigation;
      case "admin":
        return adminNavigation;
      case "attendant":
        return attendantNavigation;
      default:
        return patientNavigation; // Default para paciente
    }
  };

  const navigation = getNavigation();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg" />
            <span className="font-bold">MediConnect</span>
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                isActive
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive
                    ? "text-primary-600"
                    : "text-gray-500 group-hover:text-gray-700"
                )}
              />
              {!collapsed && (
                <span className="text-sm">{item.name}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 bg-primary-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(profile?.full_name || null)}
          </div>
          {!collapsed && (
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">
                {profile?.full_name || "Usuário"}
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
  );
}

