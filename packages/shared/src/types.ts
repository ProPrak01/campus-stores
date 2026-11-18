/** Domain types shared by the API and the web app. This file is the contract. */

export type PhaseIndex = 0 | 1 | 2;

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
  lines: RequestLine[];
  authorized: string[];
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

export interface Shift {
  time: string;
  title: string;
  text: string;
}

/** Everything the UI needs to render a screen, returned by GET /api/state. */
export interface AppState {
  phase: PhaseIndex;
  shifts: Shift[];
  people: string[];
  requests: EquipmentRequest[];
  assets: Asset[];
  loans: Loan[];
  notes: HandoverNote[];
}

export interface ApiError {
  error: string;
}
