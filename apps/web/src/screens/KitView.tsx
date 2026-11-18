import { useEffect, useRef, useState } from "react";
import type { AppState, EquipmentRequest } from "@campus/shared";
import { api } from "../api";
import type { Mutate } from "../lib/types";
import { buildSummary, getKitLines } from "../lib/kit";
import { ReturnPanel } from "../components/ReturnPanel";
import { InlineForm } from "../components/kit/InlineForm";
import { KitLineRow, type RowAction } from "../components/kit/KitLineRow";
import { IssueKitForm } from "../components/kit/IssueKitForm";
import { LineIssueForm } from "../components/kit/LineIssueForm";
import { PassOnForm } from "../components/kit/PassOnForm";
import { ExtendForm } from "../components/kit/ExtendForm";
import { AddCollectorForm } from "../components/kit/AddCollectorForm";
import { LoanHistory } from "../components/kit/LoanHistory";

interface Props {
  request: EquipmentRequest;
  state: AppState;
  mutate: Mutate;
  onBack: () => void;
}

export function KitView({ request, state, mutate, onBack }: Props) {
  const [kitForm, setKitForm] = useState(false);
  const [addCollector, setAddCollector] = useState(false);
  const [rowOpen, setRowOpen] = useState<{ index: number; action: RowAction } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Opening a request puts focus on its heading.
  useEffect(() => headingRef.current?.focus(), []);
  const done = () => requestAnimationFrame(() => summaryRef.current?.focus());

  const kitLines = getKitLines(request, state.loans, state.assets);
  const summary = buildSummary(kitLines, state.assets);
  const hasUnissued = kitLines.some((k) => k.status === "Not issued");
  const canIssueAny = kitLines.some(
    (k) => k.status === "Not issued" && state.assets.some((a) => a.type === k.line.type && !a.inRepair && !state.loans.some((l) => l.assetId === a.id && !l.returned)),
  );
  const notes = state.notes.filter((n) => n.requestId === request.id).slice().reverse();

  const run = async (fn: () => Promise<AppState>, msg: string): Promise<boolean> => {
    const ok = await mutate(fn, msg);
    if (ok) done();
    return ok;
  };

  const issueKit = (collector: string, dueLabel: string, assetIds: Record<string, string>) => {
    const missing = request.lines.filter((l) => !assetIds[l.type] && kitLines.some((k) => k.line.type === l.type && k.status === "Not issued"));
    // The API issues a whole kit or nothing. If some line has no unit, issue the lines that can go one by one.
    const fn = missing.length === 0
      ? () => api.issueKit({ requestId: request.id, collectedBy: collector, dueLabel, assetIds })
      : async () => {
          let next: AppState | undefined;
          for (const id of Object.values(assetIds))
            next = await api.issue({ requestId: request.id, assetId: id, collectedBy: collector, dueLabel });
          return next ?? (await api.getState());
        };
    return run(fn, `Issued ${request.id} to ${collector}${missing.length ? `. Skipped: ${missing.map((m) => m.type).join(", ")}` : ""}.`);
  };

  return (
    <div>
      <button type="button" onClick={onBack}>← Back to list</button>

      <div className="record kit-head">
        <small>{request.id} · Approved</small>
        <h3 ref={headingRef} tabIndex={-1}>{request.event}</h3>
        <p>{request.club} · Filed by {request.owner}</p>
        <p><b>Return by</b> {request.dueLabel}</p>
        <p><b>May collect</b> {request.authorized.join(", ")}</p>
        {request.collectorLog?.map((c, i) => (
          <p key={i} className="muted">
            {c.name} added at {state.shifts[c.phase]?.time}: {c.reason}
          </p>
        ))}
        {request.note && <p className="request-note">{request.note}</p>}
      </div>

      <div className="kit-summary" ref={summaryRef} tabIndex={-1}>{summary}</div>

      {kitLines.map((k, i) => {
        const open = rowOpen?.index === i ? rowOpen.action : null;
        const close = () => setRowOpen(null);
        return (
          <div className="kit-line" key={`${k.line.type}-${i}`}>
            <KitLineRow k={k} state={state} open={open} onAction={(a) => setRowOpen(a ? { index: i, action: a } : null)} />
            {open === "return" && k.loan && (
              <InlineForm onClose={close}>
                {(c) => (
                  <ReturnPanel
                    state={state}
                    expected={k.loan!}
                    onConfirm={async (assetId, returnedBy) => {
                      if (await run(() => api.returnUnit({ assetId, returnedBy }), `${assetId} returned by ${returnedBy}.`)) c();
                    }}
                    onCancel={c}
                  />
                )}
              </InlineForm>
            )}
            {open === "pass" && k.loan && (
              <PassOnForm loan={k.loan} state={state} onClose={close}
                onSubmit={(to, by) => run(() => api.passOn(k.loan!.num, { to, by }), `${k.loan!.assetId} passed to ${to}.`)} />
            )}
            {open === "extend" && k.loan && (
              <ExtendForm loan={k.loan} state={state} onClose={close}
                onSubmit={(due, by) => run(() => api.extend(k.loan!.num, { dueLabel: due, by }), `Return time set to ${due}.`)} />
            )}
            {open === "issue" && (
              <LineIssueForm request={request} state={state} lineType={k.line.type} onClose={close}
                onSubmit={(assetId, collector, due) =>
                  run(() => api.issue({ requestId: request.id, assetId, collectedBy: collector, dueLabel: due }), `Issued ${assetId} to ${collector}.`)} />
            )}
            {open === "history" && k.loan && <LoanHistory loan={k.loan} state={state} />}
          </div>
        );
      })}

      {hasUnissued && !kitForm && (
        <div className="kit-actions">
          <button type="button" className="primary" disabled={!canIssueAny} onClick={() => setKitForm(true)}>Issue kit</button>
          {!canIssueAny && <small>No unit is on the shelf for any open line.</small>}
        </div>
      )}
      {kitForm && (
        <IssueKitForm request={request} state={state} kitLines={kitLines} onClose={() => setKitForm(false)} onSubmit={issueKit} />
      )}

      {addCollector ? (
        <AddCollectorForm request={request} state={state} onClose={() => setAddCollector(false)}
          onSubmit={(name, reason) => run(() => api.addCollector(request.id, { name, reason }), `${name} added as collector for ${request.id}.`)} />
      ) : (
        <div className="kit-actions">
          <button type="button" onClick={() => setAddCollector(true)}>Add a collector</button>
        </div>
      )}

      {notes.length > 0 && (
        <section className="kit-notes" aria-label="Handover notes for this request">
          <h3>Handover notes</h3>
          {notes.map((n) => (
            <p key={n.id}><small>{state.shifts[n.phase]?.time}</small><br />{n.text}</p>
          ))}
        </section>
      )}
    </div>
  );
}
