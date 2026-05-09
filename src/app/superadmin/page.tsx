import { createClient } from "@/lib/supabase/server";
import { BarListTable } from "@/components/superadmin/BarListTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SuperadminPage() {
  const supabase = await createClient();

  const { data: bars } = await supabase
    .from("bars")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de bares</h1>
        <Button asChild>
          <Link href="/superadmin/bars/new">+ Nuevo bar</Link>
        </Button>
      </div>
      <BarListTable bars={bars ?? []} />
    </div>
  );
}
