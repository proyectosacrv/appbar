"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { createOrder } from "@/actions/orders";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";

interface OrderPageProps {
  params: Promise<{ barSlug: string }>;
}

export default function OrderPage({ params }: OrderPageProps) {
  const { barSlug } = use(params);
  const router = useRouter();
  const { items, tableNumber, getTotalPrice, clearCart } = useCart();
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">Tu carrito está vacío</p>
        <Button onClick={() => router.push(`/${barSlug}`)}>
          Volver a la carta
        </Button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (submittedRef.current) return;
    if (!tableNumber) {
      toast({
        title: "Indica tu mesa",
        description: "Vuelve a la carta y selecciona tu número de mesa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: bar } = await supabase
      .from("bars")
      .select("id")
      .eq("slug", barSlug)
      .single();

    if (!bar) {
      toast({ title: "Error", description: "Bar no encontrado", variant: "destructive" });
      setLoading(false);
      return;
    }

    submittedRef.current = true;

    const result = await createOrder({
      barId: bar.id,
      tableNumber,
      items,
      notes,
    });

    if (result.error) {
      submittedRef.current = false;
      setLoading(false);
      toast({ title: "Error al hacer el pedido", description: result.error, variant: "destructive" });
    } else {
      clearCart();
      // replace so back button skips confirmation and goes to the menu
      router.replace(`/${barSlug}/order/success?merged=${result.merged ? "1" : "0"}`);
    }
  };

  // Step 1: Review
  if (!confirmed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${barSlug}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Revisar pedido</h1>
        </div>

        {tableNumber && (
          <div className="rounded-lg bg-muted px-4 py-2 text-sm font-medium">
            Mesa {tableNumber}
          </div>
        )}

        <div className="rounded-xl border divide-y">
          {items.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {item.quantity}× {item.product.name}
                </p>
                {item.notes && (
                  <p className="text-sm text-muted-foreground">Nota: {item.notes}</p>
                )}
              </div>
              <span className="font-semibold">
                {formatCurrency(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between p-4 font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(getTotalPrice())}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas para el pedido (opcional)</Label>
          <Textarea
            placeholder="Alergias, preferencias, instrucciones especiales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Revisa bien tu pedido</p>
              <p className="text-yellow-700 mt-1">
                Una vez confirmado, el personal del bar comenzará a prepararlo. El pago se realizará cuando el camarero traiga los productos a tu mesa.
              </p>
            </div>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base"
          onClick={() => setConfirmed(true)}
        >
          Sí, confirmar pedido
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/${barSlug}`)}
        >
          Volver a la carta
        </Button>
      </div>
    );
  }

  // Step 2: Final confirmation
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setConfirmed(false)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Confirmación final</h1>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-800">¿Listo para enviar?</p>
            <p className="text-green-700 mt-1">
              Tu pedido de <strong>{formatCurrency(getTotalPrice())}</strong> para la{" "}
              <strong>Mesa {tableNumber}</strong> será enviado al personal del bar.
            </p>
          </div>
        </div>
      </div>

      <Button
        className="w-full h-12 text-base"
        onClick={handlePlaceOrder}
        disabled={loading || submittedRef.current}
      >
        {loading ? "Enviando pedido..." : "Enviar pedido ahora"}
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setConfirmed(false)}
        disabled={loading}
      >
        Revisar de nuevo
      </Button>
    </div>
  );
}
