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

const SKELETON_TABLE_ROWS = 6;
const SKELETON_TABLE_COLS = 5;

export function MuestrasSkeleton() {
  return (
    <div className="flex h-full flex-col bg-zinc-50">
      <div className="pt-4">
        <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none">
          <div className="flex flex-wrap items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full max-w-md flex-1 rounded-md sm:max-w-sm" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </Card>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="w-full space-y-4">
          <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-none">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-center"
                >
                  <Skeleton className="mx-auto h-8 w-12" />
                  <Skeleton className="mx-auto mt-2 h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-36" />
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-11 w-full max-w-sm rounded-full sm:w-72" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    {Array.from({ length: SKELETON_TABLE_COLS }).map((_, i) => (
                      <TableHead key={i} className="h-12 px-4 py-3">
                        <Skeleton className="h-3 w-14" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: SKELETON_TABLE_ROWS }).map((_, rowIndex) => (
                    <TableRow key={rowIndex} className="border-b border-border/40">
                      {Array.from({ length: SKELETON_TABLE_COLS }).map((_, colIndex) => (
                        <TableCell key={colIndex} className="px-4 py-4">
                          <Skeleton
                            className="h-4 w-full"
                            style={{
                              maxWidth: colIndex === 0 ? 200 : colIndex === 1 ? 140 : 100,
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
        </div>
      </div>
    </div>
  );
}
