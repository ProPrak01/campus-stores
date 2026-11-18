import { useState } from "react";
import type { AppState } from "@campus/shared";
import { api } from "../api";
import type { Mutate } from "../lib/types";
import { ReturnPanel } from "../components/ReturnPanel";
import { DueChip } from "../components/DueChip";

interface Props {
  state: AppState;
  mutate: Mutate;
}

export function LoanRegisterScreen({ state, mutate }: Props) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [returnAssetId, setReturnAssetId] = useState<string | null>(null);

  const shown = state.loans
    .filter((l) => !onlyOpen || !l.returned)
    .slice()
    .reverse();

  const handleReturn = async (assetId: string, returnedBy: string) => {
    await mutate(
      () => api.returnUnit({ assetId, returnedBy }),
      `${assetId} returned by ${returnedBy}.`,
    );
    setReturnAssetId(null);
  };

  return (
    <div>
      <div className="sectionhead">
        <div>
          <h2>Loan register</h2>
          <small>One slip per physical unit</small>
        </div>
      </div>
      <div className="buttons">
        {(["Outstanding", "All slips"] as const).map((label, i) => (
          <button
            key={label}
            type="button"
            aria-pressed={onlyOpen === (i === 0)}
            onClick={() => setOnlyOpen(i === 0)}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p>No outstanding slips.</p>}
      {shown.map((l) => {
        const asset = state.assets.find((a) => a.id === l.assetId);
        const isReturning = returnAssetId === l.assetId;
        return (
          <div key={l.num}>
            <div className="row">
              <div>
                <strong>L-{l.num} · {l.assetId}</strong>
                <small>
                  {l.requestId} · {asset?.type ?? "Unknown"} · {l.holder} · Due {l.dueLabel}
                </small>
              </div>
              <div className="row-actions">
                <DueChip state={state} loan={l} />
                {l.returned ? (
                  <span className="tag">Returned{l.returnedBy ? ` by ${l.returnedBy}` : ""}</span>
                ) : (
                  <button type="button" onClick={() => setReturnAssetId(l.assetId)}>
                    Record return
                  </button>
                )}
              </div>
            </div>
            {isReturning && !l.returned && (
              <ReturnPanel
                state={state}
                expected={l}
                onConfirm={handleReturn}
                onCancel={() => setReturnAssetId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
