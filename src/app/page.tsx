import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">AppBar</h1>
        <p className="text-xl text-muted-foreground">
          Sistema de gestión de pedidos para bares y restaurantes
        </p>
        <p className="text-muted-foreground">
          Carta digital con QR, pedidos en tiempo real y panel de control para el dueño.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button asChild size="lg">
            <Link href="/login">Acceder al panel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
