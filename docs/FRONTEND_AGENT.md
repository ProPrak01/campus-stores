# Frontend agent instructions

You own `apps/web`. Another agent owns `apps/api` and `packages/shared`. Work in parallel without editing each other's folders.

## Read first

1. `README.md` and `TASKS.md` (the product decision: the approved **request is the unit of work**, shown as a "kit view").
2. `legacy/` (the original app: what it looks like and how the shift plays).
3. `docs/API.md` (endpoints) and `packages/shared/src/types.ts` (data shapes).

## Product in one paragraph

A campus media equipment desk. A clerk issues equipment against approved club requests, takes returns (sometimes partial), and hands over to the next shift. The shift has three phases: Fri 3:45 pm pickup, Fri 7:30 pm partial return, Sat 9:00 am morning shift. The UI must replay that same story.

## Ownership and rules

- Edit only `apps/web/**`. Do not edit `apps/api`, `packages/shared`, `docs/API.md` or `TASKS.md`. If the contract needs a change, write the request in `docs/FRONTEND_REQUESTS.md` (what and why) and keep going. The backend agent reads it.
- Stack: React 19, TypeScript (strict), Vite. No UI frameworks or state libraries. Plain CSS (extend `apps/web/src/styles.css`, port the look of `legacy/styles.css`, keep light and dark mode).
- Add a dependency only if you cannot do it in about 30 lines. Icons: copy the inline SVGs from `legacy/index.html` into a small `Icon` component.
- Import types from `@campus/shared`. Never redefine them.
- All server calls go through `apps/web/src/api.ts`. Add one function per endpoint in `docs/API.md`. Server state is the source of truth: after each mutation, replace state with the response.
- For endpoints marked **planned**, build the UI against the documented shape. If the call returns 404, show "Not available yet" in an alert and don't crash.

## Tasks (in order)

1. **App shell.** Header with brand and desk time, shift banner (title, text, "advance" button when a next phase exists), sidebar nav (Requests, Inventory, Loan register, Desk book), status bar with "Restart sample shift". Mobile layout at 375 px.
2. **Requests screen.** List with a status chip per request (Not started / Out / Partly returned / Complete, derived from loans). Selecting one opens the **kit view**.
3. **Kit view (the main feature).**
   - One row per approved line: Not issued / Out (unit ID, holder, due) / Returned.
   - Summary line, for example "2 of 3 returned · adapter AD-12 with Leela Das".
   - Show the request note.
   - "Issue kit" button: collector (defaults to the first authorized person) and due date prefilled, a suggested unit per line, change a unit through a select, one confirm. Per-line "Issue" for partial pickups.
   - If the backend rejects a collector, offer "Add as collector" with a reason field.
4. **Returns.** "Which unit is in your hand?" step listing the open units, then confirm and who returned it. Show the backend error if the unit has no open loan.
5. **Custody and due.** "Passed to someone else" and "New return time" on an open loan. Show the loan history as a timeline.
6. **Inventory.** Status filter (All / On shelf / On loan / In repair). On-loan rows show the holder.
7. **Loan register.** Outstanding vs All slips toggle, newest first.
8. **Desk book and handover.** Club messages (static list in the seed is fine), generated handover summary pinned at the top, free-text note form with an optional request link. Show a non-blocking prompt when advancing time with open loans and no note.
9. **Polish.** Focus goes to the new content after each action. `aria-live` status messages, `role="alert"` for errors. Visible focus. Contrast OK in light and dark. No console errors.

## Quality bar

- `npm run typecheck` and `npm run build` pass before every commit.
- Keep components small: one file per screen under `apps/web/src/screens/`, shared pieces under `apps/web/src/components/`.
- Escape nothing by hand: React does it. Never use `dangerouslySetInnerHTML`.
- Don't add tests unless asked.

## Git habit

After each numbered task:

```sh
npm run typecheck && npm run build
git add apps/web docs/FRONTEND_REQUESTS.md   # only your files
git commit -m "web: <task name>"
git pull --rebase myfork main
git push myfork main
```

Pull with rebase before every push, because the backend agent pushes to the same branch. Never use `git add -A`, force-push, or touch files outside your folder.

## Done means

The full Film Society story can be played from the UI: pick up the kit in one confirm at 3:45 pm, take the partial return at 7:30 pm, hand over, and close the adapter loan for the right unit at 9:00 am. Report back with the commit hash and a list of anything blocked on the backend.
