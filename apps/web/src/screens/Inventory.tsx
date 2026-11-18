import { useState } from "react";
import type { AppState } from "@campus/shared";

interface Props {
  state: AppState;
}

type Filter = "All items" | "On shelf" | "On loan" | "In repair";
const FILTERS: Filter[] = ["All items", "On shelf", "On loan", "In repair"];

export function InventoryScreen({ state }: Props) {
  const [filter, setFilter] = useState<Filter>("All items");

  const getStatus = (assetId: string, inRepair?: boolean): string => {
    if (inRepair) return "In repair";
    const onLoan = state.loans.some((l) => l.assetId === assetId && !l.returned);
    return onLoan ? "On loan" : "On shelf";
  };

  const filtered = state.assets.filter((a) => {
    if (filter === "All items") return true;
    return getStatus(a.id, a.inRepair) === filter;
  });

  return (
    <div>
      <div className="sectionhead">
        <div>
          <h2>Inventory</h2>
          <small>Physical units · home shelf and current availability</small>
        </div>
      </div>
      <div className="buttons">
        <label>
          Show{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>
      {filtered.map((a) => {
        const status = getStatus(a.id, a.inRepair);
        const loan = status === "On loan"
          ? state.loans.find((l) => l.assetId === a.id && !l.returned)
          : undefined;
        return (
          <div className="row" key={a.id}>
            <div>
              <strong>{a.id} · {a.type}</strong>
              <small>{a.model} · {a.bin}{loan ? ` · ${loan.holder}` : ""}</small>
            </div>
            <div>
              <span className={`tag${status === "On shelf" ? " good" : ""}`}>
                {status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
