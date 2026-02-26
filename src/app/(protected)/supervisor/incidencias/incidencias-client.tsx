"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIncidencias } from "./incidencias-provider";
import { IncidentSummaryCards } from "./components/incident-summary-cards";
import { IncidentFeed } from "./components/incident-feed";
import { IncidentFilters } from "./components/incident-filters";
import { IncidentPatterns } from "./components/incident-patterns";

export function IncidenciasClient() {
  const { state, actions } = useIncidencias();

  return (
    <div className="space-y-6">
      <IncidentSummaryCards summary={state.summary} />

      <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-none">
        <CardHeader className="border-b border-zinc-100 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Incidencias</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Rechazos, incidencias y resultados críticos.
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={state.activeTab === "feed" ? "default" : "ghost"}
                className="rounded-lg text-xs"
                onClick={() => actions.setTab("feed")}
              >
                Feed
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.activeTab === "patterns" ? "default" : "ghost"}
                className="rounded-lg text-xs"
                onClick={() => actions.setTab("patterns")}
              >
                Patrones
              </Button>
            </div>
          </div>
        </CardHeader>

        {state.activeTab === "feed" && <IncidentFilters />}

        <CardContent className="p-0">
          {state.activeTab === "patterns" ? <IncidentPatterns /> : <IncidentFeed />}
        </CardContent>
      </Card>
    </div>
  );
}
