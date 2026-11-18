import { useState } from "react";
import type { AppState, EquipmentRequest, Loan, Asset, RequestLine } from "@campus/shared";
import { api } from "../api";
import { ReturnPanel } from "../components/ReturnPanel";
import { DueChip } from "../components/DueChip";

interface Props {
  request: EquipmentRequest;
  state: AppState;
  mutate: (fn: () => Promise<AppState>, msg?: string) => Promise<void>;
  setStatus: (msg: string) => void;
  onBack: () => void;
}

const EVENT_LABEL = { issued: "Issued", passed_on: "Passed on", extended: "New return time", returned: "Returned" } as const;

type LineStatus = "Not issued" | "Out" | "Returned";

interface KitLine {
  line: RequestLine;
  loan: Loan | undefined;
  status: LineStatus;
}

function getKitLines(
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
      results.push({
        line,
        loan,
        status: loan ? (loan.returned ? "Returned" : "Out") : "Not issued",
      });
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
    return !loans.some((l) => l.assetId === a.id && !l.returned);
  });
}

export function KitView({ request, state, mutate, setStatus, onBack }: Props) {
  const [issueMode, setIssueMode] = useState<"none" | "kit" | "line">("none");
  const [collector, setCollector] = useState(request.authorized[0] ?? "");
  const [dueLabel, setDueLabel] = useState(request.dueLabel);
  const [assetOverrides, setAssetOverrides] = useState<Record<string, string>>({});

  // Per-line issue
  const [issueLineType, setIssueLineType] = useState<string | null>(null);

  // Add collector
  const [addCollectorMode, setAddCollectorMode] = useState(false);
  const [newCollectorName, setNewCollectorName] = useState("");
  const [newCollectorReason, setNewCollectorReason] = useState("");

  // Return
  const [returnLoanNum, setReturnLoanNum] = useState<number | null>(null);

  // Custody pass-on
  const [passOnLoanNum, setPassOnLoanNum] = useState<number | null>(null);
  const [passTo, setPassTo] = useState("");
  const [passBy, setPassBy] = useState("");

  // Extend due
  const [extendLoanNum, setExtendLoanNum] = useState<number | null>(null);
  const [extendDue, setExtendDue] = useState("");
  const [extendBy, setExtendBy] = useState("");

  // Timeline expansion
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);

  const kitLines = getKitLines(request, state.loans, state.assets);
  const summary = buildSummary(kitLines, state.assets);
  const hasUnissued = kitLines.some((k) => k.status === "Not issued");

  /* ── Handlers ── */

  const handleIssueKit = async () => {
    const assetIds: Record<string, string> = {};
    for (const line of request.lines) {
      const override = assetOverrides[line.type];
      if (override) {
        assetIds[line.type] = override;
      } else {
        const suggested = getSuggestedUnit(line.type, state.assets, state.loans);
        if (suggested) assetIds[line.type] = suggested.id;
      }
    }
    await mutate(
      () => api.issueKit({ requestId: request.id, collectedBy: collector, dueLabel, assetIds }),
      `Kit issued for ${request.id} to ${collector}.`,
    );
    setIssueMode("none");
  };

  const handleIssueLine = async (lineType: string) => {
    const override = assetOverrides[lineType];
    const asset = override
      ? state.assets.find((a) => a.id === override)
      : getSuggestedUnit(lineType, state.assets, state.loans);
    if (!asset) { setStatus("No available unit for " + lineType); return; }
    await mutate(
      () => api.issue({ requestId: request.id, assetId: asset.id, collectedBy: collector, dueLabel }),
      `Issued ${asset.id} (${lineType}) to ${collector}.`,
    );
    setIssueLineType(null);
    setIssueMode("none");
  };

  const handleReturn = async (assetId: string, returnedBy: string) => {
    await mutate(
      () => api.returnUnit({ assetId, returnedBy }),
      `${assetId} returned by ${returnedBy}.`,
    );
    setReturnLoanNum(null);
  };

  const handlePassOn = async (loanNum: number) => {
    if (!passTo || !passBy) { setStatus("Select who to pass to and who is passing."); return; }
    await mutate(
      () => api.passOn(loanNum, { to: passTo, by: passBy }),
      `Custody passed to ${passTo}.`,
    );
    setPassOnLoanNum(null);
  };

  const handleExtend = async (loanNum: number) => {
    if (!extendDue || !extendBy) { setStatus("Select new due time and who agreed."); return; }
    await mutate(
      () => api.extend(loanNum, { dueLabel: extendDue, by: extendBy }),
      `Due time extended to ${extendDue}.`,
    );
    setExtendLoanNum(null);
  };

  const handleAddCollector = async () => {
    if (!newCollectorName.trim() || !newCollectorReason.trim()) return;
    await mutate(
      () => api.addCollector(request.id, { name: newCollectorName.trim(), reason: newCollectorReason.trim() }),
      `${newCollectorName.trim()} added as collector for ${request.id}.`,
    );
    setAddCollectorMode(false);
    setNewCollectorName("");
    setNewCollectorReason("");
  };

  const availableUnits = (lineType: string) =>
    state.assets.filter(
      (a) => a.type === lineType && !a.inRepair && !state.loans.some((l) => l.assetId === a.id && !l.returned),
    );

  return (
    <div>
      <button type="button" onClick={onBack}>← Back to list</button>

      {/* ── Request header ── */}
      <div className="record" style={{ marginTop: "12px" }}>
        <small>{request.id} · Approved</small>
        <h3>{request.event}</h3>
        <p>{request.club} · Filed by {request.owner}</p>
        <p><b>Return by</b> {request.dueLabel}</p>
        {request.note && <p style={{ marginTop: "6px", fontStyle: "italic" }}>{request.note}</p>}
      </div>

      {/* ── Summary ── */}
      <div className="kit-summary">{summary}</div>

      {/* ── Kit lines ── */}
      {kitLines.map((k, i) => {
        const cls = k.status === "Returned" ? "tag good" : k.status === "Out" ? "tag out" : "tag";
        const isReturning = k.loan && returnLoanNum === k.loan.num;
        const isPassing = k.loan && passOnLoanNum === k.loan.num;
        const isExtending = k.loan && extendLoanNum === k.loan.num;
        const isExpanded = k.loan && expandedLoan === k.loan.num;

        return (
          <div className="kit-line" key={`${k.line.type}-${i}`}>
            <div className="row" style={{ borderTop: i === 0 ? undefined : undefined, padding: "6px 0" }}>
              <div>
                <strong>{k.line.type}</strong>
                {k.loan && k.status === "Out" && (
                  <small>{k.loan.assetId} · {k.loan.holder} · Due {k.loan.dueLabel}</small>
                )}
                {k.loan && k.status === "Returned" && (
                  <small>{k.loan.assetId} · returned{k.loan.returnedBy ? ` by ${k.loan.returnedBy}` : ""}</small>
                )}
                {!k.loan && (
                  <small>
                    {(() => {
                      const s = getSuggestedUnit(k.line.type, state.assets, state.loans);
                      return s ? `Suggested: ${s.id} (${s.model}) · Bin ${s.bin}` : "No unit available";
                    })()}
                  </small>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span className={cls}>{k.status}</span>
                {k.loan && <DueChip state={state} loan={k.loan} />}
                {/* Issue button (per-line) */}
                {k.status === "Not issued" && issueMode !== "kit" && (
                  <button type="button" onClick={() => { setIssueLineType(k.line.type); setIssueMode("line"); }}>
                    Issue
                  </button>
                )}
                {/* Return / Pass-on / Extend buttons for Out items */}
                {k.status === "Out" && k.loan && (
                  <>
                    <button type="button" onClick={() => setReturnLoanNum(k.loan!.num)}>
                      Return
                    </button>
                    <button type="button" onClick={() => { setPassOnLoanNum(k.loan!.num); setPassTo(""); setPassBy(k.loan!.holder); }}>
                      Pass on
                    </button>
                    <button type="button" onClick={() => { setExtendLoanNum(k.loan!.num); setExtendDue(""); setExtendBy(""); }}>
                      New due
                    </button>
                  </>
                )}
                {/* Timeline toggle */}
                {k.loan && k.loan.history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedLoan(isExpanded ? null : k.loan!.num)}
                    style={{ fontSize: "12px" }}
                  >
                    {isExpanded ? "Hide history" : "History"}
                  </button>
                )}
              </div>
            </div>

            {/* ── Return: clerk picks the unit in hand ── */}
            {isReturning && k.loan && (
              <ReturnPanel
                state={state}
                expected={k.loan}
                onConfirm={handleReturn}
                onCancel={() => setReturnLoanNum(null)}
              />
            )}

            {/* ── Pass-on form ── */}
            {isPassing && k.loan && (
              <div className="form" style={{ marginTop: "6px" }}>
                <label>
                  <span>Pass to</span>
                  <select value={passTo} onChange={(e) => setPassTo(e.target.value)}>
                    <option value="">Select…</option>
                    {state.people.filter((p) => p !== k.loan!.holder).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>
                  <span>Handed over by</span>
                  <select value={passBy} onChange={(e) => setPassBy(e.target.value)}>
                    {state.people.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <div className="full" style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="primary" onClick={() => handlePassOn(k.loan!.num)}>Confirm pass-on</button>
                  <button type="button" onClick={() => setPassOnLoanNum(null)}>Cancel</button>
                </div>
              </div>
            )}

            {/* ── Extend form ── */}
            {isExtending && k.loan && (
              <div className="form" style={{ marginTop: "6px" }}>
                <label>
                  <span>New return time</span>
                  <select value={extendDue} onChange={(e) => setExtendDue(e.target.value)}>
                    <option value="">Select…</option>
                    {state.dueOptions.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Agreed by</span>
                  <select value={extendBy} onChange={(e) => setExtendBy(e.target.value)}>
                    <option value="">Select…</option>
                    {state.people.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <div className="full" style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="primary" onClick={() => handleExtend(k.loan!.num)}>Confirm extension</button>
                  <button type="button" onClick={() => setExtendLoanNum(null)}>Cancel</button>
                </div>
              </div>
            )}

            {/* ── Loan history timeline ── */}
            {isExpanded && k.loan && (
              <div className="timeline">
                {k.loan.history.map((ev, j) => (
                  <div className="timeline-event" key={j}>
                    <strong>{EVENT_LABEL[ev.kind]}</strong>
                    <small>{ev.text} · {state.shifts[ev.phase]?.time ?? ""} · by {ev.by}</small>
                  </div>
                ))}
              </div>
            )}

            {/* ── Per-line issue form ── */}
            {issueMode === "line" && issueLineType === k.line.type && k.status === "Not issued" && (
              <div className="form" style={{ marginTop: "6px" }}>
                <label>
                  <span>Unit</span>
                  <select
                    value={assetOverrides[k.line.type] ?? getSuggestedUnit(k.line.type, state.assets, state.loans)?.id ?? ""}
                    onChange={(e) => setAssetOverrides({ ...assetOverrides, [k.line.type]: e.target.value })}
                  >
                    {availableUnits(k.line.type).map((a) => (
                      <option key={a.id} value={a.id}>{a.id} · {a.model}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Collected by</span>
                  <select value={collector} onChange={(e) => setCollector(e.target.value)}>
                    {request.authorized.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>
                  <span>Due</span>
                  <select value={dueLabel} onChange={(e) => setDueLabel(e.target.value)}>
                    {state.dueOptions.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
                  </select>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "end" }}>
                  <button type="button" className="primary" onClick={() => handleIssueLine(k.line.type)}>Confirm issue</button>
                  <button type="button" onClick={() => { setIssueMode("none"); setIssueLineType(null); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Issue entire kit ── */}
      {hasUnissued && issueMode === "none" && (
        <div className="kit-actions">
          <button type="button" className="primary" onClick={() => setIssueMode("kit")}>Issue kit</button>
        </div>
      )}

      {issueMode === "kit" && (
        <div style={{ marginTop: "12px" }}>
          <h3>Issue entire kit</h3>
          <div className="form">
            <label>
              <span>Collected by</span>
              <select value={collector} onChange={(e) => setCollector(e.target.value)}>
                {request.authorized.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>
              <span>Due</span>
              <select value={dueLabel} onChange={(e) => setDueLabel(e.target.value)}>
                {state.dueOptions.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
              </select>
            </label>
            {request.lines.map((line) => {
              const lineKits = kitLines.filter((k) => k.line.type === line.type && k.status === "Not issued");
              if (lineKits.length === 0) return null;
              const suggested = getSuggestedUnit(line.type, state.assets, state.loans);
              const avail = availableUnits(line.type);
              return (
                <label key={line.type}>
                  <span>{line.type}</span>
                  <select
                    value={assetOverrides[line.type] ?? suggested?.id ?? ""}
                    onChange={(e) => setAssetOverrides({ ...assetOverrides, [line.type]: e.target.value })}
                  >
                    {avail.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.model}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button type="button" className="primary" onClick={handleIssueKit}>Confirm — issue all</button>
            <button type="button" onClick={() => setIssueMode("none")}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Add collector ── */}
      {!addCollectorMode ? (
        <div style={{ marginTop: "12px" }}>
          <button type="button" onClick={() => setAddCollectorMode(true)}>Add a collector</button>
        </div>
      ) : (
        <div style={{ marginTop: "12px" }}>
          <h3>Add authorized collector</h3>
          <div className="form">
            <label>
              <span>Name</span>
              <select value={newCollectorName} onChange={(e) => setNewCollectorName(e.target.value)}>
                <option value="">Select…</option>
                {state.people.filter((p) => !request.authorized.includes(p)).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Reason</span>
              <input type="text" value={newCollectorReason} onChange={(e) => setNewCollectorReason(e.target.value)} placeholder="Why are they collecting?" />
            </label>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button type="button" className="primary" onClick={handleAddCollector}>Add collector</button>
            <button type="button" onClick={() => setAddCollectorMode(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
