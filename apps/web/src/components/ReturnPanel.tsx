import { useState } from "react";
import type { AppState, Loan } from "@campus/shared";

interface Props {
  state: AppState;
  /** The loan the clerk clicked "Return" on. Used to pre-fill who is returning and to flag a mismatch. */
  expected: Loan;
  onConfirm: (assetId: string, returnedBy: string) => void;
  onCancel: () => void;
}

/**
 * "Which unit is in your hand?" The clerk must pick the unit ID printed on the label.
 * It starts empty on purpose, so two identical units (AD-12, AD-15) cannot be mixed up by a single click.
 */
export function ReturnPanel({ state, expected, onConfirm, onCancel }: Props) {
  const expectedAsset = state.assets.find((a) => a.id === expected.assetId);
  const [assetId, setAssetId] = useState("");
  const [returnedBy, setReturnedBy] = useState(
    state.people.includes(expected.holder) ? expected.holder : (state.people[0] ?? ""),
  );

  // Every open unit of the same type is a candidate, whichever request it is on.
  const candidates = state.loans.filter((l) => {
    if (l.returned) return false;
    return state.assets.find((a) => a.id === l.assetId)?.type === expectedAsset?.type;
  });
  const picked = candidates.find((l) => l.assetId === assetId);
  const mismatch = picked && picked.assetId !== expected.assetId;

  return (
    <div className="form inline-form">
      <label className="full">
        <span>Which unit is in your hand? Read the ID on its label.</span>
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          <option value="">Select the unit ID…</option>
          {candidates.map((l) => {
            const a = state.assets.find((x) => x.id === l.assetId);
            return (
              <option key={l.assetId} value={l.assetId}>
                {l.assetId} · {a?.model} · slip L-{l.num} · {l.requestId} · with {l.holder}
              </option>
            );
          })}
        </select>
      </label>
      <label>
        <span>Returned by</span>
        <select value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)}>
          {state.people.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      {mismatch && picked && (
        <p className="full note-warn" role="status">
          {picked.assetId} is not the unit on the line you opened ({expected.assetId}). Confirming closes slip L-
          {picked.num} on {picked.requestId}.
        </p>
      )}
      <div className="full actions">
        <button
          type="button"
          className="primary"
          disabled={!assetId}
          onClick={() => onConfirm(assetId, returnedBy)}
        >
          Confirm return
        </button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
