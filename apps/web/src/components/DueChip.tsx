import { dueStatus } from "@campus/shared";
import type { AppState, Loan } from "@campus/shared";

/** Shows "Overdue" or "Due soon" for an open loan, measured against the desk clock. Renders nothing otherwise. */
export function DueChip({ state, loan }: { state: AppState; loan: Loan }) {
  if (loan.returned) return null;
  const now = state.shifts[state.phase]?.at;
  if (!now) return null;
  const status = dueStatus(now, loan.dueAt);
  if (status === "ok") return null;
  return (
    <span className={`tag ${status === "overdue" ? "overdue" : "soon"}`}>
      {status === "overdue" ? "Overdue" : "Due soon"}
    </span>
  );
}
