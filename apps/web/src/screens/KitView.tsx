import { useState } from "react";
import type { AppState, EquipmentRequest, Loan, Asset, RequestLine } from "@campus/shared";
import { api } from "../api";

interface Props {
  request: EquipmentRequest;
  state: AppState;
  mutate: (fn: () => Promise<AppState>, msg?: string) => Promise<void>;
  setStatus: (msg: string) => void;
  onBack: () => void;
}

type LineStatus = "Not issued" | "Out" | "Returned";

interface KitLine {
  line: RequestLine;
  loan: Loan | undefined;
  status: LineStatus;
}

function getKitLinesWithAssets(
  request: EquipmentRequest,
  loans: Loan[],
  assets: Asset[],
): KitLine[] {
  const reqLoans = loans.filter((l) => l.requestId === request.id);

  return request.lines.flatMap((line) => {
    const matching = reqLoans.filter((l) => {
      const asset = assets.find((a) => a.id === l.assetId);
      return asset && asset.type === line.type;
    });
    const results: KitLine[] = [];
    for (let i = 0; i < line.qty; i++) {
      const loan = matching[i];
      let status: LineStatus = "Not issued";
      if (loan) {
        status = loan.returned ? "Returned" : "Out";
      }
      results.push({ line, loan, status });
    }
    return results;
  });
}

function buildSummary(kitLines: KitLine[], assets: Asset[]): string {
  const total = kitLines.length;
  const returned = kitLines.filter((k) => k.status === "Returned").length;
  const out = kitLines.filter((k) => k.status === "Out");

  if (total === 0) return "No approved lines.";
  if (returned === total) return `All ${total} items returned.`;
  if (out.length === 0 && returned === 0) return `${total} items to issue.`;

  const parts: string[] = [];
  if (returned > 0) parts.push(`${returned} of ${total} returned`);
  else parts.push(`${out.length} of ${total} out`);

  for (const k of out) {
    if (k.loan) {
      const asset = assets.find((a) => a.id === k.loan!.assetId);
      const label = asset ? `${asset.type} (${asset.id})` : k.loan.assetId;
      parts.push(`${label} with ${k.loan.holder}`);
    }
  }
  return parts.join(" · ");
}

function getSuggestedUnit(
  lineType: string,
  assets: Asset[],
  loans: Loan[],
): Asset | undefined {
  return assets.find((a) => {
    if (a.type !== lineType) return false;
    if (a.inRepair) return false;
    const onLoan = loans.some((l) => l.assetId === a.id && !l.returned);
    return !onLoan;
  });
}

export function KitView({ request, state, mutate, setStatus, onBack }: Props) {
  const [issueMode, setIssueMode] = useState<"none" | "kit" | "line">("none");
  const [collector, setCollector] = useState(request.authorized[0] ?? "");
  const [dueLabel, setDueLabel] = useState(request.dueLabel);
  const [addCollectorMode, setAddCollectorMode] = useState(false);
  const [newCollectorName, setNewCollectorName] = useState("");
  const [newCollectorReason, setNewCollectorReason] = useState("");

  // Per-line issue state
  const [issueLineType, setIssueLineType] = useState<string | null>(null);

  // Build asset overrides for kit issue
  const [assetOverrides, setAssetOverrides] = useState<Record<string, string>>({});

  const kitLines = getKitLinesWithAssets(request, state.loans, state.assets);
  const summary = buildSummary(kitLines, state.assets);
  const hasUnissued = kitLines.some((k) => k.status === "Not issued");

  const handleIssueKit = async () => {
    const assetIds: Record<string, string> = {};
    // Build assetIds from suggestions + overrides
    for (const line of request.lines) {
      const override = assetOverrides[line.type];
      if (override) {
        assetIds[line.type] = override;
      } else {
        const suggested = getSuggestedUnit(line.type, state.assets, state.loans);
        if (suggested) {
          assetIds[line.type] = suggested.id;
        }
      }
    }

    await mutate(
      () => api.issueKit({ requestId: request.id, collectedBy: collector, assetIds }),
      `Kit issued for ${request.id} to ${collector}.`,
    );
    setIssueMode("none");
  };

  const handleIssueLine = async (lineType: string) => {
    const override = assetOverrides[lineType];
    const asset = override
      ? state.assets.find((a) => a.id === override)
      : getSuggestedUnit(lineType, state.assets, state.loans);

    if (!asset) {
      setStatus("No available unit for " + lineType);
      return;
    }

    await mutate(
      () => api.issue({
        requestId: request.id,
        assetId: asset.id,
        collectedBy: collector,
        dueLabel,
      }),
      `Issued ${asset.id} (${lineType}) to ${collector}.`,
    );
    setIssueLineType(null);
  };

  const handleAddCollector = async () => {
    if (!newCollectorName.trim() || !newCollectorReason.trim()) return;
    await mutate(
      () => api.addCollector(request.id, {
        name: newCollectorName.trim(),
        reason: newCollectorReason.trim(),
      }),
      `${newCollectorName.trim()} added as collector for ${request.id}.`,
    );
    setAddCollectorMode(false);
    setNewCollectorName("");
    setNewCollectorReason("");
  };

  return (
    <div>
      <button type="button" onClick={onBack}>← Back to list</button>

      <div className="record" style={{ marginTop: "12px" }}>
        <small>{request.id} · Approved</small>
        <h3>{request.event}</h3>
        <p>{request.club} · Filed by {request.owner}</p>
        <p><b>Return by</b> {request.dueLabel}</p>
        {request.note && (
          <p style={{ marginTop: "6px", fontStyle: "italic" }}>{request.note}</p>
        )}
      </div>

      {/* ── Summary ── */}
      <div className="kit-summary">{summary}</div>

      {/* ── Kit lines ── */}
      {kitLines.map((k, i) => {
        const statusClass =
          k.status === "Returned" ? "tag good"
          : k.status === "Out" ? "tag out"
          : "tag";

        return (
          <div className="kit-line" key={`${k.line.type}-${i}`}>
            <div className="row" style={{ borderTop: "none", padding: "4px 0" }}>
              <div>
                <strong>{k.line.type}</strong>
                {k.loan && k.status === "Out" && (
                  <small>
                    {k.loan.assetId} · {k.loan.holder} · Due {k.loan.dueLabel}
                  </small>
                )}
                {k.loan && k.status === "Returned" && (
                  <small>
                    {k.loan.assetId} · returned{k.loan.returnedBy ? ` by ${k.loan.returnedBy}` : ""}
                  </small>
                )}
                {!k.loan && (
                  <small>
                    {(() => {
                      const suggested = getSuggestedUnit(k.line.type, state.assets, state.loans);
                      return suggested ? `Suggested: ${suggested.id} (${suggested.model}) · Bin ${suggested.bin}` : "No unit available";
                    })()}
                  </small>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className={statusClass}>{k.status}</span>
                {k.status === "Not issued" && issueMode !== "kit" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIssueLineType(k.line.type);
                      setIssueMode("line");
                    }}
                  >
                    Issue
                  </button>
                )}
              </div>
            </div>

            {/* Per-line issue form */}
            {issueMode === "line" && issueLineType === k.line.type && k.status === "Not issued" && (
              <div className="form" style={{ marginTop: "8px" }}>
                <label>
                  <span>Unit</span>
                  <select
                    value={assetOverrides[k.line.type] ?? getSuggestedUnit(k.line.type, state.assets, state.loans)?.id ?? ""}
                    onChange={(e) => setAssetOverrides({ ...assetOverrides, [k.line.type]: e.target.value })}
                  >
                    {state.assets
                      .filter((a) => a.type === k.line.type && !a.inRepair && !state.loans.some((l) => l.assetId === a.id && !l.returned))
                      .map((a) => (
                        <option key={a.id} value={a.id}>{a.id} · {a.model}</option>
                      ))}
                  </select>
                </label>
                <label>
                  <span>Collected by</span>
                  <select value={collector} onChange={(e) => setCollector(e.target.value)}>
                    {request.authorized.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Due</span>
                  <select value={dueLabel} onChange={(e) => setDueLabel(e.target.value)}>
                    {["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "end" }}>
                  <button type="button" className="primary" onClick={() => handleIssueLine(k.line.type)}>
                    Confirm issue
                  </button>
                  <button type="button" onClick={() => { setIssueMode("none"); setIssueLineType(null); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Kit issue (all at once) ── */}
      {hasUnissued && issueMode === "none" && (
        <div className="kit-actions">
          <button type="button" className="primary" onClick={() => setIssueMode("kit")}>
            Issue kit
          </button>
        </div>
      )}

      {issueMode === "kit" && (
        <div style={{ marginTop: "12px" }}>
          <h3>Issue entire kit</h3>
          <div className="form">
            <label>
              <span>Collected by</span>
              <select value={collector} onChange={(e) => setCollector(e.target.value)}>
                {request.authorized.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Due</span>
              <select value={dueLabel} onChange={(e) => setDueLabel(e.target.value)}>
                {["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            {/* Per-line unit selection */}
            {request.lines.map((line) => {
              const lineKits = kitLines.filter((k) => k.line.type === line.type && k.status === "Not issued");
              if (lineKits.length === 0) return null;
              const suggested = getSuggestedUnit(line.type, state.assets, state.loans);
              const available = state.assets.filter(
                (a) => a.type === line.type && !a.inRepair && !state.loans.some((l) => l.assetId === a.id && !l.returned),
              );
              return (
                <label key={line.type}>
                  <span>{line.type}</span>
                  <select
                    value={assetOverrides[line.type] ?? suggested?.id ?? ""}
                    onChange={(e) => setAssetOverrides({ ...assetOverrides, [line.type]: e.target.value })}
                  >
                    {available.map((a) => (
                      <option key={a.id} value={a.id}>{a.id} · {a.model}</option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button type="button" className="primary" onClick={handleIssueKit}>
              Confirm — issue all
            </button>
            <button type="button" onClick={() => setIssueMode("none")}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Add collector ── */}
      {!addCollectorMode && (
        <div style={{ marginTop: "12px" }}>
          <button type="button" onClick={() => setAddCollectorMode(true)}>
            Add a collector
          </button>
        </div>
      )}
      {addCollectorMode && (
        <div style={{ marginTop: "12px" }}>
          <h3>Add authorized collector</h3>
          <div className="form">
            <label>
              <span>Name</span>
              <select value={newCollectorName} onChange={(e) => setNewCollectorName(e.target.value)}>
                <option value="">Select…</option>
                {state.people
                  .filter((p) => !request.authorized.includes(p))
                  .map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
              </select>
            </label>
            <label>
              <span>Reason</span>
              <input
                type="text"
                value={newCollectorReason}
                onChange={(e) => setNewCollectorReason(e.target.value)}
                placeholder="Why are they collecting?"
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button type="button" className="primary" onClick={handleAddCollector}>
              Add collector
            </button>
            <button type="button" onClick={() => setAddCollectorMode(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
