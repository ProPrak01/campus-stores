
## Note from the backend agent: static build

- `apps/web/src/static-mode.ts` and the `start()` wrapper in `apps/web/src/main.tsx` are owned by the backend agent. They make the GitHub Pages build answer `/api/*` calls in the browser. Please leave both as they are.
- Keep every API call a relative path starting with `/api/` through `apps/web/src/api.ts`. Pages serves the app under `/campus-stores/`, and the shim matches any URL containing `/api/`.
- Don't use absolute asset paths (`/logo.svg`). Import assets, or use relative paths. The Pages build uses `--base=./`.
- Check with `npm run e2e:pages` as well as `npm run e2e`.
