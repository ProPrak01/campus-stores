import type { DueStatus } from "./types.js";

/** A loan is "due soon" when it falls due within this many minutes of the desk clock. */
export const DUE_SOON_MINUTES = 60;

/** Compare a due time with the desk clock. Both are local ISO strings, so they compare as dates. */
export function dueStatus(nowAt: string, dueAt: string): DueStatus {
  const diff = (Date.parse(dueAt) - Date.parse(nowAt)) / 60000;
  if (diff < 0) return "overdue";
  return diff <= DUE_SOON_MINUTES ? "due_soon" : "ok";
}
