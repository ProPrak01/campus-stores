import { test } from "node:test";
import assert from "node:assert/strict";
import { seedState } from "./seed.js";
import { dueStatus } from "./due.js";
import type { AppState } from "./types.js";
import * as d from "./domain.js";

/** Assert that fn throws a DomainError with this status and a message matching re. */
const rejects = (fn: () => unknown, status: number, re: RegExp) =>
  assert.throws(fn, (e: unknown) => {
    assert.ok(e instanceof d.DomainError, "expected a DomainError");
    assert.equal(e.status, status);
    assert.match(e.message, re);
    return true;
  });

const fresh = (): AppState => seedState();
const kit = (s: AppState) => d.issueKit(s, { requestId: "RQ-214", collectedBy: "Kabir Sen" });

test("issue kit hands out one on-shelf unit per line, never the one in repair", () => {
  const s = fresh();
  const loans = kit(s);
  assert.deepEqual(loans.map((l) => l.assetId), ["PR-04", "SP-02", "AD-12"]);
  assert.ok(loans.every((l) => l.holder === "Kabir Sen" && l.dueLabel === "Fri 8 pm"));
  assert.ok(!loans.some((l) => l.assetId === "PR-06"));
});

test("issue kit honors a chosen unit", () => {
  const s = fresh();
  const loans = d.issueKit(s, {
    requestId: "RQ-214",
    collectedBy: "Kabir Sen",
    assetIds: { "USB-C → HDMI adapter": "AD-15" },
  });
  assert.equal(loans.find((l) => l.assetId.startsWith("AD"))?.assetId, "AD-15");
});

test("issue kit is all or nothing on a copy of the state", () => {
  const s = fresh();
  s.assets.find((a) => a.id === "SP-02")!.inRepair = true;
  s.assets.find((a) => a.id === "SP-05")!.inRepair = true;
  const draft = structuredClone(s);
  rejects(() => kit(draft), 409, /No Portable speaker is available/);
  assert.equal(s.loans.length, 1, "the original state is untouched");
});

test("issue kit twice is refused", () => {
  const s = fresh();
  kit(s);
  rejects(() => kit(s), 409, /already been issued/);
});

test("issue kit does not re-issue a line that was returned", () => {
  const s = fresh();
  kit(s);
  d.returnUnit(s, { assetId: "PR-04", returnedBy: "Kabir Sen" });
  rejects(() => kit(s), 409, /already been issued/);
});

test("collector must be authorized on the request", () => {
  rejects(
    () => d.issueKit(fresh(), { requestId: "RQ-214", collectedBy: "Leela Das" }),
    403,
    /Leela Das is not authorized to collect for RQ-214/,
  );
});

test("adding a collector needs a reason and is logged", () => {
  const s = fresh();
  rejects(() => d.addCollector(s, "RQ-214", { name: "Leela Das", reason: "  " }), 422, /reason/);
  d.addCollector(s, "RQ-214", { name: "Leela Das", reason: "Kabir asked her to return it" });
  const req = s.requests.find((r) => r.id === "RQ-214")!;
  assert.ok(req.authorized.includes("Leela Das"));
  assert.equal(req.collectorLog?.[0]?.reason, "Kabir asked her to return it");
  rejects(() => d.addCollector(s, "RQ-214", { name: "Leela Das", reason: "again" }), 409, /already/);
});

test("single issue guardrails: repair, wrong type, quantity, already on loan", () => {
  const s = fresh();
  const base = { requestId: "RQ-214", collectedBy: "Kabir Sen" };
  rejects(() => d.issue(s, { ...base, assetId: "PR-06" }), 409, /in repair/);
  rejects(() => d.issue(s, { ...base, assetId: "CA-03" }), 422, /outside the approved request/);
  rejects(() => d.issue(s, { ...base, assetId: "MI-09" }), 409, /already on loan to Tara Shah/);
  d.issue(s, { ...base, assetId: "AD-12" });
  rejects(() => d.issue(s, { ...base, assetId: "AD-15" }), 409, /approved quantity/);
});

test("return times must come from the desk's list", () => {
  const s = fresh();
  rejects(
    () => d.issue(s, { requestId: "RQ-214", assetId: "AD-12", collectedBy: "Kabir Sen", dueLabel: "whenever" }),
    422,
    /not a return time the desk offers/,
  );
});

test("return is matched by the unit in hand, not the slip", () => {
  const s = fresh();
  kit(s);
  rejects(() => d.returnUnit(s, { assetId: "AD-15", returnedBy: "Leela Das" }), 409, /AD-15 has no open loan/);
  const loan = d.returnUnit(s, { assetId: "AD-12", returnedBy: "Leela Das" });
  assert.equal(loan.returned, true);
  assert.equal(loan.returnedBy, "Leela Das");
  assert.equal(loan.history.at(-1)?.kind, "returned");
});

test("pass-on changes the holder, keeps the collector, and records history", () => {
  const s = fresh();
  const adapter = kit(s).find((l) => l.assetId === "AD-12")!;
  d.passOn(s, adapter.num, { to: "Leela Das", by: "Kabir Sen" });
  assert.equal(adapter.holder, "Leela Das");
  assert.equal(adapter.collectedBy, "Kabir Sen");
  assert.match(adapter.history.at(-1)!.text, /from Kabir Sen to Leela Das/);
  rejects(() => d.passOn(s, adapter.num, { to: "Leela Das", by: "" }), 409, /already holds/);
});

test("overdue is measured against the desk clock, and extending clears it", () => {
  const s = fresh();
  const adapter = kit(s).find((l) => l.assetId === "AD-12")!;
  const now = () => s.shifts[s.phase]!.at;
  assert.equal(dueStatus(now(), adapter.dueAt), "ok");
  d.advancePhase(s);
  assert.equal(dueStatus(now(), adapter.dueAt), "due_soon");
  d.advancePhase(s);
  assert.equal(dueStatus(now(), adapter.dueAt), "overdue");
  d.extend(s, adapter.num, { dueLabel: "Sat 10 am", by: "Desk" });
  assert.equal(dueStatus(now(), adapter.dueAt), "due_soon");
  rejects(() => d.advancePhase(s), 409, /last shift/);
});

test("handover names the holder, the unit, and the slip to close", () => {
  const s = fresh();
  const adapter = kit(s).find((l) => l.assetId === "AD-12")!;
  d.advancePhase(s);
  for (const id of ["PR-04", "SP-02"]) d.returnUnit(s, { assetId: id, returnedBy: "Kabir Sen" });
  d.passOn(s, adapter.num, { to: "Leela Das", by: "Kabir Sen" });
  const line = d.handover(s).find((h) => h.assetId === "AD-12")!;
  assert.equal(line.holder, "Leela Das");
  assert.match(line.nextStep, /AD-12 \(Belkin AVC002\).*Leela Das \(collected by Kabir Sen\).*slip L-\d+ only/);
  d.advancePhase(s);
  assert.equal(d.handover(s).find((h) => h.assetId === "AD-12")!.dueStatus, "overdue");
});

test("notes are trimmed, capped and can link to a request", () => {
  const s = fresh();
  rejects(() => d.addNote(s, { text: "   " }), 422, /Write something/);
  rejects(() => d.addNote(s, { text: "x".repeat(401) }), 422, /400/);
  rejects(() => d.addNote(s, { text: "hi", requestId: "RQ-999" }), 404, /does not exist/);
  d.addNote(s, { text: "  Adapter with Leela  ", requestId: "RQ-214" });
  assert.deepEqual(s.notes[0], { id: 1, phase: 0, text: "Adapter with Leela", requestId: "RQ-214" });
});
