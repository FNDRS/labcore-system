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
    <section className="rounded-xl border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
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
                <TableCell className="font-medium">{order.displayId}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{order.patientName}</span>
                    {order.priority === "Urgente" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        Urgente
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</p>
                </TableCell>
                <TableCell>
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
                      size="sm"
                      className="rounded-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        onGenerateForOrder(order);
                      }}
                    >
                      Generar muestras
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
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
