import { useEffect, useRef, useState } from "react";
import type { AppState } from "@campus/shared";
import type { Mutate } from "../lib/types";
import { hasOverdue, requestStatus, type RequestStatus } from "../lib/requests";
import { KitView } from "./KitView";

interface Props {
  state: AppState;
  mutate: Mutate;
}

const CHIP: Record<RequestStatus, string> = {
  "Not started": "tag",
  Out: "tag out",
  "Partly returned": "tag partial",
  Complete: "tag good",
};

export function RequestsScreen({ state, mutate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastId = useRef<string | null>(null);
  const selected = selectedId ? state.requests.find((r) => r.id === selectedId) ?? null : null;

  // Back from a request puts focus on that request's button in the list.
  useEffect(() => {
    if (!selected && lastId.current)
      document.querySelector<HTMLElement>(`[data-req="${lastId.current}"]`)?.focus();
  }, [selected]);

  if (selected) {
    return <KitView request={selected} state={state} mutate={mutate} onBack={() => setSelectedId(null)} />;
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
        const status = requestStatus(r, state);
        return (
          <div className="row" key={r.id}>
            <div>
              <strong>{r.event}</strong>
              <small>{r.id} · {r.club}</small>
            </div>
            <div className="row-actions">
              {hasOverdue(r, state) && <span className="tag overdue">Overdue</span>}
              <span className={CHIP[status]}>{status}</span>
              <button type="button" data-req={r.id} onClick={() => { lastId.current = r.id; setSelectedId(r.id); }}>
                View form
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
