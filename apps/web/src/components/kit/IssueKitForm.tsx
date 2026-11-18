import { useState } from "react";
import type { AppState, EquipmentRequest } from "@campus/shared";
import { InlineForm } from "./InlineForm";
import { availableUnits, getSuggestedUnit, type KitLine } from "../../lib/kit";

interface Props {
  request: EquipmentRequest;
  state: AppState;
  kitLines: KitLine[];
  onSubmit: (collector: string, dueLabel: string, assetIds: Record<string, string>) => Promise<boolean>;
  onClose: () => void;
}

/** Issue every line that still has nothing out. Lines with no unit on the shelf are listed and skipped. */
export function IssueKitForm({ request, state, kitLines, onSubmit, onClose }: Props) {
  const [collector, setCollector] = useState("");
  const [due, setDue] = useState(request.dueLabel);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const lines = request.lines.filter((l) => kitLines.some((k) => k.line.type === l.type && k.status === "Not issued"));
  const issuable = lines.filter((l) => getSuggestedUnit(l.type, state.assets, state.loans));
  const blocked = lines.filter((l) => !issuable.includes(l));

  const submit = async (close: () => void) => {
    const assetIds: Record<string, string> = {};
    for (const l of issuable) assetIds[l.type] = picks[l.type] ?? getSuggestedUnit(l.type, state.assets, state.loans)!.id;
    if (await onSubmit(collector, due, assetIds)) close();
  };

  return (
    <InlineForm onClose={onClose}>
      {(close) => (
        <div className="issue-kit">
          <h3>Issue entire kit</h3>
          <div className="form">
            <label>
              <span>Collected by</span>
              <select value={collector} onChange={(e) => setCollector(e.target.value)} required>
                <option value="">Select…</option>
                {request.authorized.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>
              <span>Due</span>
              <select value={due} onChange={(e) => setDue(e.target.value)}>
                {state.dueOptions.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
              </select>
            </label>
            <small className="full">Authorized: {request.authorized.join(", ")}</small>
            {issuable.map((l) => (
              <label key={l.type}>
                <span>{l.type}</span>
                <select
                  value={picks[l.type] ?? getSuggestedUnit(l.type, state.assets, state.loans)?.id ?? ""}
                  onChange={(e) => setPicks({ ...picks, [l.type]: e.target.value })}
                >
                  {availableUnits(l.type, state.assets, state.loans).map((a) => (
                    <option key={a.id} value={a.id}>{a.id} · {a.model}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {blocked.length > 0 && (
            <p className="note-warn" role="status">
              No unit on the shelf for: {blocked.map((l) => l.type).join(", ")}. These lines will be skipped.
            </p>
          )}
          <div className="actions">
            <button type="button" className="primary" disabled={!collector || !issuable.length} onClick={() => submit(close)}>
              Confirm — issue all
            </button>
            <button type="button" onClick={close}>Cancel</button>
          </div>
        </div>
      )}
    </InlineForm>
  );
}
