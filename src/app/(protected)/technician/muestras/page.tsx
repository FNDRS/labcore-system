import { MuestrasWorkstation } from "../muestras-client";

type Props = { searchParams: Promise<{ sample?: string }> };

export default async function TechnicianMuestrasPage({ searchParams }: Props) {
  const { sample } = await searchParams;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MuestrasWorkstation initialSampleId={sample ?? undefined} />
    </div>
  );
}
