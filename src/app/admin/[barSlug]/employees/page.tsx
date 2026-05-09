import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffAccounts } from "@/actions/staff";
import { EmployeesManager } from "@/components/admin/EmployeesManager";

interface EmployeesPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
  const { barSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bar_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect(`/admin/${barSlug}/orders`);
  }

  const staff = await getStaffAccounts(profile.bar_id!);

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Empleados</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona las cuentas de tus empleados. Solo podrán acceder a pedidos.
        </p>
      </div>
      <EmployeesManager barId={profile.bar_id!} barSlug={barSlug} staff={staff} />
    </div>
  );
}
