# API contract

Base path `/api`, JSON in and out. Types live in `packages/shared/src/types.ts`. Every mutating endpoint returns the full updated `AppState`, so the UI replaces its state with the response. Errors return a non-2xx status and `{ "error": "message" }` (`ApiError`).

Status: **live** means it works now. **planned** means the backend owner is building it; code against the shape below and treat 404 as "not ready yet".

| Method and path | Body | Status | Notes |
| --- | --- | --- | --- |
| `GET /api/health` | none | live | `{ ok: true }` |
| `GET /api/state` | none | live | Returns `AppState` |
| `POST /api/reset` | none | live | Restores seed data, returns `AppState` |
| `POST /api/phase/advance` | none | planned | Moves the desk clock forward one phase |
| `POST /api/issue` | `{ requestId, assetId, collectedBy, dueLabel? }` | planned | One slip. `dueLabel` defaults to the request's |
| `POST /api/issue-kit` | `{ requestId, collectedBy, assetIds?: Record<lineType, assetId> }` | planned | Issues every line not yet out, in one call. Picks on-shelf units if `assetIds` is omitted |
| `POST /api/loans/:num/pass-on` | `{ to, by }` | planned | Changes `holder` and adds a `passed_on` event |
| `POST /api/loans/:num/extend` | `{ dueLabel, by }` | planned | Adds an `extended` event |
| `POST /api/return` | `{ assetId, returnedBy }` | planned | Closes the open loan for that unit. Returns 409 if the unit has no open loan |
| `POST /api/requests/:id/collectors` | `{ name, reason }` | planned | Adds an authorized collector |
| `POST /api/notes` | `{ text, requestId? }` | planned | Adds a handover note |
| `GET /api/handover` | none | planned | `{ summary: HandoverLine[] }` generated from open loans |

## Rules the backend enforces (the UI should show the message, not repeat the logic)

- A unit in repair, or already on loan, cannot be issued.
- A line's type must be on the request, and issued quantity cannot exceed `qty`.
- `collectedBy` must be in the request's `authorized` list, otherwise 403 with a message that names the person and the request.
- A return is identified by the unit (`assetId`), not by the slip. If the unit has no open loan, 409 with a message.

## Error messages the UI can show verbatim

The `error` string is written for the desk clerk. Show it in an `role="alert"` region.
