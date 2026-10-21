# Contributing

## 环境

- Node.js ≥ 22.12
- npm ≥ 10
- Windows / macOS / Linux

```bash
npm install
npm run dev
```

## 提交前

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

涉及 UI/交互时再跑 `npm run e2e`（先 build）。PR 应保持 `npm run verify` 全绿。

## 代码约定

- TypeScript strict；不要引入 `any`（Biome 会报错）。
- 样式用语义 token，不写死颜色；方向性属性用逻辑属性。
- `shell/` 不 import `modules/`；模块之间不互相 import。
- 新 IPC channel 必须走 `shared/ipc/contract.ts` + 主进程校验 + preload 方法。
- 新模块用 `npm run gen:module` 生成，再改内容。
- 新用户可见文案必须同时加 en-US / zh-CN；`npm test` 会检查 key 对齐。

## PR 检查清单

- [ ] 行为变化已更新 docs 或 README
- [ ] 新命令有 id、标题、快捷键说明
- [ ] 新文件访问走 handle / workspace root
- [ ] 没有新增 `sandbox: false`、`nodeIntegration: true` 或 `webview`
- [ ] lint / typecheck / test / build 通过
- [ ] UI 变化附截图（浅色与深色）
