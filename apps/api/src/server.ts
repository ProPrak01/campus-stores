import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import type { AppState } from "@campus/shared";
import * as domain from "./domain.js";
import { DomainError } from "./domain.js";
import { getState, resetState, setState } from "./store.js";

const app = Fastify({ logger: { level: "info" } });

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof DomainError) return reply.status(err.status).send({ error: err.message });
  const status = (err as { statusCode?: number }).statusCode;
  if (status && status < 500) return reply.status(status).send({ error: "That request was not understood." });
  app.log.error(err);
  return reply.status(500).send({ error: "Something went wrong on the server." });
});

// ---- body helpers ---------------------------------------------------------

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
const num = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new DomainError(422, "Slip number must be a whole number.");
  return n;
};

/** Run a command on a copy of the state. If it throws, nothing is saved. */
function mutate(fn: (draft: AppState) => void): AppState {
  const draft = structuredClone(getState());
  fn(draft);
  return setState(draft);
}

// ---- routes ---------------------------------------------------------------

app.get("/api/health", async () => ({ ok: true }));
app.get("/api/state", async () => getState());
app.post("/api/reset", async () => resetState());

app.post("/api/phase/advance", async () => mutate((s) => domain.advancePhase(s)));

app.post("/api/issue", async (req) => {
  const b = asBody(req.body);
  return mutate((s) =>
    domain.issue(s, {
      requestId: need(b, "requestId"),
      assetId: need(b, "assetId"),
      collectedBy: need(b, "collectedBy"),
      dueLabel: opt(b, "dueLabel"),
    }),
  );
});

app.post("/api/issue-kit", async (req) => {
  const b = asBody(req.body);
  const picks = asBody(b.assetIds);
  const assetIds = Object.fromEntries(
    Object.entries(picks).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1]),
  );
  return mutate((s) =>
    domain.issueKit(s, {
      requestId: need(b, "requestId"),
      collectedBy: need(b, "collectedBy"),
      dueLabel: opt(b, "dueLabel"),
      assetIds,
    }),
  );
});

app.post("/api/return", async (req) => {
  const b = asBody(req.body);
  return mutate((s) =>
    domain.returnUnit(s, { assetId: need(b, "assetId"), returnedBy: need(b, "returnedBy") }),
  );
});

app.post<{ Params: { num: string } }>("/api/loans/:num/pass-on", async (req) => {
  const b = asBody(req.body);
  return mutate((s) =>
    domain.passOn(s, num(req.params.num), { to: need(b, "to"), by: opt(b, "by") ?? "" }),
  );
});

app.post<{ Params: { num: string } }>("/api/loans/:num/extend", async (req) => {
  const b = asBody(req.body);
  return mutate((s) =>
    domain.extend(s, num(req.params.num), { dueLabel: need(b, "dueLabel"), by: opt(b, "by") ?? "" }),
  );
});

app.post<{ Params: { id: string } }>("/api/requests/:id/collectors", async (req) => {
  const b = asBody(req.body);
  return mutate((s) =>
    domain.addCollector(s, req.params.id, { name: need(b, "name"), reason: need(b, "reason") }),
  );
});

app.post("/api/notes", async (req) => {
  const b = asBody(req.body);
  return mutate((s) => domain.addNote(s, { text: need(b, "text"), requestId: opt(b, "requestId") }));
});

app.get("/api/handover", async () => ({ summary: domain.handover(getState()) }));

// Serve the built web app when it exists (npm start). In dev, Vite serves it.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (existsSync(dist)) await app.register(fastifyStatic, { root: dist });

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "127.0.0.1" });
