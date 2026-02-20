import { Suspense } from "react";
import { fetchMuestrasWorkstation } from "../actions";
import { MuestrasWorkstation } from "../muestras-client";

async function MuestrasContent() {
  const { samples } = await fetchMuestrasWorkstation();
  return <MuestrasWorkstation initialSamples={samples} />;
}

const MuestrasSkeleton = () => (
  <div className="flex h-full flex-col">
    <div className="h-16 shrink-0 animate-pulse border-b bg-muted" />
    <div className="grid grid-cols-4 gap-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
    <div className="min-h-0 flex-1 animate-pulse rounded-xl bg-muted m-4" />
  </div>
);

export default function TechnicianMuestrasPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<MuestrasSkeleton />}>
        <MuestrasContent />
      </Suspense>
    </div>
  );
}
