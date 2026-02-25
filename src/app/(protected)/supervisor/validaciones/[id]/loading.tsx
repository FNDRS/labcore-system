import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ValidationDetailLoading() {
  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-9 w-44 rounded-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-zinc-200 bg-white shadow-none">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full rounded-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
