/**
 * Formatea minutos de espera en un tiempo relativo legible (ej. "45 min", "2 h 30 min", "3 días").
 */
export function formatWaitTime(mins: number): string {
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainderMins = mins % 60;
  if (hours < 24) {
    if (remainderMins > 0) return `${hours} h ${remainderMins} min`;
    return `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  if (days < 7) {
    if (remainderHours > 0) return `${days} d ${remainderHours} h`;
    return `${days} ${days === 1 ? "día" : "días"}`;
  }
  const weeks = Math.floor(days / 7);
  const remainderDays = days % 7;
  if (weeks < 4) {
    if (remainderDays > 0) return `${weeks} sem ${remainderDays} d`;
    return `${weeks} sem`;
  }
  return `${days} días`;
}
