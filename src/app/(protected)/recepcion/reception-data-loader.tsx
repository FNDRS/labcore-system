import {
  listReceptionOrders,
  type ReceptionListFilters,
} from "@/lib/repositories/reception-repository";
import { ReceptionInboxClient } from "./recepcion-inbox-client";

type Props = {
  filters: ReceptionListFilters;
};

export async function ReceptionDataLoader({ filters }: Props) {
  const { orders, nextToken, hasMore } = await listReceptionOrders(filters);

  return (
    <ReceptionInboxClient
      key={`${filters.quickFilter ?? "Sin muestras"}-${filters.search ?? ""}`}
      initialOrders={orders}
      initialFilters={filters}
      initialHasMore={hasMore}
      initialNextToken={nextToken ?? null}
    />
  );
}
