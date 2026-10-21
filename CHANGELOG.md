# Changelog

All notable changes to Misk Desktop are documented here.

## 2.0.0 — 2026-10-21

### Added

- General-purpose desktop shell: frameless window, activity bar, sidebar, tabs, status bar, command palette,
  quick switcher, menus, dialogs and toasts.
- Build-time module system with typed registries for views, commands, panels, status items, menus, settings and i18n.
- TanStack Router memory routing, tab restore, deep links (`misk://view/...`).
- Typed IPC contract with zod validation, error envelope and sender checks.
- Settings service (`settings.json`), session store, module storage and safeStorage secrets.
- Workspace service: folder picker, file tree, recursive watcher, recent folders, drag/drop, file preview.
- Desktop integration: single instance, window state, native + in-app menus, notifications, logging,
  crash fallback, diagnostics export, `nativeTheme` sync.
- Generators: `gen:module`, `gen:view`, `gen:panel`, `gen:settings`; `rename-app`; `eject-demo`.
- Tasks demo module (non-editor) and Home page.
- Vitest unit/component tests, Playwright Electron e2e, coverage thresholds, GitHub Actions CI/release.
- Chinese documentation and English README summary.
