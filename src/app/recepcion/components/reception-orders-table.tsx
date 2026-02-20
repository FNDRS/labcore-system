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
import { formatDateTime, priorityPillClass, statusPillClass } from "../utils";

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
    <section className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Pruebas</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                No hay órdenes para los filtros actuales.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                className={
                  highlightedNewIds.includes(order.id) ? "bg-emerald-50/80 dark:bg-emerald-950/20" : undefined
                }
                onClick={() => onSelectOrder(order.id)}
              >
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{order.patientName}</span>
                    {order.isNew ? (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Nueva</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</p>
                </TableCell>
                <TableCell>{order.tests.length}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${priorityPillClass(order.priority)}`}
                  >
                    {order.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGenerateForOrder(order);
                    }}
                    disabled={order.status !== "Sin muestras"}
                  >
                    {order.status === "Sin muestras" ? "Generar muestras" : "Generadas"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
