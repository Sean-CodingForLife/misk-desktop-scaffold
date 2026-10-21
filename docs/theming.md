# 主题

## 设计令牌

`src/renderer/src/styles/tokens.css`：

- 颜色：`--bg`、`--surface`、`--surface-2`、`--elevated`、`--line`、`--fg`、`--muted`、`--faint`、`--accent`、
  `--accent-2`、`--success`、`--warning`、`--danger`。
- 尺寸：`--titlebar-h`、`--tabbar-h`、`--statusbar-h`、`--activitybar-w`、`--control-h`、`--radius*`。
- 动效：`--motion`、`--ease`；`data-reduce-motion="true"` 或系统 `prefers-reduced-motion` 置 0。

## 主题切换

`ThemeProvider` 把以下属性写到 `<html>`：

```text
data-theme="dark|light"
data-accent="violet|cyan|emerald|amber|rose"
data-density="comfortable|compact"
data-reduce-motion="true|false"
```

`theme=system` 时使用主进程 `nativeTheme.shouldUseDarkColors`，并通过 `theme:system-changed` 推送。
主进程同时设置 `nativeTheme.themeSource`，让原生菜单/对话框跟随。

## 扩展主题

1. 在 `tokens.css` 增加 `[data-accent="..."]` 或新的 `data-theme` 覆盖。
2. 在 `shared/constants.ts` 的 `ACCENTS`/`THEMES` 增加枚举。
3. 在设置页 Appearance 区增加选项（如需）。
4. 不要直接写死颜色；使用语义 token。

## 高对比与 RTL

- `forced-colors: active` 下保留边框与焦点环。
- 方向性样式使用逻辑属性（`margin-inline`、`padding-inline`、`inset-inline`），为 RTL 留基础。
- `dir` 由语言的 `directionFor()` 设置。
