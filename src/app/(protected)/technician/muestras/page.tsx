import { Suspense } from "react";
import { MuestrasDataLoader } from "./muestras-data-loader";
import { MuestrasSkeleton } from "./muestras-skeleton";

type Props = { searchParams: Promise<{ sample?: string }> };

export default async function TechnicianMuestrasPage({ searchParams }: Props) {
  const { sample } = await searchParams;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<MuestrasSkeleton />}>
        <MuestrasDataLoader initialSampleId={sample} />
      </Suspense>
    </div>
  );
}
