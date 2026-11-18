import { useEffect, useRef, useState } from "react";
import type { AppState } from "@campus/shared";
import { CalculatorPanel } from "./CalculatorPanel";
import { ThrowPanel } from "./ThrowPanel";
import { ConvertPanel } from "./ConvertPanel";
import { ConnectionPanel } from "./ConnectionPanel";

const TOOLS = ["Calculator", "Projector throw", "Converters", "Connections"] as const;
type Tool = (typeof TOOLS)[number];
const KEY = "campus-stores.tool";

export function ToolsDrawer({ state, onClose }: { state: AppState; onClose: () => void }) {
  const [tool, setTool] = useState<Tool>(() => {
    const saved = localStorage.getItem(KEY) as Tool | null;
    return saved && TOOLS.includes(saved) ? saved : "Calculator";
  });
  const ref = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    ref.current?.focus();
    const back = opener.current;
    return () => back?.focus();
  }, []);

  const choose = (t: Tool) => {
    setTool(t);
    try { localStorage.setItem(KEY, t); } catch { /* storage unavailable */ }
  };

  // Escape closes. Tab stays inside the drawer.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key !== "Tab") return;
    const items = ref.current?.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (!items?.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <aside className="drawer" role="dialog" aria-modal="true" aria-label="Desk tools" ref={ref} tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="drawer-head">
        <h2>Desk tools</h2>
        <button type="button" onClick={onClose} aria-label="Close tools">✕</button>
      </div>
      <div className="drawer-tabs" role="tablist" aria-label="Tools">
        {TOOLS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tool === t} onClick={() => choose(t)}>{t}</button>
        ))}
      </div>
      <div className="drawer-body" role="tabpanel">
        {tool === "Calculator" && <CalculatorPanel />}
        {tool === "Projector throw" && <ThrowPanel state={state} />}
        {tool === "Converters" && <ConvertPanel />}
        {tool === "Connections" && <ConnectionPanel state={state} />}
      </div>
    </aside>
  );
}
