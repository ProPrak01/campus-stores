import { useEffect, useState, useCallback, useRef } from "react";
import type { AppState } from "@campus/shared";
import { api } from "./api";
import type { Mutate } from "./lib/types";
import { Icon } from "./components/Icon";
import { RequestsScreen } from "./screens/Requests";
import { InventoryScreen } from "./screens/Inventory";
import { LoanRegisterScreen } from "./screens/LoanRegister";
import { DeskBookScreen } from "./screens/DeskBook";
import { ToolsDrawer } from "./components/tools/ToolsDrawer";

type Tab = "Requests" | "Inventory" | "Loan register" | "Desk book";
type Theme = "system" | "light" | "dark";
const THEMES: Theme[] = ["system", "light", "dark"];
const THEME_KEY = "campus-stores.theme";

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
  const [alert, setAlert] = useState("");
  const [advancePrompt, setAdvancePrompt] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    return saved && THEMES.includes(saved) ? saved : "system";
  });
  const pageRef = useRef<HTMLElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Theme: "system" follows the OS. Light and dark force a color scheme through [data-theme] on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // "t" opens the tools drawer, unless the user is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "t" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))) return;
      setToolsOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(() => {
    api.getState().then(setState).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Run a mutation, replace state from the response, and report whether it worked. */
  const mutate: Mutate = useCallback(async (fn, successMsg) => {
    try {
      const next = await fn();
      setState(next);
      setAlert("");
      if (successMsg) setStatus(successMsg);
      return true;
    } catch (e: unknown) {
      setAlert(e instanceof Error ? e.message : "Something went wrong");
      return false;
    }
  }, []);

  // After an error, move focus to the alert so it is read out and easy to find.
  useEffect(() => {
    if (alert) alertRef.current?.focus();
  }, [alert]);

  const handleRestart = useCallback(() => {
    mutate(() => api.reset(), "Shift restarted. All records restored.");
  }, [mutate]);

  const handleAdvance = useCallback(() => {
    if (!state) return;
    // Open loans and no handover note for this phase: ask first (does not block).
    const hasOpenLoans = state.loans.some((l) => !l.returned);
    const hasNoteThisPhase = state.notes.some((n) => n.phase === state.phase);
    if (hasOpenLoans && !hasNoteThisPhase) {
      setAdvancePrompt(true);
      return;
    }
    mutate(() => api.advancePhase(), "Shift time updated.");
  }, [mutate, state]);

  const confirmAdvance = useCallback(() => {
    setAdvancePrompt(false);
    mutate(() => api.advancePhase(), "Shift time updated.");
  }, [mutate]);

  // Move focus to the page when the tab changes.
  useEffect(() => {
    pageRef.current?.focus();
  }, [tab]);

  if (error) return <p role="alert">Could not reach the API: {error}</p>;
  if (!state) return <p>Loading…</p>;

  const shift = state.shifts[state.phase];
  const hasNext = state.phase < 2;

  // W5: from the second shift on, show what is still out and the latest handover note.
  const openCount = state.loans.filter((l) => !l.returned).length;
  const latestNote = state.notes.length ? state.notes[state.notes.length - 1] : undefined;
  const showHandover = state.phase >= 1 && (openCount > 0 || latestNote);

  return (
    <div id="campus-stores">
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
        <div className="mast-tools">
          <button type="button" onClick={() => setToolsOpen(true)} aria-keyshortcuts="t">
            <Icon name="calculator" /> Tools
          </button>
          <button
            type="button"
            onClick={() => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!)}
            aria-label={`Theme: ${theme}. Click to change.`}
          >
            <Icon name={theme === "dark" ? "moon" : theme === "light" ? "sun" : "monitor"} />
          </button>
        </div>
      </header>

      {shift && (
        <aside className="shift">
          <div>
            <b>{shift.title}</b>
            <p>{shift.text}</p>
            {showHandover && (
              <button type="button" className="handover-line" onClick={() => setTab("Desk book")}>
                {openCount} {openCount === 1 ? "item" : "items"} still out
                {latestNote ? ` · latest note: ${latestNote.text}` : ""}
              </button>
            )}
          </div>
          {hasNext && (
            <button type="button" onClick={handleAdvance}>
              {state.phase === 0 ? "Move to return time" : "Move to next morning"}
            </button>
          )}
        </aside>
      )}

      {advancePrompt && (
        <div className="alert-box advance-prompt" role="alert">
          <span>There are open loans and no handover note for this phase. Advance anyway?</span>
          <div className="actions">
            <button type="button" className="primary" onClick={confirmAdvance}>Advance</button>
            <button type="button" onClick={() => { setAdvancePrompt(false); setTab("Desk book"); }}>
              Write a note first
            </button>
          </div>
        </div>
      )}

      {alert && (
        <div className="alert-box error" role="alert" ref={alertRef} tabIndex={-1}>
          {alert}
        </div>
      )}

      <div className="shell">
        <nav aria-label="Store records">
          {NAV_ITEMS.map(({ tab: t, icon }) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => { setTab(t); setAlert(""); }}
            >
              <Icon name={icon} />
              {t}
            </button>
          ))}
        </nav>

        <section className="page" aria-label="Selected register" ref={pageRef} tabIndex={-1}>
          {tab === "Requests" && <RequestsScreen state={state} mutate={mutate} />}
          {tab === "Inventory" && <InventoryScreen state={state} />}
          {tab === "Loan register" && <LoanRegisterScreen state={state} mutate={mutate} />}
          {tab === "Desk book" && <DeskBookScreen state={state} mutate={mutate} />}
        </section>
      </div>

      <div className="statusbar">
        <span role="status" aria-live="polite">{status}</span>
        <button type="button" onClick={handleRestart}>Restart sample shift</button>
      </div>
      {toolsOpen && <ToolsDrawer state={state} onClose={() => setToolsOpen(false)} />}
    </div>
  );
}
