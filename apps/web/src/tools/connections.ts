import type { AppState } from "@campus/shared";

export const SOURCES = ["USB-C", "HDMI", "DisplayPort", "VGA"] as const;
export type Source = (typeof SOURCES)[number];

/** Every projector at the desk takes HDMI. */
export function adapterAdvice(source: Source, state: AppState): string {
  if (source === "HDMI") return "No adapter needed. Use an HDMI cable.";

  const type = `${source} → HDMI adapter`;
  const units = state.assets.filter((a) => a.type === type && !a.inRepair);
  if (!units.length) return `The desk has no ${type}. Ask the club to bring one.`;

  const onShelf = units.filter((a) => !state.loans.some((l) => l.assetId === a.id && !l.returned));
  if (onShelf.length)
    return `${type}: ${onShelf.map((a) => `${a.id} on shelf (bin ${a.bin})`).join(", ")}.`;

  const out = units
    .map((a) => state.loans.find((l) => l.assetId === a.id && !l.returned))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return out
    ? `All ${type}s are out. Next back: ${out.assetId} with ${out.holder}, due ${out.dueLabel}.`
    : `All ${type}s are unavailable.`;
}
