import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchConsolidatedResultAction } from "../actions";
import { ConsolidatedResultClient } from "./consolidated-result-client";

type Props = {
  params: Promise<{ workOrderId: string }>;
};

export default async function SupervisorResultadoDetailPage({ params }: Props) {
  const { workOrderId } = await params;
  const result = await fetchConsolidatedResultAction(workOrderId);

  if (result == null) {
    notFound();
  }

  return (
    <div className="min-h-0 flex-1 bg-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div data-no-print>
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link href="/supervisor/resultados">
              <ArrowLeft className="size-3.5" />
              Volver a resultados
            </Link>
          </Button>
        </div>
        <ConsolidatedResultClient result={result} />
      </div>
    </div>
  );
}
