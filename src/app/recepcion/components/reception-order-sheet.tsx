import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ReceptionOrder } from "../types";

type ReceptionOrderSheetProps = {
  order: ReceptionOrder | null;
  onOpenChange: (open: boolean) => void;
  onGenerate: (order: ReceptionOrder) => void;
};

export function ReceptionOrderSheet({ order, onOpenChange, onGenerate }: ReceptionOrderSheetProps) {
  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {order ? (
          <>
            <SheetHeader>
              <SheetTitle>Orden {order.id}</SheetTitle>
              <p className="text-muted-foreground text-sm">Revisión rápida para generar muestras.</p>
            </SheetHeader>

            <div className="space-y-4 px-4">
              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-sm font-medium">{order.patientName}</p>
                <p className="text-muted-foreground text-sm">Edad: {order.patientAge} años</p>
                <p className="text-muted-foreground text-sm">Doctor: {order.doctor}</p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Pruebas solicitadas</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {order.tests.map((test) => (
                    <li key={test} className="text-muted-foreground">
                      • {test}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Notas</p>
                <p className="text-muted-foreground mt-1 text-sm">{order.notes}</p>
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                size="lg"
                onClick={() => onGenerate(order)}
                disabled={order.status !== "Sin muestras"}
                className="w-full"
              >
                {order.status === "Sin muestras" ? "Generar muestras" : "Muestras ya creadas"}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
