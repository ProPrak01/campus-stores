import { useState } from "react";
import type { AppState } from "@campus/shared";
import { ASPECTS, distanceForWidth, imageAtDistance, type Aspect } from "../../tools/geometry";
import { PROJECTOR_SPECS } from "../../tools/specs";
import { convert, tidy } from "../../tools/units";

type Mode = "distance" | "width";

export function ThrowPanel({ state }: { state: AppState }) {
  const projectors = state.assets.filter((a) => PROJECTOR_SPECS[a.id]);
  const [unitId, setUnitId] = useState(projectors.find((a) => !a.inRepair)?.id ?? projectors[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("distance");
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [value, setValue] = useState("4");

  const spec = PROJECTOR_SPECS[unitId];
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && n > 0;
  const diagIn = (len: number) => convert(len, "Length", unit, "in");

  return (
    <div className="tool">
      <div className="tool-grid">
        <label className="tool-field">
          <span>Projector</span>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            {projectors.map((a) => (
              <option key={a.id} value={a.id}>{a.id} · {a.model}{a.inRepair ? " (in repair)" : ""}</option>
            ))}
          </select>
        </label>
        <label className="tool-field">
          <span>I know the</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="distance">Distance to the screen</option>
            <option value="width">Image width I want</option>
          </select>
        </label>
        <label className="tool-field">
          <span>{mode === "distance" ? "Distance" : "Image width"}</span>
          <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="tool-field">
          <span>Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as "m" | "ft")}>
            <option value="m">metres</option>
            <option value="ft">feet</option>
          </select>
        </label>
        <label className="tool-field">
          <span>Aspect ratio</span>
          <select value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
            {Object.keys(ASPECTS).map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>

      {spec && valid ? (
        <div className="tool-result" role="status">
          {mode === "distance" ? (() => {
            const { smallest, largest } = imageAtDistance(n, spec, aspect);
            return (
              <>
                <p>At {tidy(n, 2)} {unit} the image is between:</p>
                <p><b>{tidy(smallest.width, 2)} × {tidy(smallest.height, 2)} {unit}</b> ({tidy(diagIn(smallest.diagonal), 0)}″ diagonal), zoomed out</p>
                <p><b>{tidy(largest.width, 2)} × {tidy(largest.height, 2)} {unit}</b> ({tidy(diagIn(largest.diagonal), 0)}″ diagonal), zoomed in</p>
              </>
            );
          })() : (() => {
            const d = distanceForWidth(n, spec);
            return <p>For an image {tidy(n, 2)} {unit} wide, place the projector between <b>{tidy(d.nearest, 2)}</b> and <b>{tidy(d.farthest, 2)} {unit}</b> from the screen.</p>;
          })()}
          <small>Throw ratio {spec.throwMin} to {spec.throwMax}. Fictional sample specs.</small>
        </div>
      ) : (
        <p className="tool-error" role="alert">Enter a number above zero.</p>
      )}
    </div>
  );
}
