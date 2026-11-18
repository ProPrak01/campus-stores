import type { AppState, Loan } from "@campus/shared";

const LABEL = { issued: "Issued", passed_on: "Passed on", extended: "New return time", returned: "Returned" } as const;

export function LoanHistory({ loan, state }: { loan: Loan; state: AppState }) {
  return (
    <div className="timeline">
      {loan.history.map((e, i) => (
        <div key={i} className="timeline-event">
          <strong>{LABEL[e.kind]}</strong>
          <small>{e.text} · {state.shifts[e.phase]?.time ?? ""} · by {e.by}</small>
        </div>
      ))}
    </div>
  );
}
