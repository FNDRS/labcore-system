import { Suspense } from "react";
import { fetchOperativeDashboard } from "./actions";
import { DashboardHeader, NextSampleCard, DashboardQueueSection } from "./dashboard-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function DashboardContent() {
  const { nextSample, queueRows } = await fetchOperativeDashboard();

  return (
    <>
      <div className="shrink-0 space-y-4">
        <DashboardHeader />
        <section>
          <NextSampleCard nextSample={nextSample} />
        </section>
      </div>
      <section className="mt-6">
        <DashboardQueueSection rows={queueRows} />
      </section>
    </>
  );
}

const ROWS = 6;
const TABLE_COLS = 7;

function DashboardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-6">
      {/* Próxima muestra a procesar */}
      <div className="shrink-0 space-y-4">
        <Card className="rounded-2xl border border-border px-6 py-5">
          <Skeleton className="h-4 w-48" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-full max-w-40" />
            ))}
          </div>
          <Skeleton className="mt-3 h-3 w-32" />
          <Skeleton className="mt-4 h-11 w-40 rounded-full" />
        </Card>
      </div>

      {/* Cola de muestras */}
      <section className="min-h-0 flex-1 space-y-4">
        <Card className="overflow-hidden rounded-xl border border-zinc-200 shadow-none">
          <div className="space-y-4 px-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-11 w-full max-w-sm rounded-full sm:w-56" />
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))}
            </div>
          </div>
          <div className="overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  {Array.from({ length: TABLE_COLS }).map((_, i) => (
                    <TableHead key={i} className="h-12 px-6 py-3">
                      <Skeleton className="h-3 w-16" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: ROWS }).map((_, rowIndex) => (
                  <TableRow key={rowIndex} className="border-b border-border/40">
                    {Array.from({ length: TABLE_COLS }).map((_, colIndex) => (
                      <TableCell key={colIndex} className="px-6 py-4">
                        <Skeleton
                          className="h-4 w-full"
                          style={{
                            maxWidth: colIndex === 0 ? 220 : colIndex === 1 ? 160 : 120,
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default function TechnicianPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
