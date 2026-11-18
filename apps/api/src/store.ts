import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedState, type AppState } from "@campus/shared";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.env.STATE_FILE ?? resolve(here, "../data/state.json");

/** Single-process JSON-file store. Good enough for a desk demo; swap for SQLite later. */
let state: AppState = load();

function load(): AppState {
  try {
    if (existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, "utf8")) as AppState;
      // A file saved by an older build lacks the due-time fields. Start fresh instead of serving bad data.
      if (Array.isArray(saved.dueOptions) && Array.isArray(saved.messages) && saved.loans.every((l) => l.dueAt))
        return saved;
    }
  } catch {
    // fall through to a fresh seed if the file is unreadable
  }
  return seedState();
}

export const getState = (): AppState => state;

export function setState(next: AppState): AppState {
  state = next;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2));
  return state;
}

export const resetState = (): AppState => setState(seedState());
