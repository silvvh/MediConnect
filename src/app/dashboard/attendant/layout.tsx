import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { AttendantDashboardClient } from "@/components/dashboard/attendant-dashboard-client";

export default async function AttendantDashboardLayout({
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

  if (profile?.role !== "attendant") {
    redirect("/dashboard");
  }

  return (
    <RoleGuard allowedRoles={["attendant"]}>
      <AttendantDashboardClient>{children}</AttendantDashboardClient>
    </RoleGuard>
  );
}

