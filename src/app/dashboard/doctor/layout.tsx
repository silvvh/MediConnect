import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorDashboardClient } from "@/components/dashboard/doctor-dashboard-client";

export default async function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "doctor") {
    redirect("/dashboard");
  }

  return (
    <RoleGuard allowedRoles={["doctor"]}>
      <DoctorDashboardClient>{children}</DoctorDashboardClient>
    </RoleGuard>
  );
}
