import { useState } from "react";
import type { AppState, EquipmentRequest, Loan } from "@campus/shared";
import { api } from "../api";
import { KitView } from "./KitView";

interface Props {
  state: AppState;
  mutate: (fn: () => Promise<AppState>, msg?: string) => Promise<void>;
  setStatus: (msg: string) => void;
}

type RequestStatus = "Not started" | "Out" | "Partly returned" | "Complete";

function deriveStatus(request: EquipmentRequest, loans: Loan[]): RequestStatus {
  const reqLoans = loans.filter((l) => l.requestId === request.id);
  if (reqLoans.length === 0) return "Not started";

  const totalLines = request.lines.reduce((sum, line) => sum + line.qty, 0);
  const returned = reqLoans.filter((l) => l.returned).length;
  const issued = reqLoans.length;

  if (returned === totalLines && issued === totalLines) return "Complete";
  if (returned > 0) return "Partly returned";
  if (issued > 0) return "Out";
  return "Not started";
}

function statusClass(status: RequestStatus): string {
  switch (status) {
    case "Not started": return "tag";
    case "Out": return "tag out";
    case "Partly returned": return "tag partial";
    case "Complete": return "tag good";
  }
}

export function RequestsScreen({ state, mutate, setStatus }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId
    ? state.requests.find((r) => r.id === selectedId) ?? null
    : null;

  if (selected) {
    return (
      <KitView
        request={selected}
        state={state}
        mutate={mutate}
        setStatus={setStatus}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <div className="sectionhead">
        <div>
          <h2>Approved requests</h2>
          <small>Student Activities Office · {state.requests.length} approved forms</small>
        </div>
      </div>
      {state.requests.map((r) => {
        const status = deriveStatus(r, state.loans);
        return (
          <div className="row" key={r.id}>
            <div>
              <strong>{r.event}</strong>
              <small>{r.id} · {r.club}</small>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span className={statusClass(status)}>{status}</span>
              <button type="button" onClick={() => setSelectedId(r.id)}>
                View form
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
