import { useState } from "react";
import { calculate } from "../../tools/calculator";

const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "%", "+", "(", ")"];

export function CalculatorPanel() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const run = () => {
    const r = calculate(text.replace(/−/g, "-"));
    if (!r.ok) return setError(r.error);
    setError("");
    setHistory([`${text} = ${r.value}`, ...history].slice(0, 5));
    setText(String(r.value));
  };

  return (
    <div className="tool">
      <label className="tool-field">
        <span>Sum</span>
        <input
          value={text}
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 3 × (4 + 2) − 10%"
          onChange={(e) => { setText(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }}
        />
      </label>
      {error && <p className="tool-error" role="alert">{error}</p>}
      <div className="keypad">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => { setText(text + k); setError(""); }}>{k}</button>
        ))}
        <button type="button" onClick={() => setText(text.slice(0, -1))} aria-label="Backspace">⌫</button>
        <button type="button" onClick={() => { setText(""); setError(""); }}>Clear</button>
        <button type="button" className="primary equals" onClick={run}>=</button>
      </div>
      {history.length > 0 && (
        <ul className="tool-history" aria-label="Recent results">
          {history.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      )}
    </div>
  );
}
