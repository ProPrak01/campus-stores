# Frontend agent: round 3 (redesign and desk tools)

Start this after you finish round 2 (`docs/FRONTEND_ROUND2.md`, W1 to W9). Skip round 2's W10 visual check; R10 below replaces it. Ownership, git rules and the "names to keep stable" list from round 2 still apply.

Goal: the app should look like a clean, professional desk tool (calm, clinical, easy to scan at a busy counter), feel complete, and include the side tools a desk clerk actually reaches for.

Limits:
- The Film Society story stays the main path. `npm run e2e` must keep passing. Keep the classes `.row` and `.kit-line` on the equivalent elements, and keep every button and label name listed in round 2.
- It must still run offline. No CDN fonts or scripts.
- Allowed new dependency: `lucide-react` (icons, already licensed in `legacy/third-party`). Nothing else without a note in `docs/FRONTEND_REQUESTS.md`.
- No backend changes are needed. Derive everything from `AppState`. If you need data the API doesn't have, write it in `docs/FRONTEND_REQUESTS.md` and fake it client-side until then.

## R1. Design system

Create `apps/web/src/styles/tokens.css` and rebuild `styles.css` on it.
- **Color:** neutral greys, one accent (deep teal or blue), semantic colors for success, warning, danger and info. Light and dark themes via `[data-theme]` on `<html>`, defaulting to the system setting.
- **Type:** system stack (`Inter, -apple-system, Segoe UI, Roboto, sans-serif`). Scale 12 / 13 / 14 / 16 / 20 / 24. `font-variant-numeric: tabular-nums` for IDs, times and numbers.
- **Space and shape:** 4 px spacing scale, radius 6 / 10 / 14, two shadow levels.
- **Components** (in `components/ui/`): `Button` (primary, secondary, ghost, danger, sizes sm and md, loading state), `Chip` (status with icon plus text, never color alone), `Card`, `Field` (label, hint, error), `Select`, `Input`, `Textarea`, `Drawer`, `Modal`, `Toast`, `EmptyState`, `Skeleton`, `Kbd`.
- Remove every inline `style={{…}}`.

## R2. App layout

- **Top bar:** brand, desk clock with phase, global search (R5), Tools button (R7), theme toggle (light, dark, system), shortcuts help (`?`).
- **Sidebar:** icons and labels, with count badges (open requests, loans out, overdue in red). It collapses to icons at tablet width and becomes a bottom tab bar at 375 px.
- **Shift banner:** a slim card under the top bar with the phase title, story text, the handover line (round 2 W5) and the advance button.
- **Toasts:** use toasts for success messages. Keep the `role="status"` live region. Errors stay in the `role="alert"` box and also raise a danger toast.
- **API down:** a full-width banner with a Retry button instead of the bare "Could not reach the API" page.
- **Loading:** skeleton rows instead of "Loading…".

## R3. Overview screen (new, first in the nav)

"Today at the desk" as a dashboard:
- Stat cards: Loans out, Overdue, Due within 1 hour, Units on shelf, Units in repair. Clicking a card opens the filtered list.
- "Expected back" list, sorted by due time, with holder and chip.
- "Next actions": generated from state, for example "AD-12 is overdue with Leela Das: record return or set a new return time", "RQ-217 not started: collection Saturday morning".
- The latest handover note card.
- A shelf summary per equipment type (for example "Adapters 1 / 2 on shelf") as small bars.

## R4. Better lists

- **Inventory and Loan register as tables:** sortable columns, sticky header, filter chips, text filter. At 375 px each row turns into a card.
- **Unit drawer:** clicking a unit ID anywhere opens a drawer with model, bin, status, current holder, and every loan of that unit with its history.
- **Request drawer or page:** keep the kit view, and add a progress bar ("2 of 3 back").
- **Activity screen (new):** one timeline of every loan event across the shift (issued, passed on, new return time, returned), filterable by request, unit and person.

## R5. Search and command palette

`Ctrl/Cmd + K` opens a palette. It searches requests, units, people and slips (L-404), and offers actions: "Issue kit for RQ-214", "Record return", "Go to Desk book", "Restart sample shift". Arrow keys move, Enter runs, Escape closes. The top-bar search opens the same palette.

## R6. Keyboard shortcuts

`g o` overview, `g r` requests, `g i` inventory, `g l` loan register, `g d` desk book, `g a` activity, `t` tools, `/` search, `?` help overlay. Ignore shortcuts while typing in a field.

## R7. Desk tools (new drawer, opened from the top bar or with `t`)

Put the logic in pure functions in `apps/web/src/tools/*.ts`, separate from the UI, so it is easy to check. Sample equipment specs go in `apps/web/src/tools/specs.ts`, marked "fictional sample specs".

1. **Calculator:** keypad and keyboard input, `+ − × ÷ %`, parentheses, backspace, clear, last 5 results. Write a small parser. Never use `eval` or `Function`.
2. **Projector throw calculator:** pick a projector model (from `state.assets` plus specs). Enter the distance to get the image width, height and diagonal, or the reverse. Aspect ratio 16:9, 16:10 or 4:3. Units m or ft.
3. **Screen size converter:** diagonal to width and height and back, for any aspect ratio, in inches or cm.
4. **Unit converter:** length (m, cm, ft, in, for cable runs), weight (kg, lb, for carrying the kit), temperature (°C, °F).
5. **Time and duration:** the time between two moments (issue time and desk clock), how late a loan is now, and adding hours to a time ("issued 3:45 pm + 4 h 15 m").
6. **Power budget:** pick units from inventory, sum their sample watts, and compare with an extension lead rating (for example 2400 W). Shows a warning when over 80 %.
7. **Connection checker:** pick the source port (USB-C, HDMI, DisplayPort, VGA) and the projector input. It says which adapter is needed and whether one is on the shelf now, for example "USB-C → HDMI: AD-15 on shelf, bin C4". This is the RQ-214 "USB-C-only laptop" case.
8. **Kit checklist printout:** pick a request and print (or save as PDF) a one-page pickup sheet with each line, unit ID, bin, and spaces for collector and desk initials.

The drawer remembers the last tool used (`localStorage`).

## R8. Desk book and handover

- Two columns on desktop: messages and notes on the left, a "Handover for next shift" card on the right.
- A "Copy handover" button copies a plain-text summary for chat.
- "Print handover" prints a print stylesheet version.
- Note composer: request link, quick-insert chips for open loans ("AD-12 · Leela Das · Sat 9 am").

## R9. Counter mode

A toggle in the top bar that hides the sidebar and uses larger type and buttons (44 px or more) for touch at the counter. It shows only the current shift's work: requests due for pickup, items expected back, and the Return action.

## R10. Finish

- WCAG AA contrast in both themes. Visible focus everywhere. All drawers and modals trap focus and close on Escape.
- No layout break at 375 px, 768 px and 1280 px.
- No console errors. `npm run typecheck`, `npm run build` and `npm run e2e` pass.
- Save screenshots to `apps/web/screenshots/` covering: Overview, kit view at 7:30 pm, the Tools drawer showing the throw calculator, the Desk book, and mobile Overview, in light and dark.

## Order and commits

R1 → R2 → R3 → R4 → R7 → R8 → R5 → R6 → R9 → R10. Commit and push after each item, staging `apps/web/` files by name only:

```sh
npm run typecheck && npm run build && npm run e2e
git add apps/web/<your files>
git commit -m "web: R<n> <short description>"
git pull --rebase --autostash myfork main
git push myfork main
```

When done, add a "Round 3 report" to `docs/FRONTEND_REQUESTS.md` with the commit for each item and anything skipped.
