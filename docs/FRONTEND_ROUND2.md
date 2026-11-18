# Frontend agent: round 2

Read this whole file before you start. It replaces the task list in `docs/FRONTEND_AGENT.md`. The ownership and git rules in that file still apply.

## Where things stand

The full Film Society story already plays end to end in a browser (checked with a scripted run, screenshots in `docs/after/`):

1. 3:45 pm: open RQ-214, "Issue kit", collector Kabir Sen, one confirm issues PR-04, SP-02, AD-12.
2. 7:30 pm: return PR-04 and SP-02 through "Which unit is in your hand?", pass AD-12 on to Leela Das, Desk book shows the generated handover.
3. Sat 9:00 am: Loan register shows AD-12 Overdue with Leela Das, return it, RQ-214 shows Complete.

Since your last session, the other agent (backend owner) changed these files in `apps/web`. Read them before editing:

- `components/ReturnPanel.tsx` (new): the return step. `screens/Returns.tsx` was deleted.
- `components/DueChip.tsx` (new): Overdue / Due soon chip from `dueStatus()` in `@campus/shared`.
- `api.ts`: `HandoverSummary` now uses `HandoverLine` from `@campus/shared`.
- `App.tsx`: server errors show in a `role="alert"` box (`alert` state).
- `screens/KitView.tsx`, `LoanRegister.tsx`, `DeskBook.tsx`: wired to the above. Return times come from `state.dueOptions`.

## The one rule that matters most

We share the same working folder and the same `main` branch. You will see the other agent's uncommitted files in `git status`. **Stage only paths under `apps/web/` (and `docs/FRONTEND_REQUESTS.md`)**, by name. Never `git add -A`, `git add .`, `git stash`, `git checkout -- <file>`, `git reset` or a force push.

You own `apps/web/**`. Do not edit `apps/api`, `packages/shared`, `e2e/`, `docs/` (except `docs/FRONTEND_REQUESTS.md`), `README.md` or `TASKS.md`. If you need a backend or type change, write it in `docs/FRONTEND_REQUESTS.md` and keep going.

## Keep these names stable

The end-to-end test (`e2e/story.mjs`, owned by the other agent) finds controls by these accessible names. Keep them exactly, or write the rename in `docs/FRONTEND_REQUESTS.md` first:

- Buttons: `View form`, `Issue kit`, `Confirm — issue all`, `Return`, `Pass on`, `Confirm pass-on`, `Record return`, `Confirm return`, `Move to return time`, `Move to next morning`, `Advance`, `Restart sample shift`, nav buttons `Requests`, `Inventory`, `Loan register`, `Desk book`.
- Labels: `Collected by`, `Pass to`, `Returned by`, `Which unit is in your hand? Read the ID on its label.`
- Text: the request status chips (`Not started`, `Out`, `Partly returned`, `Complete`), `Overdue`, and the handover line that starts `Expect AD-12`.
- CSS classes used as hooks: `.row`, `.kit-line`.

## Tasks, in order

Commit and push after each task (see "Git habit" below).

**W1. Favicon.** The page requests `/favicon.ico` and gets a 404. Add an inline SVG favicon (data URI, the package-open mark in `--mark` orange) to `apps/web/index.html`.

**W2. Club messages from state.** Delete the hard-coded `getClubMessages()` in `DeskBook.tsx`. Read `state.messages` (type `ClubMessage` in `@campus/shared`) and show each one once `state.phase >= message.phase`. Merge them with handover notes, newest first.

**W3. Collector must be chosen.** In "Issue kit" and per-line issue, "Collected by" defaults to `request.authorized[0]` (Isha Rao, the person who filed the form). That hides the real decision at the counter. Start it at "Select…", disable the confirm button until a collector is picked, and show the authorized list next to it ("Authorized: Isha Rao, Kabir Sen"). Keep the `Collected by` label.

**W4. Authority and notes in the kit view.**
- Under the request header, show who may collect, and any `request.collectorLog` entries as "Leela Das added at Friday · 7:30 pm: <reason>".
- Show handover notes whose `requestId` matches this request, newest first, under the kit lines.

**W5. Handover on the shift banner.** For phases 1 and 2, add one line to the shift banner: the latest handover note (if any) and the count of open loans, for example "2 items still out · latest note: Adapter AD-12 with Leela, due Sat 9 am". Clicking it opens the Desk book.

**W6. Overdue on the request list.** On the Requests list, add the Overdue chip to a request row when any of its open loans is overdue.

**W7. Nothing to issue.** If a line has no available unit, show "No unit on the shelf" on that line and leave it out of "Issue kit". If no line can be issued, hide or disable "Issue kit" and say why.

**W8. Split `KitView.tsx` (464 lines).** Move the forms into `components/kit/`: `KitLineRow`, `IssueKitForm`, `LineIssueForm`, `PassOnForm`, `ExtendForm`, `AddCollectorForm`, `LoanHistory`. Move every inline `style={{…}}` in `KitView`, `App`, `DeskBook` and `LoanRegister` into named classes in `styles.css`. No behavior change in this task.

**W9. Focus and keyboard.**
- When an inline form opens, focus its first field.
- `Escape` closes an open inline form and returns focus to the button that opened it.
- After a successful mutation, move focus to the changed row or the kit summary. After an error, focus the alert box.
- Opening a request focuses its heading. "Back to list" returns focus to that request's row.

**W10. Visual check.** Run the story by hand at 375 px and at desktop width, in light and dark mode (`prefers-color-scheme`). Fix overflow, wrapping and contrast (chips: Overdue, Due soon, Out, Partly returned, Complete). Save four screenshots to `apps/web/screenshots/` (light desktop, dark desktop, light 375 px, dark 375 px) during the 7:30 pm phase.

## Not in scope

No new screens, no routing library, no state library, no UI kit, no tests (the other agent owns `e2e/`). No changes to the domain rules: the API enforces them and the UI shows its error message.

## Checks before every push

```sh
npm run typecheck
npm run build
npm run e2e        # once e2e/ exists; needs Google Chrome installed
```

If `npm run e2e` fails because of something you changed on purpose, write it in `docs/FRONTEND_REQUESTS.md`. Don't edit `e2e/`.

## Git habit

After each task:

```sh
npm run typecheck && npm run build
git add apps/web/<the files you changed>      # by name, only yours
git commit -m "web: W<n> <short description>"
git pull --rebase --autostash myfork main
git push myfork main
```

## When you finish

Append a "Round 2 report" to `docs/FRONTEND_REQUESTS.md`: the commit hash for each task, anything you skipped and why, and anything you need from the backend. Commit and push it.
