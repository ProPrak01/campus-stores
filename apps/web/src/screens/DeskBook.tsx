import { useState, useEffect } from "react";
import type { AppState } from "@campus/shared";
import { api } from "../api";
import type { HandoverSummary } from "../api";

interface Props {
  state: AppState;
  mutate: (fn: () => Promise<AppState>, msg?: string) => Promise<void>;
  setStatus: (msg: string) => void;
}

interface Entry {
  key: string;
  phase: number;
  time: string;
  author: string;
  body: string;
  requestId?: string;
}

/**
 * Club messages that have arrived by the current phase, merged with handover notes, newest first.
 * Within a phase, club messages come before the notes the desk wrote during that phase.
 */
function deskBookEntries(state: AppState): Entry[] {
  const messages: Entry[] = state.messages
    .filter((m) => m.phase <= state.phase)
    .map((m, i) => ({ key: `m${i}`, phase: m.phase, time: m.time, author: m.author, body: m.text }));
  const notes: Entry[] = state.notes.map((n) => ({
    key: `n${n.id}`,
    phase: n.phase,
    time: state.shifts[n.phase]?.time ?? "",
    author: "Counter handover",
    body: n.text,
    requestId: n.requestId,
  }));
  // Array.prototype.sort is stable, so source order is kept within a phase.
  return [...messages, ...notes].sort((a, b) => a.phase - b.phase).reverse();
}

export function DeskBookScreen({ state, mutate, setStatus }: Props) {
  const [noteText, setNoteText] = useState("");
  const [noteRequestId, setNoteRequestId] = useState("");
  const [handover, setHandover] = useState<HandoverSummary | null>(null);

  useEffect(() => {
    api.getHandover().then(setHandover).catch(() => {
      setHandover(null);
    });
  }, [state]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;
    await mutate(
      () => api.addNote({ text, requestId: noteRequestId || undefined }),
      "Handover note saved.",
    );
    setNoteText("");
    setNoteRequestId("");
  };

  const allEntries = deskBookEntries(state);

  return (
    <div>
      <div className="sectionhead">
        <div>
          <h2>Desk book</h2>
          <small>Messages from clubs and notes for the next shift</small>
        </div>
      </div>

      {/* ── Generated handover summary (pinned at top) ── */}
      {handover && handover.summary.length > 0 && (
        <div className="record" style={{ borderLeftColor: "var(--mark)", marginBottom: "12px" }}>
          <small>Generated handover summary</small>
          <h3>Outstanding items</h3>
          {handover.summary.map((item) => (
            <p key={item.loanNum}>
              <strong>{item.assetId}</strong> · {item.requestId} ({item.club}) · with {item.holder} · Due {item.dueLabel}
              {item.dueStatus === "overdue" && <span className="tag overdue" style={{ marginLeft: 6 }}>Overdue</span>}
              {item.dueStatus === "due_soon" && <span className="tag soon" style={{ marginLeft: 6 }}>Due soon</span>}
              <br />
              <small>{item.nextStep}</small>
            </p>
          ))}
        </div>
      )}

      {/* ── Entries ── */}
      {allEntries.map((entry) => (
        <article className="record" key={entry.key}>
          <small>{entry.time}</small>
          <h3>{entry.author}</h3>
          <p>{entry.body}</p>
          {entry.requestId && (
            <small style={{ color: "var(--sel)" }}>Linked to {entry.requestId}</small>
          )}
        </article>
      ))}

      {/* ── Note form ── */}
      <form onSubmit={handleAddNote} style={{ marginTop: "14px" }}>
        <div className="form">
          <label className="full">
            <span>Note for the next shift</span>
            <textarea
              name="note"
              rows={2}
              maxLength={400}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </label>
          <label>
            <span>Link to request (optional)</span>
            <select value={noteRequestId} onChange={(e) => setNoteRequestId(e.target.value)}>
              <option value="">None</option>
              {state.requests.map((r) => (
                <option key={r.id} value={r.id}>{r.id} · {r.club}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit">Add handover note</button>
      </form>
    </div>
  );
}
