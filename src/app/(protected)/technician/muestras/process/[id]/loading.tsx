import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading UI while process page fetches context.
 * @see docs/integration/phase-3.md Phase 3d.4
 */
export default function ProcessSampleLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <div className="border-b border-zinc-200 bg-amber-50/80 px-4 py-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-zinc-200 bg-white p-6">
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
