"use client";

/**
 * Unsaved changes guard — beforeunload + optional navigation blocker.
 * @see docs/integration/phase-3.md Phase 3e.2
 */

import { useEffect } from "react";

/** Register beforeunload when form is dirty. */
export function useUnsavedGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}

/**
 * Returns true if navigation should proceed, false if user cancelled.
 * Use for Link/Button click handlers when form is dirty.
 */
export function confirmNavigateIfDirty(
  isDirty: boolean,
  message = "Tienes cambios sin guardar. ¿Seguro que quieres salir?",
): boolean {
  if (!isDirty) return true;
  return window.confirm(message);
}
