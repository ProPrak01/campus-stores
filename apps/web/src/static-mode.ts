/**
 * Static build only (VITE_STATIC=1, used for GitHub Pages).
 * Answers /api/* calls in the browser with the same router the Fastify server uses,
 * and keeps the shift in localStorage. Owned by the backend agent.
 */
import { createRouter, seedState, type AppState } from "@campus/shared";

const KEY = "campus-stores.static.v2";

function load(): AppState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as AppState | null;
    if (saved && Array.isArray(saved.dueOptions) && Array.isArray(saved.messages)) return saved;
  } catch {
    // fall through to a fresh shift
  }
  return seedState();
}

let state = load();
const handle = createRouter({
  get: () => state,
  set: (next) => {
    state = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable: the shift lasts for this visit
    }
    return state;
  },
});

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
  const at = url.pathname.indexOf("/api/");
  if (at === -1) return realFetch(input, init);
  const method = (init?.method ?? "GET").toUpperCase();
  const raw = typeof init?.body === "string" && init.body.trim() ? init.body : "{}";
  const { status, body } = handle(method, url.pathname.slice(at), JSON.parse(raw));
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
};
