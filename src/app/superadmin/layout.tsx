import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "superadmin") redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">AppBar — Superadmin</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/superadmin" className="hover:underline">Bares</Link>
            <Link href="/superadmin/bars/new" className="hover:underline font-medium">+ Nuevo bar</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
