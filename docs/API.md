# API contract

Base path `/api`, JSON in and out. Types live in `packages/shared/src/types.ts`. Every mutating endpoint returns the full updated `AppState`, so the UI replaces its state with the response. Errors return a non-2xx status and `{ "error": "message" }` (`ApiError`).

Status: **live** means it works now. Every endpoint below is live.

| Method and path | Body | Status | Notes |
| --- | --- | --- | --- |
| `GET /api/health` | none | live | `{ ok: true }` |
| `GET /api/state` | none | live | Returns `AppState` |
| `POST /api/reset` | none | live | Restores seed data, returns `AppState` |
| `POST /api/phase/advance` | none | live | Moves the desk clock forward one phase |
| `POST /api/issue` | `{ requestId, assetId, collectedBy, dueLabel? }` | live | One slip. `dueLabel` defaults to the request's |
| `POST /api/issue-kit` | `{ requestId, collectedBy, assetIds?: Record<lineType, assetId> }` | live | Issues every line not yet out, in one call. Picks on-shelf units if `assetIds` is omitted |
| `POST /api/loans/:num/pass-on` | `{ to, by }` | live | Changes `holder` and adds a `passed_on` event |
| `POST /api/loans/:num/extend` | `{ dueLabel, by }` | live | Adds an `extended` event |
| `POST /api/return` | `{ assetId, returnedBy }` | live | Closes the open loan for that unit. Returns 409 if the unit has no open loan |
| `POST /api/requests/:id/collectors` | `{ name, reason }` | live | Adds an authorized collector |
| `POST /api/notes` | `{ text, requestId? }` | live | Adds a handover note |
| `GET /api/handover` | none | live | `{ summary: HandoverLine[] }` generated from open loans (`HandoverLine` is in shared types) |

## Club messages

`AppState.messages` holds the club messages (`ClubMessage`: `phase`, `time`, `author`, `text`). Show a message once `state.phase >= message.phase`. The Desk book should read them from state instead of hard-coding them.

## Due times and overdue

Return times come from `AppState.dueOptions` (label plus ISO time). `dueLabel` in `issue`, `issue-kit` and `extend` must match one of the labels, otherwise 422. Each loan and request carries `dueAt`. The desk clock is `shifts[phase].at`. Use `dueStatus(nowAt, dueAt)` from `@campus/shared` to get `"ok" | "due_soon" | "overdue"` (due soon means within 60 minutes). `GET /api/handover` already includes `dueStatus` per line.

## Rules the backend enforces (the UI should show the message, not repeat the logic)

- A unit in repair, or already on loan, cannot be issued.
- A line's type must be on the request, and issued quantity cannot exceed `qty`.
- `collectedBy` must be in the request's `authorized` list, otherwise 403 with a message that names the person and the request.
- A return is identified by the unit (`assetId`), not by the slip. If the unit has no open loan, 409 with a message.

## Error messages the UI can show verbatim

The `error` string is written for the desk clerk. Show it in an `role="alert"` region.

## Status codes

`403` collector not authorized. `404` unknown request, unit or slip. `409` state conflict (in repair, already on loan, quantity reached, no open loan, slip closed, nothing left to issue, no later shift). `422` bad or missing input.
