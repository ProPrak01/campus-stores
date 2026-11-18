import { useState } from "react";
import type { AppState, EquipmentRequest } from "@campus/shared";
import { InlineForm } from "./InlineForm";
import { availableUnits, getSuggestedUnit } from "../../lib/kit";

interface Props {
  request: EquipmentRequest;
  state: AppState;
  lineType: string;
  onSubmit: (assetId: string, collector: string, dueLabel: string) => Promise<boolean>;
  onClose: () => void;
}

export function LineIssueForm({ request, state, lineType, onSubmit, onClose }: Props) {
  const units = availableUnits(lineType, state.assets, state.loans);
  const [asset, setAsset] = useState(getSuggestedUnit(lineType, state.assets, state.loans)?.id ?? "");
  const [collector, setCollector] = useState("");
  const [due, setDue] = useState(request.dueLabel);

  return (
    <InlineForm onClose={onClose}>
      {(close) => (
        <div>
          <div className="form">
            <label>
              <span>Unit</span>
              <select value={asset} onChange={(e) => setAsset(e.target.value)}>
                {units.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.model}</option>)}
              </select>
            </label>
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
          </div>
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={!collector || !asset}
              onClick={async () => { if (await onSubmit(asset, collector, due)) close(); }}
            >
              Confirm issue
            </button>
            <button type="button" onClick={close}>Cancel</button>
          </div>
        </div>
      )}
    </InlineForm>
  );
}
