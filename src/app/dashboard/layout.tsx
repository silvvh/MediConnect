import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
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

  // Se não tiver perfil, redirecionar para onboarding
  if (!profile) {
    redirect("/onboarding");
  }

  // Redirecionar para dashboard específico do role
  // Os layouts específicos (patient/layout.tsx e doctor/layout.tsx) cuidam do resto
  return <>{children}</>;
}
