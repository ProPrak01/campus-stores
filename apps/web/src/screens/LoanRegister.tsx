import { useState } from "react";
import type { AppState } from "@campus/shared";

interface Props {
  state: AppState;
}

export function LoanRegisterScreen({ state }: Props) {
  const [onlyOpen, setOnlyOpen] = useState(true);

  const shown = state.loans
    .filter((l) => !onlyOpen || !l.returned)
    .slice()
    .reverse();

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
      {shown.map((l) => (
        <div className="row" key={l.num}>
          <div>
            <strong>L-{l.num} · {l.assetId}</strong>
            <small>{l.requestId} · {l.holder} · Due {l.dueLabel}</small>
          </div>
          <div>
            <span className={`tag${l.returned ? "" : " good"}`}>
              {l.returned ? "Returned" : "Outstanding"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
