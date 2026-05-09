"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput, validatePassword } from "@/components/ui/password-input";
import { createBar } from "@/actions/bars";
import { toast } from "@/hooks/useToast";

export default function NewBarPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerName: "",
  });
  const [loading, setLoading] = useState(false);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug || generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.ownerEmail || !form.ownerPassword)
      return;
    if (!validatePassword(form.ownerPassword).isValid) {
      toast({ title: "La contraseña no cumple los requisitos de seguridad", variant: "destructive" });
      return;
    }

    setLoading(true);
    const result = await createBar(form);
    setLoading(false);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Bar creado correctamente", variant: "success" });
      router.push("/superadmin");
    }
  };

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Crear nuevo bar</CardTitle>
          <CardDescription>
            Rellena los datos del local y la cuenta del dueño.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del bar *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Bar El Rincón"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="bar-el-rincon"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL del cliente:{" "}
                <code>
                  {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/{form.slug || "slug"}
                </code>
              </p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">
                Cuenta del dueño
              </p>

              <div className="space-y-2">
                <Label htmlFor="ownerName">Nombre del dueño</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerName: e.target.value }))
                  }
                  placeholder="Juan García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email del dueño *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                  }
                  placeholder="dueno@bar.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerPassword">Contraseña inicial *</Label>
                <PasswordInput
                  id="ownerPassword"
                  value={form.ownerPassword}
                  onChange={(v) => setForm((f) => ({ ...f, ownerPassword: v }))}
                  placeholder="Contraseña segura"
                />
                <p className="text-xs text-muted-foreground">
                  Compártela con el dueño para su primer acceso.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/superadmin")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !validatePassword(form.ownerPassword).isValid}
                className="flex-1"
              >
                {loading ? "Creando..." : "Crear bar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
