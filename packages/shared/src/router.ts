import * as domain from "./domain.js";
import { DomainError } from "./domain.js";
import { seedState } from "./seed.js";
import type { AppState } from "./types.js";

/** Where state lives: a JSON file on the server, localStorage in the static build. */
export interface StateStore {
  get(): AppState;
  set(next: AppState): AppState;
}

export interface RouteResult {
  status: number;
  body: unknown;
}

type Body = Record<string, unknown>;
const asBody = (b: unknown): Body =>
  b && typeof b === "object" && !Array.isArray(b) ? (b as Body) : {};
const need = (b: Body, key: string): string => {
  const v = b[key];
  if (typeof v !== "string" || !v.trim()) throw new DomainError(422, `"${key}" is required.`);
  return v.trim();
};
const opt = (b: Body, key: string): string | undefined => {
  const v = b[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const slip = (raw: string): number => {
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new DomainError(422, "Slip number must be a whole number.");
  return n;
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/**
 * The whole HTTP API as one function. The Fastify server and the static (GitHub Pages)
 * build both call this, so the rules and messages are identical in both.
 */
export function createRouter(store: StateStore) {
  /** Run a command on a copy of the state. If it throws, nothing is saved. */
  const mutate = (fn: (draft: AppState) => void): AppState => {
    const draft = clone(store.get());
    fn(draft);
    return store.set(draft);
  };

  const post: [RegExp, (m: RegExpMatchArray, b: Body) => unknown][] = [
    [/^\/api\/reset$/, () => store.set(seedState())],
    [/^\/api\/phase\/advance$/, () => mutate((s) => domain.advancePhase(s))],
    [
      /^\/api\/issue$/,
      (_m, b) =>
        mutate((s) =>
          domain.issue(s, {
            requestId: need(b, "requestId"),
            assetId: need(b, "assetId"),
            collectedBy: need(b, "collectedBy"),
            dueLabel: opt(b, "dueLabel"),
          }),
        ),
    ],
    [
      /^\/api\/issue-kit$/,
      (_m, b) => {
        const assetIds = Object.fromEntries(
          Object.entries(asBody(b.assetIds)).filter(
            (e): e is [string, string] => typeof e[1] === "string" && !!e[1],
          ),
        );
        return mutate((s) =>
          domain.issueKit(s, {
            requestId: need(b, "requestId"),
            collectedBy: need(b, "collectedBy"),
            dueLabel: opt(b, "dueLabel"),
            assetIds,
          }),
        );
      },
    ],
    [
      /^\/api\/return$/,
      (_m, b) =>
        mutate((s) =>
          domain.returnUnit(s, { assetId: need(b, "assetId"), returnedBy: need(b, "returnedBy") }),
        ),
    ],
    [
      /^\/api\/loans\/([^/]+)\/pass-on$/,
      (m, b) =>
        mutate((s) => domain.passOn(s, slip(m[1]!), { to: need(b, "to"), by: opt(b, "by") ?? "" })),
    ],
    [
      /^\/api\/loans\/([^/]+)\/extend$/,
      (m, b) =>
        mutate((s) =>
          domain.extend(s, slip(m[1]!), { dueLabel: need(b, "dueLabel"), by: opt(b, "by") ?? "" }),
        ),
    ],
    [
      /^\/api\/requests\/([^/]+)\/collectors$/,
      (m, b) =>
        mutate((s) =>
          domain.addCollector(s, decodeURIComponent(m[1]!), {
            name: need(b, "name"),
            reason: need(b, "reason"),
          }),
        ),
    ],
    [
      /^\/api\/notes$/,
      (_m, b) =>
        mutate((s) => domain.addNote(s, { text: need(b, "text"), requestId: opt(b, "requestId") })),
    ],
  ];

  const get: [RegExp, () => unknown][] = [
    [/^\/api\/health$/, () => ({ ok: true })],
    [/^\/api\/state$/, () => store.get()],
    [/^\/api\/handover$/, () => ({ summary: domain.handover(store.get()) })],
  ];

  return function handle(method: string, path: string, body?: unknown): RouteResult {
    const routes = method === "GET" ? get : method === "POST" ? post : [];
    try {
      for (const [re, fn] of routes) {
        const m = path.match(re);
        if (m) return { status: 200, body: fn(m, asBody(body)) };
      }
      return { status: 404, body: { error: "Not found." } };
    } catch (e) {
      if (e instanceof DomainError) return { status: e.status, body: { error: e.message } };
      throw e;
    }
  };
}
