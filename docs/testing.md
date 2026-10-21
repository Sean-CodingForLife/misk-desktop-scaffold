# 测试

## 命令

```bash
npm test                 # Vitest
npm run test:coverage    # 覆盖率门槛
npm run e2e              # Playwright + Electron（需要先 build）
npm run verify           # lint + typecheck + coverage + build
```

## 单元 / 组件

- `tests/unit`：快捷键、设置 schema/升级、路径守卫、注册表、命令绑定、Zustand store。
- `tests/component`：jsdom + Testing Library（Toast 示例）。
- 覆盖率只统计核心纯逻辑（`shared`、path-guard、命令/视图注册表、tabs/route/ui/dialog/toast store、tasks store），
  门槛 55% lines / 50% functions / 45% branches。

## E2E

`tests/e2e` 使用 Playwright `_electron`：

- 每个用例使用临时 userData，避免污染本机设置。
- `MISK_E2E=1` 启用测试旁路：`MISK_USER_DATA`、`MISK_E2E_WORKSPACE`（目录对话框直接返回该路径）。
- 覆盖：启动 Home、命令面板、设置分区切换、并发设置写入、冷启动深链、Tasks 持久化、
  主题/语言持久化、工作区文件树与预览。
- 截图：`npm run screenshot` 输出 `docs/screenshot.png` 与 `docs/screenshot-tasks.png`。

## 注意

- Windows 上运行 Electron 前确保没有设置 `ELECTRON_RUN_AS_NODE=1`，否则主进程会以 Node 模式启动。
- E2E 默认 `workers: 1`；CI 失败会保留 trace/screenshot。
- 测试环境变量只影响测试；生产代码没有对话框旁路。
