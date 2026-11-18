import { useEffect, useState, useCallback } from "react";
import type { AppState } from "@campus/shared";
import { api } from "./api";
import { Icon } from "./components/Icon";
import { RequestsScreen } from "./screens/Requests";
import { InventoryScreen } from "./screens/Inventory";
import { LoanRegisterScreen } from "./screens/LoanRegister";
import { DeskBookScreen } from "./screens/DeskBook";

type Tab = "Requests" | "Inventory" | "Loan register" | "Desk book";

const NAV_ITEMS: { tab: Tab; icon: "clipboard-list" | "package" | "book-open" | "messages-square" }[] = [
  { tab: "Requests", icon: "clipboard-list" },
  { tab: "Inventory", icon: "package" },
  { tab: "Loan register", icon: "book-open" },
  { tab: "Desk book", icon: "messages-square" },
];

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Requests");
  const [status, setStatus] = useState("Sample shift · All records are fictional.");

  const load = useCallback(() => {
    api.getState().then(setState).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Wrapper for any mutation: replace state from server response, show status. */
  const mutate = useCallback(async (
    fn: () => Promise<AppState>,
    successMsg?: string,
  ) => {
    try {
      const next = await fn();
      setState(next);
      if (successMsg) setStatus(successMsg);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setStatus(msg);
    }
  }, []);

  const handleRestart = useCallback(() => {
    mutate(() => api.reset(), "Shift restarted. All records restored.");
  }, [mutate]);

  const handleAdvance = useCallback(() => {
    mutate(() => api.advancePhase(), "Shift time updated.");
  }, [mutate]);

  if (error) return <p role="alert">Could not reach the API: {error}</p>;
  if (!state) return <p>Loading…</p>;

  const shift = state.shifts[state.phase];
  const hasNext = state.phase < 2;

  return (
    <div id="campus-stores">
      {/* ── Header ── */}
      <header className="mast">
        <div className="brandblock">
          <div className="brandmark" aria-hidden="true">
            <Icon name="package-open" size={25} />
          </div>
          <div>
            <h1>Campus Stores</h1>
            <div className="muted">Media equipment desk</div>
          </div>
        </div>
        <div className="clock">
          <small>Desk time</small>
          <strong>{shift?.time}</strong>
        </div>
      </header>

      {/* ── Shift banner ── */}
      {shift && (
        <aside className="shift">
          <div>
            <b>{shift.title}</b>
            <p>{shift.text}</p>
          </div>
          {hasNext && (
            <button type="button" onClick={handleAdvance}>
              {state.phase === 0 ? "Move to return time" : "Move to next morning"}
            </button>
          )}
        </aside>
      )}

      {/* ── Shell: Nav + Page ── */}
      <div className="shell">
        <nav aria-label="Store records">
          {NAV_ITEMS.map(({ tab: t, icon }) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              <Icon name={icon} />
              {t}
            </button>
          ))}
        </nav>

        <section className="page" aria-label="Selected register">
          {tab === "Requests" && (
            <RequestsScreen state={state} mutate={mutate} setStatus={setStatus} />
          )}
          {tab === "Inventory" && (
            <InventoryScreen state={state} />
          )}
          {tab === "Loan register" && (
            <LoanRegisterScreen state={state} />
          )}
          {tab === "Desk book" && (
            <DeskBookScreen state={state} mutate={mutate} setStatus={setStatus} />
          )}
        </section>
      </div>

      {/* ── Status bar ── */}
      <div className="statusbar">
        <span role="status" aria-live="polite">{status}</span>
        <button type="button" onClick={handleRestart}>Restart sample shift</button>
      </div>
    </div>
  );
}
