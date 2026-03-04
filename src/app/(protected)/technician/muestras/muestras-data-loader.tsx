import { listTechnicianSamples } from "@/lib/repositories/technician-repository";
import { MuestrasWorkstation } from "../muestras-client";
import type { SampleWorkstationRow } from "../types";

interface MuestrasDataLoaderProps {
  initialSampleId?: string;
}

export async function MuestrasDataLoader({ initialSampleId }: MuestrasDataLoaderProps) {
  let samples: SampleWorkstationRow[] = [];

  try {
    samples = await listTechnicianSamples();
  } catch (error) {
    console.error("[MuestrasDataLoader] Failed to fetch samples:", error);
  }

  return <MuestrasWorkstation initialSamples={samples} initialSampleId={initialSampleId} />;
}
