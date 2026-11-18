import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { createRouter } from "@campus/shared";
import { getState, setState } from "./store.js";

const app = Fastify({ logger: { level: "info" } });
const handle = createRouter({ get: getState, set: setState });

// Buttons like "advance" and "restart" POST with a JSON content type and no body. Accept that as {}.
app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
  const text = String(body).trim();
  if (!text) return done(null, {});
  try {
    done(null, JSON.parse(text));
  } catch {
    done(Object.assign(new Error("Invalid JSON"), { statusCode: 400 }), undefined);
  }
});

app.setErrorHandler((err, _req, reply) => {
  const status = (err as { statusCode?: number }).statusCode;
  if (status && status < 500) return reply.status(status).send({ error: "That request was not understood." });
  app.log.error(err);
  return reply.status(500).send({ error: "Something went wrong on the server." });
});

// Every /api route lives in packages/shared/src/router.ts, shared with the static build.
app.route({
  method: ["GET", "POST"],
  url: "/api/*",
  handler: async (req, reply) => {
    const { status, body } = handle(req.method, req.url.split("?")[0]!, req.body);
    return reply.status(status).send(body);
  },
});

// Serve the built web app when it exists (npm start). In dev, Vite serves it.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (existsSync(dist)) await app.register(fastifyStatic, { root: dist });

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "127.0.0.1" });
