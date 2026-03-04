import { ReceptionSkeleton } from "./components/reception-skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <ReceptionSkeleton />
    </div>
  );
}
