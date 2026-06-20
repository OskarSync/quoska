/**
 * Employees Page — /app/employees
 *
 * Server component that provides initial data to the client-side EmployeeList.
 * Only accessible to admin and manager roles (checked via layout).
 */

import { createClient } from "@/config/supabase/server";
import { EmployeeList } from "@/components/employee-list";

export default async function EmployeesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get employee record for current user
  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  const isAdmin = employee?.role === "admin";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mitarbeiter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verwalte dein Team
        </p>
      </div>

      <EmployeeList isAdmin={isAdmin} />
    </div>
  );
}
