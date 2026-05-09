"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    // Get profile to determine where to redirect
    type ProfileWithBar = { role: string; bar_id: string | null; bars: { slug: string } | null };
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, bar_id, bars(slug)")
      .eq("id", data.user.id)
      .single() as unknown as { data: ProfileWithBar | null; error: unknown };

    if (!profile) {
      setError("Perfil no encontrado. Contacta con el administrador.");
      setLoading(false);
      return;
    }

    if (profile.role === "superadmin") {
      router.push("/superadmin");
    } else if (profile.role === "owner" || profile.role === "staff") {
      const bar = profile.bars as unknown as { slug: string } | null;
      if (bar?.slug) {
        router.push(`/admin/${bar.slug}/orders`);
      } else {
        setError("No tienes un bar asignado. Contacta con el administrador.");
        setLoading(false);
      }
    } else {
      setError("Tu cuenta no tiene un rol válido. Contacta con el administrador.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">AppBar</CardTitle>
          <CardDescription>Accede a tu panel de administración</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accediendo..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
