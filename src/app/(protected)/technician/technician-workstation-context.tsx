"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SampleWorkstationDetail, SampleWorkstationRow } from "./types";
import type { Filter } from "./muestras/constants";
import {
  fetchMuestrasAction,
  getSampleDetail,
  lookupSampleByBarcodeAction,
  markReceivedAction,
  markInProgressAction,
  markRejectedAction,
  reprintLabelAction,
} from "./actions";

/** State exposed by the workstation provider. */
export interface TechnicianWorkstationState {
  samples: SampleWorkstationRow[];
  samplesLoading: boolean;
  samplesError: string | null;
  scanValue: string;
  scanModalOpen: boolean;
  lastScannedId: string | null;
  scannerStatus: "listo" | "ocupado" | "error";
  highlightedId: string | null;
  filter: Filter;
  searchQuery: string;
  selectedId: string | null;
  panelOpen: boolean;
  selectedSample: SampleWorkstationDetail | SampleWorkstationRow | null;
  detailLoading: boolean;
  actionError: string | null;
}

/** Actions exposed by the workstation provider. */
export interface TechnicianWorkstationActions {
  loadSamples: () => Promise<void>;
  setScanValue: (v: string) => void;
  setScanModalOpen: (v: boolean) => void;
  handleScan: () => Promise<void>;
  setFilter: (f: Filter) => void;
  setSearchQuery: (q: string) => void;
  setPanelOpen: (v: boolean) => void;
  openPanel: (id: string) => void;
  onMarkReceived: (id: string) => Promise<void>;
  onProcess: (id: string) => Promise<void>;
  onReportProblem: (id: string) => Promise<void>;
  onReprintLabel: (id: string) => Promise<void>;
}

export interface TechnicianWorkstationContextValue {
  state: TechnicianWorkstationState;
  actions: TechnicianWorkstationActions;
}

const TechnicianWorkstationContext = createContext<TechnicianWorkstationContextValue | null>(null);

export function useTechnicianWorkstation(): TechnicianWorkstationContextValue {
  const ctx = useContext(TechnicianWorkstationContext);
  if (!ctx) {
    throw new Error("useTechnicianWorkstation must be used within TechnicianWorkstationProvider");
  }
  return ctx;
}

export function TechnicianWorkstationProvider({
  children,
  initialSampleId,
}: {
  children: ReactNode;
  initialSampleId?: string | null;
}) {
  const router = useRouter();
  const [samples, setSamples] = useState<SampleWorkstationRow[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState<"listo" | "ocupado" | "error">("listo");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SampleWorkstationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    setSamplesError(null);
    try {
      const { samples: data } = await fetchMuestrasAction();
      setSamples(data);
    } catch (err) {
      setSamplesError(err instanceof Error ? err.message : "Error al cargar muestras");
      setSamples([]);
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSamples();
  }, [loadSamples]);

  useEffect(() => {
    if (!selectedId || !panelOpen) {
      setSelectedDetail(null);
      return;
    }
    setDetailLoading(true);
    setSelectedDetail(null);
    getSampleDetail(selectedId)
      .then(setSelectedDetail)
      .catch(() => setSelectedDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId, panelOpen]);

  const selectedSample =
    selectedDetail ?? (selectedId ? (samples.find((s) => s.id === selectedId) ?? null) : null);

  const openPanel = useCallback((id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
    setActionError(null);
  }, []);

  useEffect(() => {
    if (initialSampleId?.trim()) {
      openPanel(initialSampleId.trim());
    }
  }, [initialSampleId, openPanel]);

  const handleScan = useCallback(async () => {
    const q = scanValue.trim();
    if (!q) return;
    setScannerStatus("ocupado");
    const result = await lookupSampleByBarcodeAction(q);
    if (result.ok) {
      const { sample } = result;
      setLastScannedId(sample.sampleId);
      setHighlightedId(sample.id);
      setScannerStatus("listo");
      setScanValue("");
      openPanel(sample.id);
      loadSamples();
      setTimeout(() => setHighlightedId(null), 2000);
    } else {
      setScannerStatus("error");
      setActionError(result.error);
      setTimeout(() => {
        setScannerStatus("listo");
        setActionError(null);
      }, 2500);
    }
  }, [scanValue, openPanel, loadSamples]);

  const onMarkReceived = useCallback(
    async (id: string) => {
      setActionError(null);
      const result = await markReceivedAction(id);
      if (result.ok) {
        await loadSamples();
        if (selectedId === id) {
          getSampleDetail(id).then(setSelectedDetail);
        }
      } else {
        setActionError(result.error);
      }
    },
    [loadSamples, selectedId]
  );

  const onProcess = useCallback(
    async (id: string) => {
      setActionError(null);
      const sample = samples.find((s) => s.id === id);
      if (
        sample?.backendStatus === "ready_for_lab" ||
        sample?.backendStatus === "pending" ||
        sample?.backendStatus === "labeled"
      ) {
        setActionError("Primero marca la muestra como recibida");
        return;
      }
      if (sample?.backendStatus === "inprogress") {
        setPanelOpen(false);
        router.push(
          `/technician/muestras/process/${id}?sampleId=${encodeURIComponent(sample.sampleId ?? "")}`
        );
        return;
      }
      const result = await markInProgressAction(id);
      if (result.ok) {
        setPanelOpen(false);
        router.push(
          `/technician/muestras/process/${id}?sampleId=${encodeURIComponent(sample?.sampleId ?? "")}`
        );
      } else {
        setActionError(result.error);
      }
    },
    [samples, router]
  );

  const onReportProblem = useCallback(
    async (id: string) => {
      setActionError(null);
      const result = await markRejectedAction(id);
      if (result.ok) {
        await loadSamples();
        setPanelOpen(false);
        if (selectedId === id) setSelectedDetail(null);
      } else {
        setActionError(result.error);
      }
    },
    [loadSamples, selectedId]
  );

  const onReprintLabel = useCallback(
    async (id: string) => {
      setActionError(null);
      const result = await reprintLabelAction(id);
      if (result.ok) {
        if (selectedId === id) {
          getSampleDetail(id).then(setSelectedDetail);
        }
        setPanelOpen(false);
      } else {
        setActionError(result.error);
      }
    },
    [selectedId]
  );

  const value: TechnicianWorkstationContextValue = {
    state: {
      samples,
      samplesLoading,
      samplesError,
      scanValue,
      scanModalOpen,
      lastScannedId,
      scannerStatus,
      highlightedId,
      filter,
      searchQuery,
      selectedId,
      panelOpen,
      selectedSample,
      detailLoading,
      actionError,
    },
    actions: {
      loadSamples,
      setScanValue,
      setScanModalOpen,
      handleScan,
      setFilter,
      setSearchQuery,
      setPanelOpen,
      openPanel,
      onMarkReceived,
      onProcess,
      onReportProblem,
      onReprintLabel,
    },
  };

  return (
    <TechnicianWorkstationContext.Provider value={value}>
      {children}
    </TechnicianWorkstationContext.Provider>
  );
}
