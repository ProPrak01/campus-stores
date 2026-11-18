export type Quantity = "Length" | "Weight" | "Temperature";

/** Size of each unit in the base unit (metres, kilograms). Temperature is handled separately. */
const FACTORS: Record<Exclude<Quantity, "Temperature">, Record<string, number>> = {
  Length: { m: 1, cm: 0.01, ft: 0.3048, in: 0.0254 },
  Weight: { kg: 1, lb: 0.45359237 },
};

export const UNITS: Record<Quantity, string[]> = {
  Length: Object.keys(FACTORS.Length),
  Weight: Object.keys(FACTORS.Weight),
  Temperature: ["°C", "°F"],
};

export function convert(value: number, quantity: Quantity, from: string, to: string): number {
  if (quantity === "Temperature") {
    if (from === to) return value;
    return from === "°C" ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
  }
  const table = FACTORS[quantity];
  const f = table[from];
  const t = table[to];
  if (f === undefined || t === undefined) throw new Error(`Unknown unit: ${from} or ${to}`);
  return (value * f) / t;
}

/** Round for display without showing floating point noise. */
export const tidy = (n: number, digits = 4): string =>
  Number.isFinite(n) ? String(Number(n.toFixed(digits))) : "—";
