import type { AppState } from "@campus/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error ?? res.statusText);
  return body as T;
}

export const api = {
  getState: () => request<AppState>("/api/state"),
  reset: () => request<AppState>("/api/reset", { method: "POST" }),
};
