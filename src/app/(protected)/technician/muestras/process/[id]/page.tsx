import { getProcessContext } from "@/lib/repositories/process-repository";
import { ProcessSampleWorkspace } from "./process-sample-workspace";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ sampleId?: string }> };

/**
 * Process sample page — fetches ProcessContext server-side.
 * Uses id (params) as sampleId: route is /process/[id] where id = Sample.id (UUID).
 * searchParams.sampleId is display barcode for UI.
 *
 * @see docs/integration/phase-3.md Phase 3d.1
 */
export default async function ProcessSamplePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { sampleId: displayBarcode } = await searchParams;
  const context = await getProcessContext(id);
  const displayId = displayBarcode ?? (context?.sample?.barcode ?? `#${id.slice(0, 8)}`);
  return (
    <ProcessSampleWorkspace
      context={context}
      displayId={displayId}
    />
  );
}
