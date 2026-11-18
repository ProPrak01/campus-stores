# Campus Stores

Campus Stores is a Product Engineer work sample set at a fictional campus media equipment desk. Work through a club’s screening, from equipment pickup to a partial return and the next morning’s handover.

This fork rebuilds the original app as a TypeScript monorepo and redesigns the request, return and handover flow. The plan is in [TASKS.md](TASKS.md). The original app is kept, unchanged, in [legacy/](legacy/) (open `legacy/index.html`).

## Stack

| Part | Tech |
| --- | --- |
| `apps/web` | React 19, TypeScript, Vite |
| `apps/api` | Fastify, TypeScript (run with tsx), JSON-file store |
| `packages/shared` | Domain types and seed data used by both apps |

## Run

Requires Node 20+.

```sh
npm install
npm run dev        # API on :3001, web on http://localhost:5173
```

Production-style, one process on http://127.0.0.1:3001:

```sh
npm start
```

Other scripts: `npm run typecheck`, `npm run build`. `POST /api/reset` restores the fictional starting records. State is saved to `apps/api/data/state.json` (git-ignored).

## Layout

```
apps/web         UI (see docs/FRONTEND_AGENT.md)
apps/api         HTTP API and domain rules
packages/shared  Types and seed data (the contract between the two)
legacy           Original exercise app
docs             API contract, evidence, screenshots
```

Icon license notices are in [legacy/third-party/lucide-LICENSE.txt](legacy/third-party/lucide-LICENSE.txt).

## Submit your work

1. [Fork Campus Stores](https://github.com/virinchi-healthcare/campus-stores/fork) into your GitHub account. Complete the candidate brief and push your changes to your public fork. In your README, point reviewers to your work and explain the decision you made.
2. In your fork, open **Commits**, select the final commit you want reviewed, and copy the page URL. It should look like `https://github.com/YOUR-USERNAME/campus-stores/commit/COMMIT-SHA`.
3. [Submit your work through the Google Form](https://docs.google.com/forms/d/e/1FAIpQLScvzoh1R4WS-SkiwAVBQbMvniieJYSoOEfLMyVo5CyjOvYUgQ/viewform). Your **roll number**, **email ID**, and **final commit link from your public fork** are required. Enter your roll number and email ID in the form only.
