import type { AppState, HandoverLine } from "@campus/shared";

/** Shared fetch wrapper. Non-2xx responses throw with the server's error string. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await res.json();
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? res.statusText,
    );
  }
  return body as T;
}

export interface HandoverSummary {
  summary: HandoverLine[];
}

export const api = {
  getState: () => request<AppState>("/api/state"),
  reset: () => request<AppState>("/api/reset", { method: "POST" }),

  advancePhase: () =>
    request<AppState>("/api/phase/advance", { method: "POST" }),

  issue: (body: { requestId: string; assetId: string; collectedBy: string; dueLabel?: string }) =>
    request<AppState>("/api/issue", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  issueKit: (body: { requestId: string; collectedBy: string; dueLabel?: string; assetIds?: Record<string, string> }) =>
    request<AppState>("/api/issue-kit", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  passOn: (loanNum: number, body: { to: string; by: string }) =>
    request<AppState>(`/api/loans/${loanNum}/pass-on`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  extend: (loanNum: number, body: { dueLabel: string; by: string }) =>
    request<AppState>(`/api/loans/${loanNum}/extend`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  returnUnit: (body: { assetId: string; returnedBy: string }) =>
    request<AppState>("/api/return", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addCollector: (requestId: string, body: { name: string; reason: string }) =>
    request<AppState>(`/api/requests/${requestId}/collectors`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addNote: (body: { text: string; requestId?: string }) =>
    request<AppState>("/api/notes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getHandover: () => request<HandoverSummary>("/api/handover"),
};
