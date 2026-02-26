import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReceptionOrder } from "../types";
import { formatDateTime, statusPillClass } from "../utils";

type ReceptionOrdersTableProps = {
  orders: ReceptionOrder[];
  highlightedNewIds: string[];
  onSelectOrder: (orderId: string) => void;
  onGenerateForOrder: (order: ReceptionOrder) => void;
};

export function ReceptionOrdersTable({
  orders,
  highlightedNewIds,
  onSelectOrder,
  onGenerateForOrder,
}: ReceptionOrdersTableProps) {
  return (
    <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white -mx-1 px-1 sm:mx-0 sm:px-0">
      <Table className="min-w-[600px] sm:min-w-0">
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm sm:text-base">Orden</TableHead>
            <TableHead className="text-sm sm:text-base">Paciente</TableHead>
            <TableHead className="text-sm sm:text-base">Estado</TableHead>
            <TableHead className="text-right text-sm sm:text-base">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm sm:text-base">
                No hay órdenes para los filtros actuales.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                className={
                  highlightedNewIds.includes(order.id) ? "bg-emerald-50/60 dark:bg-emerald-950/20" : undefined
                }
                onClick={() => onSelectOrder(order.id)}
              >
                <TableCell className="font-medium text-sm sm:text-base">{order.displayId}</TableCell>
                <TableCell className="text-sm sm:text-base">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{order.patientName}</span>
                    {order.priority === "Urgente" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        Urgente
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</p>
                </TableCell>
                <TableCell className="text-sm sm:text-base">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {order.status === "Sin muestras" ? (
                    <Button
                      type="button"
                      className="min-h-11 rounded-full px-4 text-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onGenerateForOrder(order);
                      }}
                    >
                      Generar muestras
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="font-normal min-h-8 px-2.5 py-1">
                      ✔ Generadas
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
