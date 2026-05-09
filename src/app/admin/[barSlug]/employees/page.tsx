import { redirect } from "next/navigation";
import { getAdminBarContext } from "@/lib/admin-context";
import { getStaffAccounts } from "@/actions/staff";
import { EmployeesManager } from "@/components/admin/EmployeesManager";

interface EmployeesPageProps {
  params: Promise<{ barSlug: string }>;
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
  const { barSlug } = await params;
  const ctx = await getAdminBarContext(barSlug);
  if (!ctx) return null;

  if (ctx.profile.role !== "owner") {
    redirect(`/admin/${barSlug}/orders`);
  }

  const staff = await getStaffAccounts(ctx.profile.bar_id);

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Empleados</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona las cuentas de tus empleados. Solo podrán acceder a pedidos.
        </p>
      </div>
      <EmployeesManager barId={ctx.profile.bar_id} barSlug={barSlug} staff={staff} />
    </div>
  );
}
