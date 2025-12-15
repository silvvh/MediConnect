import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { PatientDashboardClient } from "@/components/dashboard/patient-dashboard-client";

export default async function PatientDashboardLayout({
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

  if (profile?.role !== "patient") {
    redirect("/dashboard");
  }

  return (
    <RoleGuard allowedRoles={["patient"]}>
      <PatientDashboardClient>{children}</PatientDashboardClient>
    </RoleGuard>
  );
}

