/** Domain types shared by the API and the web app. This file is the contract. */

export type PhaseIndex = 0 | 1 | 2;

/** A return time the desk can choose. `at` is a local ISO time in the sample week (no timezone). */
export interface DueOption {
  label: string;
  at: string;
}

export type DueStatus = "ok" | "due_soon" | "overdue";

export interface RequestLine {
  type: string;
  qty: number;
}

export interface EquipmentRequest {
  id: string;
  club: string;
  event: string;
  owner: string;
  dueLabel: string;
  dueAt: string;
  lines: RequestLine[];
  authorized: string[];
  /** Why each extra collector was added after the request was filed. */
  collectorLog?: { name: string; reason: string; phase: PhaseIndex }[];
  note: string;
}

export interface Asset {
  id: string;
  type: string;
  model: string;
  bin: string;
  inRepair?: boolean;
}

export type LoanEventKind = "issued" | "passed_on" | "extended" | "returned";

export interface LoanEvent {
  kind: LoanEventKind;
  phase: PhaseIndex;
  by: string;
  text: string;
}

export interface Loan {
  num: number;
  requestId: string;
  assetId: string;
  collectedBy: string;
  holder: string;
  dueLabel: string;
  dueAt: string;
  returned: boolean;
  returnedBy?: string;
  history: LoanEvent[];
}

export interface HandoverNote {
  id: number;
  phase: PhaseIndex;
  text: string;
  requestId?: string;
}

/** A message from a club, shown in the Desk book from the phase it arrives in. */
export interface ClubMessage {
  phase: PhaseIndex;
  time: string;
  author: string;
  text: string;
}

export interface Shift {
  time: string;
  /** The desk clock at this phase, local ISO time. Overdue is measured against it. */
  at: string;
  title: string;
  text: string;
}

/** Everything the UI needs to render a screen, returned by GET /api/state. */
export interface AppState {
  phase: PhaseIndex;
  shifts: Shift[];
  people: string[];
  dueOptions: DueOption[];
  requests: EquipmentRequest[];
  assets: Asset[];
  loans: Loan[];
  notes: HandoverNote[];
  messages: ClubMessage[];
}

/** One open loan, described for the next shift. Returned by GET /api/handover. */
export interface HandoverLine {
  loanNum: number;
  requestId: string;
  club: string;
  assetId: string;
  unit: string;
  holder: string;
  dueLabel: string;
  dueStatus: DueStatus;
  nextStep: string;
}

export interface ApiError {
  error: string;
}
