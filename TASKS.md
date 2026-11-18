# Campus Stores: task checklist (final)

## 0. What this software is

A static, no-build, vanilla JS single-page app: `index.html` (layout, brief, inline Lucide icons), `app.js` (sample data, state, rendering, events), `styles.css` (light/dark theme, container-query layouts for narrow screens, 44 px touch targets on coarse pointers). State is one object `s`, saved to `localStorage` key `campus-stores.shift.v1` and validated on restore. Every action re-renders the page with `innerHTML`.

It simulates the loan counter of a campus media equipment desk. Screens:
- **Requests:** 3 approved club forms (Film Society RQ-214, Debate Union RQ-209, Photo Circle RQ-217).
- **Inventory:** 8 physical units with a status filter (On shelf / On loan / In repair).
- **Loan register:** one issue slip per physical unit; "Record return" closes a slip.
- **Desk book:** fixed club messages plus free-text handover notes.

A time control moves through three phases: Fri 3:45 pm pickup, Fri 7:30 pm partial return, Sat 9:00 am morning shift.

The repo is a hiring exercise. The in-app brief asks: "Would you keep this product?" Deliverables:
1. One moment the product handles well, with a specific action from the shift as evidence.
2. One moment you would change, with evidence.
3. A sketch or prototype of the change, walked through the same job.
4. What you would keep, and one observation at a real counter that would show whether the change helped.
5. A README in the fork that points reviewers to the work and explains the decision.

## 1. Verified findings

Each item below was checked against `app.js`.

### Handles well
- **Issue guardrails.** Saving a slip is blocked for a unit in repair (PR-06 never appears in the unit list), a unit already on loan, a type outside the approved request ("This equipment type is outside the approved request"), and a second unit of a type already out on the same request ("The approved quantity of this equipment type is already on loan").
- **One slip per physical unit.** The two identical adapters (AD-12, AD-15) are tracked separately.
- **Errors keep the form.** A blocked save writes to the status bar without repainting, so the clerk's selections survive.
- **Saved state is validated** before it is restored.

### Problems (evidence for "the moment I would change")
- **The request is not a unit of work.** Issuing the Film Society kit means 3 separate slips. Each slip re-asks for request, collector and due date. Nothing shows "3 approved, 2 issued, 1 not yet issued".
- **Authorization is not checked.** "Collected by" accepts any of the 5 people on every request. Isha filed RQ-214; her permission for Kabir lives only in a Desk book message on another tab. Leela is on no request.
- **Due date is not tied to the request.** The clerk can pick any of 4 times. RQ-214 says "Fri 8 pm", but nothing stops "Sat noon" or prefills the request's time.
- **Custody goes stale.** At 7:30 pm the adapter slip still says Kabir, but Leela holds it. The only record is a Desk book message that is not linked to the slip.
- **The partial return is invisible.** The register shows loose slips. Nothing says "RQ-214: 2 of 3 back; adapter out with Leela, promised Sat 9 am".
- **Returns don't confirm the unit.** "Record return" closes whichever slip you click. With two identical adapters, the morning clerk can close the wrong slip, and the app has no step that asks for the unit ID on the label.
- **There is no overdue state.** Due dates are display strings. At 9 am the adapter is past RQ-214's Fri 8 pm return, and nothing flags it or records the agreed extension.
- **Handover is optional free text.** Advancing time never prompts for a note, and notes are not linked to a request or a slip. The morning clerk has to rebuild the state from the Desk book and the register.
- **Inventory doesn't show who holds a unit**, only "On loan".
- **The time control has no guard.** Slips can be returned at 3:45 pm before anything happened, and time can advance with nothing issued. This is acceptable for a sample, but worth knowing.

### Minor code issues (fix while working in the area, not headline findings)
- `esc()` is skipped for request fields in `requestPage()` and for titles in `head()`. This is safe today only because the data is static.
- Every action repaints with `innerHTML`, so keyboard focus jumps back to the top after each click.
- `restore()` does not validate `filter`, `onlyOpen` or `editing`.
- Error messages from a blocked save are not announced as errors (they reuse the polite status line).

### Checked and dropped
- ~~"Storage-unavailable message is lost after advance"~~: `commit()` handles it for every action.
- ~~"Forms lose input on repaint"~~: the only repaint triggers are clicks and the Inventory filter, which isn't on the same screen as a form. Errors don't repaint.
- ~~"Mobile layout is missing"~~: container queries at 650 px and 420 px already exist, along with dark mode.

## 2. Decision

**Make the approved request the unit of work.** Each request gets a kit view that shows every approved line, which unit went out, who holds it now, when it is due, and whether it came back. Issue, return and handover start from that view. Per-unit slips and the existing guardrails stay underneath.

This single change covers the pickup (one confirm instead of three forms), the 7:30 pm partial return (outstanding line visible), and the 9:00 am handover (who has what, and which unit to expect).

## 3. Checklist

Every checkpoint ends with a commit and a push (see section 5).

### A. Baseline and evidence
- [ ] A1. Play the full shift as written. Log each friction point as "phase · screen · exact click · what went wrong" in `docs/evidence.md`.
- [ ] A2. Capture "before" screenshots at each phase to `docs/before/`.

### B. Data model (`app.js`)
- [x] B1. Request lines get `{ type, qty }`. Requests get `authorized` collectors (RQ-214: Isha Rao, Kabir Sen).
- [x] B2. Each phase gets a sortable timestamp. Due dates become `dueAt` plus a display label.
- [x] B3. A loan gets `holder` (separate from the collector) and a `history` list of events (issued, passed on, extended, returned).
- [x] B4. A loan gets `returnedBy` and `returnedAt`.
- [ ] B5. Bump state `version` to 2. Old saves fall back to a fresh shift with a notice. `restore()` validates every field.

### C. Kit view (core change)
- [ ] C1. The request detail becomes a checklist with one row per approved line: Not issued / Out (unit, holder, due) / Returned.
- [ ] C2. A summary line per request, for example "2 of 3 returned · USB-C → HDMI adapter (AD-12) with Leela Das, promised Sat 9 am".
- [ ] C3. "Issue kit": collector and due date default from the request, a suggested on-shelf unit per line (never one in repair), the clerk can swap units, one confirm creates all slips.
- [ ] C4. Per-line issue for partial pickups.
- [ ] C5. Show the request note next to the issue action (the "USB-C-only laptop" note is why the adapter matters).
- [ ] C6. Status chip on each row of the request list: Not started / Out / Partly returned / Complete.

### D. Collector and custody
- [ ] D1. Issue is limited to authorized collectors. "Add collector" asks who and why, and records the reason on the request.
- [ ] D2. "Passed to someone else" on an open loan (Kabir → Leela) updates `holder` and adds to history.
- [ ] D3. The holder appears on slips, in the kit view and in Inventory ("On loan · Leela Das").

### E. Returns
- [ ] E1. Return asks "Which unit is in your hand?" and lists the open units of that type with their IDs. If the unit doesn't match the clicked slip, the app shows that slip instead of closing the wrong one.
- [ ] E2. Record who brought it back.
- [ ] E3. The request turns Complete when every line is back, with a confirmation message.

### F. Handover
- [ ] F1. A generated handover summary from open loans (what, unit, holder, due, next step). The clerk can add free text on top.
- [ ] F2. The latest handover is pinned in the Desk book and on the shift banner of the next phase.
- [ ] F3. Advancing time with open loans and no handover shows a prompt. It does not block.
- [ ] F4. Notes can link to a request; linked notes show in the kit view.

### G. Due and overdue (phase-based)
- [ ] G1. Overdue and due-soon chips computed from the phase timestamp, on loans and requests.
- [ ] G2. "Agree a new return time" on a loan, recorded in history (Leela's Sat 9 am promise).

### H. Quality
- [ ] H1. `esc()` on every interpolated value.
- [ ] H2. Restore focus to the triggering control (or the new section heading) after each repaint.
- [ ] H3. Errors announced with `role="alert"`. New chips meet contrast in light and dark modes.
- [ ] H4. Check at 375 px and desktop, light and dark. No console errors. Works from `file://`. "Restart sample shift" resets everything.

### I. Write-up (graded)
- [ ] I1. Moment handled well: the guardrails, for example trying to issue a second adapter on RQ-214 or looking for PR-06.
- [ ] I2. Moment to change: 7:30 pm and 9:00 am, with the exact clicks from `docs/evidence.md`.
- [ ] I3. Walkthrough: the same Film Society job done start to finish with the kit view, with "after" screenshots.
- [ ] I4. What I kept: per-unit slips, issue guardrails, the Desk book as the club message channel, no-build offline app.
- [ ] I5. Counter observation: over a week of real shifts, count returns closed against the wrong unit and how often the clerk leaves the return screen to check the Desk book or Requests. Compare before and after.
- [ ] I6. Update `README.md`: link to the work, the decision, how to see it (which phase and which buttons).
- [ ] I7. Push, copy the final commit URL `https://github.com/ProPrak01/campus-stores/commit/<sha>`, submit the Google Form (roll number and email only in the form).

### Stretch (only after A to I are done)
- [ ] S1. Undo for the last issue or return.
- [ ] S2. Search by unit ID or person.
- [ ] S3. Printable handover card.

### Progress log

- Backend done and pushed: issue, issue-kit, return by unit, pass-on, extend, collectors, notes, handover summary, phase advance, due and overdue status from the desk clock (`dueStatus` in `packages/shared`), return times chosen from a fixed list. See `docs/API.md`.
- Backend gaps: B5 uses a field-presence check on the saved file instead of a version number.
- Frontend (C, E, F, G, H screens) is owned by the other agent. Items stay unticked until the UI is playable.

## 4. Order

A → B → C → E → D → F → G → H → I. Stretch last.

C and E carry the argument. If time runs short, cut G and the stretch items, never the write-up.

## 5. Working habit

After every checkpoint (one item, or a small group in the same area):
1. Check: `node --check app.js` and a manual run through the affected phase in the browser.
2. Stage the specific files with `git add <files>`.
3. Commit with a clear message, for example `C1: kit view checklist for approved requests`.
4. Push with `git push myfork main`.

A checkpoint is not done until it is pushed. Tick the box in this file in the same commit.

## 6. Scope guardrails

- No build tools and no dependencies. The app must still open directly from `index.html`.
- Keep the four screens and the visual style. Change the model and the request view; don't rewrite the app.
- Work on `main` of the fork, since the submission is a commit URL.
- Keep the sample story intact (Kabir, Leela, the adapter, Tara's microphone). The prototype must replay the same job.
