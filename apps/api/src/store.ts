import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedState, type AppState } from "@campus/shared";

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, "../data/state.json");

/** Single-process JSON-file store. Good enough for a desk demo; swap for SQLite later. */
let state: AppState = load();

function load(): AppState {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as AppState;
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
