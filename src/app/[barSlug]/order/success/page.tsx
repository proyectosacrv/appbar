"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

interface SuccessPageProps {
  params: Promise<{ barSlug: string }>;
  searchParams: Promise<{ merged?: string }>;
}

export default function OrderSuccessPage({ params, searchParams }: SuccessPageProps) {
  const { barSlug } = use(params);
  const { merged } = use(searchParams);
  const wasMerged = merged === "1";
  const tableNumber = useCart((s) => s.tableNumber);

  useEffect(() => {
    window.history.replaceState(null, "", `/${barSlug}/order/success`);
  }, [barSlug]);

  // Preserve mesa so the back-to-menu link keeps order capability.
  const menuHref = tableNumber
    ? `/${barSlug}?mesa=${tableNumber}`
    : `/${barSlug}`;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className={`rounded-full p-6 ${wasMerged ? "bg-blue-100" : "bg-green-100"}`}>
        {wasMerged ? (
          <PlusCircle className="h-16 w-16 text-blue-600" />
        ) : (
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {wasMerged ? "¡Productos añadidos!" : "¡Pedido enviado!"}
        </h1>
        <p className="text-muted-foreground max-w-xs">
          {wasMerged
            ? "Tus productos se han añadido al pedido que ya estaba en preparación en tu mesa. El personal lo tendrá en cuenta."
            : "Tu pedido ha sido recibido y el personal del bar comenzará a prepararlo. El pago se realizará cuando te traigan los productos."}
        </p>
      </div>

      <Button asChild size="lg" className="mt-4">
        <Link href={menuHref}>
          {wasMerged ? "Seguir mirando la carta" : "Hacer otro pedido"}
        </Link>
      </Button>
    </div>
  );
}
