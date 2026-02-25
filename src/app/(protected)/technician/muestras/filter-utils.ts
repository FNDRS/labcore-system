import type { SampleWorkstationRow } from "../actions";
import type { Filter } from "./constants";

export function filterRows(
  rows: SampleWorkstationRow[],
  filter: Filter
): SampleWorkstationRow[] {
  if (filter === "All") return rows;
  if (filter === "Processing")
    return rows.filter(
      (r) => r.status === "Processing" || r.status === "Waiting Equipment"
    );
  if (filter === "Received")
    return rows.filter(
      (r) => r.status === "Awaiting Receipt" || r.status === "Received"
    );
  if (filter === "Urgent") return rows.filter((r) => r.priority === "Urgent");
  if (filter === "Flagged") return rows.filter((r) => r.status === "Flagged");
  if (filter === "Mine") return rows.filter((r) => r.assignedToMe);
  return rows;
}
