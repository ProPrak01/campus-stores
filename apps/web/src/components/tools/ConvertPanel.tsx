import { useState } from "react";
import { ASPECTS, sizeFromDiagonal, type Aspect } from "../../tools/geometry";
import { convert, tidy, UNITS, type Quantity } from "../../tools/units";

export function ConvertPanel() {
  const [quantity, setQuantity] = useState<Quantity>("Length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [value, setValue] = useState("1");

  const [diag, setDiag] = useState("55");
  const [aspect, setAspect] = useState<Aspect>("16:9");

  const pick = (q: Quantity) => {
    setQuantity(q);
    setFrom(UNITS[q][0]!);
    setTo(UNITS[q][1]!);
  };
  const n = Number(value);
  const ok = value.trim() !== "" && Number.isFinite(n);
  const d = Number(diag);
  const dOk = diag.trim() !== "" && Number.isFinite(d) && d > 0;
  const size = dOk ? sizeFromDiagonal(d, aspect) : undefined;

  return (
    <div className="tool">
      <h3>Unit converter</h3>
      <div className="tool-grid">
        <label className="tool-field">
          <span>Measure</span>
          <select value={quantity} onChange={(e) => pick(e.target.value as Quantity)}>
            {(Object.keys(UNITS) as Quantity[]).map((q) => <option key={q}>{q}</option>)}
          </select>
        </label>
        <label className="tool-field">
          <span>Value</span>
          <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="tool-field">
          <span>From</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {UNITS[quantity].map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="tool-field">
          <span>To</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {UNITS[quantity].map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
      </div>
      <p className="tool-result" role="status">
        {ok ? <><b>{tidy(n)} {from}</b> = <b>{tidy(convert(n, quantity, from, to))} {to}</b></> : "Enter a number."}
      </p>

      <h3>Screen size</h3>
      <div className="tool-grid">
        <label className="tool-field">
          <span>Diagonal (inches)</span>
          <input value={diag} inputMode="decimal" onChange={(e) => setDiag(e.target.value)} />
        </label>
        <label className="tool-field">
          <span>Aspect ratio</span>
          <select value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
            {Object.keys(ASPECTS).map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <p className="tool-result" role="status">
        {size
          ? <><b>{tidy(size.width, 1)} × {tidy(size.height, 1)} in</b> ({tidy(size.width * 2.54, 1)} × {tidy(size.height * 2.54, 1)} cm)</>
          : "Enter a diagonal above zero."}
      </p>
    </div>
  );
}
