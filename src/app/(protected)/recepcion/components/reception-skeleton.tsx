import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReceptionSkeleton() {
  return (
    <div className="min-w-0 overflow-x-hidden bg-zinc-50">
      <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
        <Card className="rounded-xl border border-zinc-200 bg-white p-4 shadow-none sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-36 rounded-full" />
                <Skeleton className="h-11 w-28 rounded-full" />
              </div>
            </header>

            <section className="space-y-3">
              <Skeleton className="h-11 w-full max-w-2xl rounded-full" />
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-24 rounded-full" />
                ))}
              </div>
            </section>

            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
