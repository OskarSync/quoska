import { redirect } from "next/navigation";
import { createClient } from "@/config/supabase/server";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AppShell } from "@/components/app-shell";
import type { Role } from "@/types";

import type { ReactNode } from "react";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Try to get employee record. If claims aren't set yet (race condition
  // right after registration), try using admin client as fallback.
  let role: Role = "employee";
  let userName = "Benutzer";

  const { data: employee } = await supabase
    .from("employees")
    .select("id, role, first_name, last_name")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (employee) {
    role = employee.role;
    userName = `${employee.first_name} ${employee.last_name}`.trim() || "Benutzer";
  } else {
    // Fallback: check if user exists in employees table at all
    // This handles the case where JWT claims haven't propagated yet
    const { createAdminClient } = await import("@/config/supabase/server");
    const admin = createAdminClient();
    const { data: adminEmployee } = await admin
      .from("employees")
      .select("id, role, first_name, last_name")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (adminEmployee) {
      role = adminEmployee.role;
      userName = `${adminEmployee.first_name} ${adminEmployee.last_name}`.trim() || "Benutzer";

      // Re-set claims since they might be missing
      await admin.rpc("set_employee_claims", { user_uuid: user.id });
    } else {
      // No employee record at all — something went wrong
      redirect("/login");
    }
  }

  return (
    <SupabaseProvider>
      <QueryProvider>
        <AppShell role={role} userName={userName}>
          {children}
        </AppShell>
      </QueryProvider>
    </SupabaseProvider>
  );
}
