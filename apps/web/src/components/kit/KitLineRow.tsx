import type { AppState } from "@campus/shared";
import { DueChip } from "../DueChip";
import { getSuggestedUnit, type KitLine } from "../../lib/kit";

export type RowAction = "return" | "pass" | "extend" | "issue" | "history";

interface Props {
  k: KitLine;
  state: AppState;
  open: RowAction | null;
  onAction: (a: RowAction | null) => void;
}

export function KitLineRow({ k, state, open, onAction }: Props) {
  const chip = k.status === "Returned" ? "tag good" : k.status === "Out" ? "tag out" : "tag";
  const toggle = (a: RowAction) => onAction(open === a ? null : a);
  const suggested = !k.loan ? getSuggestedUnit(k.line.type, state.assets, state.loans) : undefined;

  return (
    <div className="row kit-row">
      <div>
        <strong>{k.line.type}</strong>
        {k.loan && k.status === "Out" && <small>{k.loan.assetId} · {k.loan.holder} · Due {k.loan.dueLabel}</small>}
        {k.loan && k.status === "Returned" && (
          <small>{k.loan.assetId} · returned{k.loan.returnedBy ? ` by ${k.loan.returnedBy}` : ""}</small>
        )}
        {!k.loan && (
          <small>{suggested ? `Suggested: ${suggested.id} (${suggested.model}) · Bin ${suggested.bin}` : "No unit on the shelf"}</small>
        )}
      </div>
      <div className="row-actions">
        <span className={chip}>{k.status}</span>
        {k.loan && <DueChip state={state} loan={k.loan} />}
        {k.status === "Not issued" && suggested && (
          <button type="button" onClick={() => toggle("issue")}>Issue</button>
        )}
        {k.status === "Out" && (
          <>
            <button type="button" onClick={() => toggle("return")}>Return</button>
            <button type="button" onClick={() => toggle("pass")}>Pass on</button>
            <button type="button" onClick={() => toggle("extend")}>New due</button>
          </>
        )}
        {k.loan && k.loan.history.length > 0 && (
          <button type="button" className="small" onClick={() => toggle("history")}>
            {open === "history" ? "Hide history" : "History"}
          </button>
        )}
      </div>
    </div>
  );
}
