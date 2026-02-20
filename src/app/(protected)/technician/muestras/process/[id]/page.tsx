import { ProcessSampleWorkspace } from "./process-sample-workspace";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ sampleId?: string }> };

export default async function ProcessSamplePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { sampleId } = await searchParams;
  return (
    <ProcessSampleWorkspace
      rowId={id}
      sampleId={sampleId ?? ""}
    />
  );
}
