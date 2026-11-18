import { dueStatus } from "@campus/shared";
import type { AppState, EquipmentRequest } from "@campus/shared";

export type RequestStatus = "Not started" | "Out" | "Partly returned" | "Complete";

export function requestStatus(request: EquipmentRequest, state: AppState): RequestStatus {
  const loans = state.loans.filter((l) => l.requestId === request.id);
  if (!loans.length) return "Not started";
  const total = request.lines.reduce((n, l) => n + l.qty, 0);
  const back = loans.filter((l) => l.returned).length;
  if (back === total && loans.length === total) return "Complete";
  return back > 0 ? "Partly returned" : "Out";
}

export function hasOverdue(request: EquipmentRequest, state: AppState): boolean {
  const now = state.shifts[state.phase]?.at;
  if (!now) return false;
  return state.loans.some((l) => l.requestId === request.id && !l.returned && dueStatus(now, l.dueAt) === "overdue");
}
