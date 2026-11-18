import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { getState, resetState } from "./store.js";

const app = Fastify({ logger: { level: "info" } });

app.get("/api/health", async () => ({ ok: true }));
app.get("/api/state", async () => getState());
app.post("/api/reset", async () => resetState());

// Serve the built web app when it exists (npm start). In dev, Vite serves it.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (existsSync(dist)) await app.register(fastifyStatic, { root: dist });

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "127.0.0.1" });
