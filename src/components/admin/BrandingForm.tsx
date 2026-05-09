"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadBarLogo, updateBarBranding } from "@/actions/bars";
import { toast } from "@/hooks/useToast";

interface BrandingFormProps {
  barId: string;
  currentLogoUrl: string | null;
  currentThemeColor: string | null;
}

const COLOR_PRESETS = [
  "#000000", // negro (default)
  "#1e40af", // azul
  "#0f766e", // teal
  "#16a34a", // verde
  "#b91c1c", // rojo
  "#c2410c", // naranja
  "#a16207", // ámbar oscuro
  "#7c3aed", // púrpura
];

export function BrandingForm({
  barId,
  currentLogoUrl,
  currentThemeColor,
}: BrandingFormProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [color, setColor] = useState<string>(currentThemeColor ?? "#000000");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadBarLogo(formData, barId);
    setUploading(false);

    if (result.error) {
      toast({
        title: "Error al subir logo",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    if (result.url) {
      setLogoUrl(result.url);
      toast({ title: "Logo subido. Recuerda guardar para aplicarlo.", variant: "success" });
    }
  };

  const handleRemoveLogo = () => setLogoUrl(null);

  const handleResetColor = () => setColor("#000000");

  const handleSave = async () => {
    setSaving(true);
    const result = await updateBarBranding({
      barId,
      logoUrl: logoUrl ?? null,
      themeColor: color === "#000000" ? null : color,
    });
    setSaving(false);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Identidad guardada", variant: "success" });
    router.refresh();
  };

  const dirty =
    logoUrl !== currentLogoUrl ||
    (color === "#000000" ? null : color) !== (currentThemeColor ?? null);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo */}
      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Logo</h2>
          <p className="text-xs text-muted-foreground">
            Aparecerá en la cabecera de la carta y en el panel del bar. PNG o
            SVG con fondo transparente quedan mejor. Máx. 5 MB.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted/30 overflow-hidden">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
                unoptimized
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? "Subiendo..." : logoUrl ? "Cambiar" : "Subir logo"}
              </span>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
                disabled={uploading}
              />
            </Label>
            {logoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRemoveLogo}
              >
                <X className="h-4 w-4" />
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Color principal</h2>
          <p className="text-xs text-muted-foreground">
            Se usa para botones y acentos en la carta y el panel. Usa un color
            oscuro para que el texto blanco encima sea legible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <span className="text-xs text-muted-foreground mx-2">o personalizado:</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-12 rounded-md border bg-background cursor-pointer"
          />
          <span className="text-xs font-mono text-muted-foreground">
            {color}
          </span>
          {color !== "#000000" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetColor}
              className="text-xs"
            >
              Restablecer
            </Button>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-md border p-3 mt-3">
          <p className="text-xs text-muted-foreground mb-2">Vista previa</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: color }}
            >
              Botón principal
            </button>
            <span
              className="text-sm font-medium"
              style={{ color }}
            >
              Texto destacado
            </span>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
        {!dirty && (
          <span className="text-xs text-muted-foreground">
            No hay cambios pendientes
          </span>
        )}
      </div>
    </div>
  );
}
