/**
 * Transient draft persistence — localStorage keyed by examId.
 * Enables recovery after refresh or brief network disruption.
 *
 * @see docs/integration/phase-3.md Phase 3e.4
 */

const STORAGE_KEY_PREFIX = "lis-dignitas:exam-draft:";

export function getDraftKey(examId: string): string {
  return `${STORAGE_KEY_PREFIX}${examId}`;
}

export function loadDraft(examId: string): Record<string, string | number | undefined> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getDraftKey(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string | number | undefined>;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDraft(
  examId: string,
  results: Record<string, string | number | undefined>,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getDraftKey(examId), JSON.stringify(results));
  } catch {
    // Ignore quota or other storage errors
  }
}

export function clearDraft(examId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getDraftKey(examId));
  } catch {
    // Ignore
  }
}
