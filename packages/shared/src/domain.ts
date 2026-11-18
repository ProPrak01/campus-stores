import { dueStatus } from "./due.js";
import type {
  AppState,
  DueOption,
  Asset,
  EquipmentRequest,
  HandoverLine,
  Loan,
  PhaseIndex,
} from "./types.js";

/** An error whose message is written for the desk clerk and is safe to show. */
export class DomainError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const fail = (status: number, message: string): never => {
  throw new DomainError(status, message);
};

// ---- lookups -------------------------------------------------------------

const findRequest = (s: AppState, id: string): EquipmentRequest =>
  s.requests.find((r) => r.id === id) ?? fail(404, `Request ${id} does not exist.`);

const findAsset = (s: AppState, id: string): Asset =>
  s.assets.find((a) => a.id === id) ?? fail(404, `Unit ${id} does not exist.`);

const findLoan = (s: AppState, num: number): Loan =>
  s.loans.find((l) => l.num === num) ?? fail(404, `Slip L-${num} does not exist.`);

export const openLoanFor = (s: AppState, assetId: string): Loan | undefined =>
  s.loans.find((l) => l.assetId === assetId && !l.returned);

const requirePerson = (s: AppState, name: string, role: string): void => {
  if (!s.people.includes(name)) fail(422, `${name || "That name"} is not on the desk list (${role}).`);
};

const typeOf = (s: AppState, assetId: string): string => findAsset(s, assetId).type;

const openCount = (s: AppState, requestId: string, type: string): number =>
  s.loans.filter((l) => l.requestId === requestId && !l.returned && typeOf(s, l.assetId) === type)
    .length;

/** Units of this line that were ever issued on this request, open or back. */
const handedOutCount = (s: AppState, requestId: string, type: string): number =>
  s.loans.filter((l) => l.requestId === requestId && typeOf(s, l.assetId) === type).length;

/** Return times are picked from the desk's list, so every due time can be compared with the clock. */
const resolveDue = (s: AppState, label: string): DueOption =>
  s.dueOptions.find((d) => d.label === label) ??
  fail(422, `"${label}" is not a return time the desk offers. Choose one from the list.`);

const nextNum = (s: AppState): number => Math.max(400, ...s.loans.map((l) => l.num)) + 1;

// ---- commands (each mutates the clone it is given) -----------------------

export function advancePhase(s: AppState): void {
  if (s.phase >= 2) fail(409, "This is the last shift. There is nothing later to move to.");
  s.phase = (s.phase + 1) as PhaseIndex;
}

export interface IssueInput {
  requestId: string;
  assetId: string;
  collectedBy: string;
  dueLabel?: string;
}

export function issue(s: AppState, input: IssueInput): Loan {
  const req = findRequest(s, input.requestId);
  const asset = findAsset(s, input.assetId);
  requirePerson(s, input.collectedBy, "collected by");

  if (asset.inRepair) fail(409, `${asset.id} is in repair and cannot leave the desk.`);
  const existing = openLoanFor(s, asset.id);
  if (existing)
    fail(409, `${asset.id} is already on loan to ${existing.holder} (slip L-${existing.num}).`);

  const line = req.lines.find((l) => l.type === asset.type);
  if (!line)
    fail(422, `${asset.type} is outside the approved request ${req.id}. Choose an approved unit.`);
  if (openCount(s, req.id, asset.type) >= line!.qty)
    fail(409, `The approved quantity of ${asset.type} (${line!.qty}) is already on loan for ${req.id}.`);

  if (!req.authorized.includes(input.collectedBy))
    fail(
      403,
      `${input.collectedBy} is not authorized to collect for ${req.id} (${req.club}). Add them as a collector first.`,
    );

  const due = input.dueLabel?.trim()
    ? resolveDue(s, input.dueLabel.trim())
    : { label: req.dueLabel, at: req.dueAt };
  const loan: Loan = {
    num: nextNum(s),
    requestId: req.id,
    assetId: asset.id,
    collectedBy: input.collectedBy,
    holder: input.collectedBy,
    dueLabel: due.label,
    dueAt: due.at,
    returned: false,
    history: [
      { kind: "issued", phase: s.phase, by: "Desk", text: `Issued to ${input.collectedBy}` },
    ],
  };
  s.loans.push(loan);
  return loan;
}

export interface IssueKitInput {
  requestId: string;
  collectedBy: string;
  dueLabel?: string;
  /** Optional unit choice per line type. Other units are picked automatically. */
  assetIds?: Record<string, string>;
}

/** Issues every unit still missing from the request. All or nothing. */
export function issueKit(s: AppState, input: IssueKitInput): Loan[] {
  const req = findRequest(s, input.requestId);
  const issued: Loan[] = [];
  for (const line of req.lines) {
    const missing = line.qty - handedOutCount(s, req.id, line.type);
    for (let i = 0; i < missing; i++) {
      const chosen = i === 0 ? input.assetIds?.[line.type] : undefined;
      const assetId =
        chosen ??
        s.assets.find((a) => a.type === line.type && !a.inRepair && !openLoanFor(s, a.id))?.id ??
        fail(409, `No ${line.type} is available on the shelf right now.`);
      issued.push(
        issue(s, {
          requestId: req.id,
          assetId,
          collectedBy: input.collectedBy,
          dueLabel: input.dueLabel,
        }),
      );
    }
  }
  if (!issued.length) fail(409, `Everything approved on ${req.id} has already been issued.`);
  return issued;
}

export function returnUnit(s: AppState, input: { assetId: string; returnedBy: string }): Loan {
  const asset = findAsset(s, input.assetId);
  requirePerson(s, input.returnedBy, "returned by");
  const loan = openLoanFor(s, asset.id);
  if (!loan)
    return fail(409, `${asset.id} has no open loan. Check the unit ID on the label.`);
  loan.returned = true;
  loan.returnedBy = input.returnedBy;
  loan.history.push({
    kind: "returned",
    phase: s.phase,
    by: input.returnedBy,
    text: `${asset.id} returned by ${input.returnedBy}`,
  });
  return loan;
}

export function passOn(s: AppState, num: number, input: { to: string; by: string }): Loan {
  const loan = findLoan(s, num);
  if (loan.returned) fail(409, `Slip L-${num} is already closed.`);
  requirePerson(s, input.to, "new holder");
  if (input.to === loan.holder) fail(409, `${input.to} already holds ${loan.assetId}.`);
  const from = loan.holder;
  loan.holder = input.to;
  loan.history.push({
    kind: "passed_on",
    phase: s.phase,
    by: input.by || "Desk",
    text: `${loan.assetId} passed from ${from} to ${input.to}`,
  });
  return loan;
}

export function extend(s: AppState, num: number, input: { dueLabel: string; by: string }): Loan {
  const loan = findLoan(s, num);
  if (loan.returned) fail(409, `Slip L-${num} is already closed.`);
  const due = resolveDue(s, input.dueLabel.trim());
  const old = loan.dueLabel;
  loan.dueLabel = due.label;
  loan.dueAt = due.at;
  loan.history.push({
    kind: "extended",
    phase: s.phase,
    by: input.by || "Desk",
    text: `Return time changed from ${old} to ${due.label}`,
  });
  return loan;
}

export function addCollector(
  s: AppState,
  requestId: string,
  input: { name: string; reason: string },
): void {
  const req = findRequest(s, requestId);
  requirePerson(s, input.name, "collector");
  const reason = input.reason.trim();
  if (!reason) fail(422, "Give a short reason for adding this collector.");
  if (req.authorized.includes(input.name)) fail(409, `${input.name} is already a collector on ${req.id}.`);
  req.authorized.push(input.name);
  (req.collectorLog ??= []).push({ name: input.name, reason, phase: s.phase });
}

export function addNote(s: AppState, input: { text: string; requestId?: string }): void {
  const text = input.text.trim();
  if (!text) fail(422, "Write something for the next shift.");
  if (text.length > 400) fail(422, "Keep the note under 400 characters.");
  if (input.requestId) findRequest(s, input.requestId);
  s.notes.push({
    id: Math.max(0, ...s.notes.map((n) => n.id)) + 1,
    phase: s.phase,
    text,
    requestId: input.requestId || undefined,
  });
}

// ---- queries -------------------------------------------------------------

export function handover(s: AppState): HandoverLine[] {
  const now = s.shifts[s.phase]!.at;
  return s.loans
    .filter((l) => !l.returned)
    .map((l) => {
      const asset = findAsset(s, l.assetId);
      const req = findRequest(s, l.requestId);
      const who = l.holder === l.collectedBy ? l.holder : `${l.holder} (collected by ${l.collectedBy})`;
      return {
        loanNum: l.num,
        requestId: req.id,
        club: req.club,
        assetId: asset.id,
        unit: `${asset.type} · ${asset.model}`,
        holder: l.holder,
        dueLabel: l.dueLabel,
        dueStatus: dueStatus(now, l.dueAt),
        nextStep: `Expect ${asset.id} (${asset.model}) back from ${who} by ${l.dueLabel}${dueStatus(now, l.dueAt) === "overdue" ? " (overdue)" : ""}. Close slip L-${l.num} only for that unit.`,
      };
    });
}
