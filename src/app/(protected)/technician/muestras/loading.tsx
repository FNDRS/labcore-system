import { MuestrasSkeleton } from "./muestras-skeleton";

export default function MuestrasLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MuestrasSkeleton />
    </div>
  );
}
