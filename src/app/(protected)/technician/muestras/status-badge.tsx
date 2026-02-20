"use client";

import { AlertCircle, CheckCircle2, Loader2, Package, Wrench } from "lucide-react";
import type { SampleWorkstationStatus } from "../actions";

const CONFIG: Record<
  SampleWorkstationStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  Received: {
    label: "Received",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <Package className="size-3.5" />,
  },
  Processing: {
    label: "Processing",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    icon: <Loader2 className="size-3.5 animate-spin" />,
  },
  "Waiting Equipment": {
    label: "Waiting Eq.",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    icon: <Wrench className="size-3.5" />,
  },
  Completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  Flagged: {
    label: "Flagged",
    className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    icon: <AlertCircle className="size-3.5" />,
  },
};

export function StatusBadge({ status }: { status: SampleWorkstationStatus }) {
  const { label, className, icon } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
