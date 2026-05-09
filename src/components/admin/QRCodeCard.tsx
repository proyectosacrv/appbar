"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QRCodeCardProps {
  tableNumber: number;
  barSlug: string;
  appUrl: string;
}

export function QRCodeCard({ tableNumber, barSlug, appUrl }: QRCodeCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const menuUrl = `${appUrl}/${barSlug}?mesa=${tableNumber}`;

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 300;
    canvas.width = size;
    canvas.height = size + 40;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 25, 10, 250, 250);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Mesa ${tableNumber}`, size / 2, size + 25);

      const link = document.createElement("a");
      link.download = `mesa-${tableNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
  };

  return (
    <Card className="text-center">
      <CardContent className="pt-4 flex flex-col items-center gap-3">
        <p className="font-bold text-lg">Mesa {tableNumber}</p>
        <div className="rounded-lg border p-2 bg-white">
          <QRCodeSVG
            ref={svgRef}
            value={menuUrl}
            size={160}
            includeMargin
          />
        </div>
        <p className="text-xs text-muted-foreground break-all max-w-[180px]">
          {menuUrl}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-1 w-full"
        >
          <Download className="h-4 w-4" />
          Descargar PNG
        </Button>
      </CardContent>
    </Card>
  );
}
