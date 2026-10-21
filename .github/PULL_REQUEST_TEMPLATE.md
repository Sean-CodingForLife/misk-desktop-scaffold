## What changed

<!-- One paragraph. -->

## Why

<!-- Problem, user impact, linked issue. -->

## Verification

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run e2e` (if UI/interaction changed)

## Screenshots

<!-- Light and dark, before/after if relevant. -->

## Security

- [ ] No new `sandbox: false`, `nodeIntegration: true`, `webview`, or absolute-path file IPC
- [ ] New IPC channels go through `shared/ipc/contract.ts` + sender validation
