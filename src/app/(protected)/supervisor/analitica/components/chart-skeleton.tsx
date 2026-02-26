import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? "min-h-[300px] w-full"} />;
}

export function DetailedChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ChartSkeleton className="h-[300px] w-full rounded-xl" />
      <ChartSkeleton className="h-[300px] w-full rounded-xl" />
      <ChartSkeleton className="h-[300px] w-full rounded-xl" />
      <ChartSkeleton className="h-[300px] w-full rounded-xl" />
    </div>
  );
}
