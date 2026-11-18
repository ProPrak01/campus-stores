# Campus Stores: task checklist

## 0. What this software is

A static, no-build, vanilla JS single-page app (`index.html`, `app.js`, `styles.css`, inline Lucide icons). It simulates an equipment-lending desk (loan counter) at a campus media store. State lives in one object `s` and is saved to `localStorage` (`campus-stores.shift.v1`). Rendering is string-built HTML re-painted on every action.

Screens: **Requests** (3 approved club forms), **Inventory** (8 physical units, status filter), **Loan register** (issue slips, return), **Desk book** (club messages and handover notes). A "Desk time" control moves through three phases: Fri 3:45 pm pickup, Fri 7:30 pm partial return, Sat 9:00 am morning handover.

The README is a hiring exercise: "Would you keep this product?" Deliverables (from the in-app brief):
1. One moment the product handles well, with evidence from the shift.
2. One moment you would change, with evidence from the shift.
3. A sketch or prototype of the change, walked through the same job.
4. What you would keep, and one observation at a real counter that would show whether it helped.
5. README in the fork pointing reviewers to the work and explaining the decision.

## 1. Findings from the shift (the evidence)

Handles well:
- Issuing is guarded: it blocks units in repair (PR-06), units already on loan, equipment outside the approved request, and a second unit of a type whose approved quantity is already out.
- Per-unit slips mean two identical adapters (AD-12, AD-15) are tracked separately.
- State persists and is validated on restore.

Breaks or hurts (candidates for "the one thing I would change"):
- **No view of a request as a job.** To issue Film Society's kit, the clerk reads the Requests tab, then makes 3 separate slips, re-picking request, collector and due date each time. Nothing shows "3 approved, 2 issued, 1 missing".
- **Partial return is invisible.** At 7:30 pm the register lists loose slips. Nothing says "RQ-214: projector and speaker back, adapter still out with Leela, due Sat 9 am".
- **Custody is wrong after a handoff.** The adapter slip says "Kabir Sen", but Leela holds it. The only record is a Desk book message, which is unlinked to the slip.
- **Collector authority is unchecked.** Isha filed the request; Kabir collects. The permission lives in a Desk book note on another tab. Leela is not on the request at all.
- **Morning return is guesswork.** Two identical adapters exist. "Record return" does not ask which physical unit was handed back, so the wrong slip can be closed.
- **Due dates are free-text strings** ("Fri 8 pm"). The adapter is late relative to the request's Fri 8 pm, but nothing flags overdue or records the agreed extension.
- **Handover notes are free text, optional, and unpinned.** The time control advances without prompting for a handover. The next shift has to hunt through the Desk book.
- **Inventory does not say who has a unit.**

Small defects to fix on the way:
- `esc()` is not applied to request fields and the unit/request text in `requestPage` and `head()` (safe today because the data is static, but a trap if it becomes editable).
- Several `innerHTML` builders, so forms lose input on any repaint (typing in a note, then changing the filter, clears it).
- `advance` ignores the "Browser storage unavailable" path message after `paint()`.
- Time is phase-based, not a real clock, so overdue cannot be computed.
- No keyboard focus management after repaint (focus is lost on every action).

## 2. Chosen direction

**Make the Request the unit of work.** Add a "Kit view" for each approved request showing every approved line (type, quantity), which units are issued, returned or outstanding, who holds them, and when each is due. Issue, return and handover happen from that view. This fixes the top four findings with one idea and keeps the existing per-unit slips underneath.

## 3. Task checklist

### A. Setup and baseline
- [ ] Run the full shift once as a clerk and write down each friction point with the exact click or decision (this is the evidence for the write-up).
- [ ] Capture "before" screenshots of Requests, Loan register and Desk book at each phase.
- [ ] Create a branch `kit-view` and keep commits small and readable (reviewers look at the final commit).

### B. Data model (`app.js`)
- [ ] Add `qty` to request lines (type + quantity) instead of a flat `items` array of type names.
- [ ] Add `authorized` collectors per request (Isha, Kabir). Allow adding a collector with a reason, recorded in the history.
- [ ] Replace string due dates with sortable values (`dueAt`, plus a display label) tied to the phase clock.
- [ ] Add `holder` to a loan (separate from `who` collected) and a `custody` history list (issued to X, passed to Y, returned by Z).
- [ ] Add `returnedBy`, `returnedAt` and optional `condition` to a loan.
- [ ] Bump `version` to 2 and write a migration or reset for old saved state; keep `restore()` validation strict.

### C. Kit view (the main change)
- [ ] Request detail becomes a checklist: one row per approved line and quantity, with state Issued / Returned / Outstanding / Not yet issued.
- [ ] Summary banner per request: "2 of 3 returned. Adapter outstanding with Leela Das, due Sat 9 am".
- [ ] "Issue kit" action: pre-fills request, collector and due date, offers the suggested unit per line (skips repair, prefers on-shelf), and issues all lines in one confirm. The clerk can still swap a unit.
- [ ] Per-line "Issue" for partial pickups.
- [ ] Show the request note next to the issue action (the "USB-C-only laptop" note decides which adapter to hand over).
- [ ] Request list shows a status chip per request (Not started, Out, Partly returned, Complete).

### D. Collector and custody
- [ ] Block issue to someone not authorized on the request, with an inline "Add as collector" action that asks for a short reason and is recorded.
- [ ] "Passed to someone else" action on a loan (for Leela holding the adapter), keeping the original collector in the history.
- [ ] Show the holder on slips, in Inventory ("On loan · Leela Das"), and in the kit view.

### E. Returns
- [ ] Return from the kit view or register with a unit-confirm step: "Which unit is in your hand?" (lists the units on loan for that type, so the AD-12 vs AD-15 mix-up is caught).
- [ ] Support returning a unit that differs from the slip: flag it and re-point the slip rather than closing the wrong one.
- [ ] Record who returned it and an optional condition note.
- [ ] Mark a request Complete automatically when all lines are back, and show a short "all returned" confirmation.

### F. Time and overdue
- [ ] Give each phase a real timestamp and compute overdue from it.
- [ ] Overdue and due-soon chips on loans and requests.
- [ ] "Agree a new return time" on a loan, recorded in history (covers the Sat 9 am adapter).

### G. Handover
- [ ] Generate a handover summary automatically from open loans (what is out, with whom, due when, what to do next); the clerk adds free text on top.
- [ ] Pin the latest handover at the top of the Desk book and on the shift banner for the next phase.
- [ ] Prompt (not block) when advancing time with open loans and no handover note.
- [ ] Link notes to a request or loan so they show up in the kit view.

### H. Quality and polish
- [ ] Apply `esc()` consistently in every template; remove the string-concatenated HTML where it is easy to do.
- [ ] Preserve form input, scroll position and focus across repaints.
- [ ] Keyboard: logical tab order, visible focus, Enter/Escape in the issue flow.
- [ ] `aria-live` messages for issue, return and errors; check color contrast on the new chips.
- [ ] Mobile layout check at 375 px and 768 px.
- [ ] Empty and error states (no available unit of a type, all units in repair).
- [ ] Optional: undo for the last issue or return.
- [ ] Optional: counter-friendly search box (type a unit ID or name to jump to its slip).
- [ ] Verify no console errors, offline use from `file://`, and that "Restart sample shift" resets everything.

### I. Write-up (the part that is graded)
- [ ] Moment handled well: the issue guardrails (e.g. blocked PR-06 in repair, or a second adapter beyond the approved quantity).
- [ ] Moment I would change: the partial return and handoff at 7:30 pm and 9:00 am, with the specific clicks.
- [ ] Prototype walkthrough: the same Film Society job done start to finish in the kit view.
- [ ] What I would keep from the original (per-unit slips, guardrails, desk book as the message channel).
- [ ] One real-counter observation: for example, "Count how often a clerk opens the Desk book or the Requests tab while closing a return, and how many returns are recorded against the wrong unit, across one week of shifts."
- [ ] Update `README.md` with a link to the work, screenshots and the decision explanation.
- [ ] Final check: commit pushed to `myfork`, copy the commit URL, submit the Google Form with roll number and email.

## 4. Suggested order

1. A (baseline) then I's evidence notes.
2. B + C (kit view). This is the core and the demo.
3. E + D (returns, custody), because they fix the 7:30 pm and 9:00 am moments.
4. G (handover), then F (time).
5. H (polish), then the rest of I.

## 5. Working habit

After every checkpoint (each checked item or small group of items): run a quick check, `git add` the specific files, commit with a clear message, and `git push myfork main`. No checkpoint is done until it is pushed.

## 6. Scope guardrails

- Stay with no build tools and no dependencies. The app must still open from `index.html`.
- Do not rewrite everything. Keep the four screens, change the model and the request view.
- Finish B to E well before F to H. A complete core beats many half features.
