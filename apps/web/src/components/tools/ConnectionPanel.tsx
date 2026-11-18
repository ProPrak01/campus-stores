import { useState } from "react";
import type { AppState } from "@campus/shared";
import { adapterAdvice, SOURCES, type Source } from "../../tools/connections";

export function ConnectionPanel({ state }: { state: AppState }) {
  const [source, setSource] = useState<Source>("USB-C");
  const request = state.requests.find((r) => r.note.includes("USB-C"));

  return (
    <div className="tool">
      <label className="tool-field">
        <span>The laptop or player has</span>
        <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <p className="tool-result" role="status">
        The projector takes HDMI. {adapterAdvice(source, state)}
      </p>
      {request && source === "USB-C" && (
        <small>{request.id} ({request.club}): “{request.note}”</small>
      )}
    </div>
  );
}
