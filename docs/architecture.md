# 架构

Misk Desktop 由主进程、preload、渲染进程三层组成。壳与业务的分界线是 **module**：
`src/renderer/src/shell` 只放通用 UI，`src/renderer/src/modules` 放业务。

## 进程模型

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 主进程 | `src/main/` | 窗口、`app://` 协议、单实例/深链、菜单、通知、设置、文件、工作区、日志、崩溃兜底、IPC |
| preload | `src/preload/` | `contextBridge` 暴露 `window.misk`，不暴露 Node 或任意 channel |
| 渲染进程 | `src/renderer/` | 壳、路由、标签、命令、菜单模型、设置 UI、模块 |

```text
renderer (React)
  │ window.misk.settings / files / workspace / ...
  ▼
preload (contextBridge + typed wrappers)
  │ ipcRenderer.invoke / on
  ▼
main (zod 校验 + sender 校验 + 服务)
```

## 启动顺序

1. `src/main/index.ts` 在 ready 前注册 `app://` privileged scheme。
2. `bootstrap()`：`app.enableSandbox()`、单实例锁、`appId`、E2E userData 覆盖。
3. `whenReady`：加载 settings → 初始化日志 → session → 服务 → IPC → 安全 → 窗口。
4. 生产加载 `app://bundle/index.html`；开发加载 `ELECTRON_RENDERER_URL`。
5. 渲染进程 `main.tsx`：取 app info / settings → 初始化 i18n → 激活模块 → 恢复工作区 → 恢复 session →
   创建 router → 设置命令 runtime → 渲染。
6. 模块激活失败会被隔离并记录，应用继续启动；Home 的模块列表会标红失败项。

## 页面加载与 CSP

生产页面不使用 `file://`，而是：

```text
app://bundle/index.html
app://bundle/assets/index-xxxx.js
```

`src/main/app-protocol.ts` 的 `protocol.handle('app', ...)` 只允许读取 `out/renderer` 下的文件，路径前缀校验，
并在响应头注入 CSP。开发环境通过 `session.webRequest.onHeadersReceived` 注入放宽的 CSP（HMR/React Refresh）。

## 模块与渲染

- 模块在 React 渲染前激活，向全局注册表注册 View / Command / Panel / Status / Menu / Settings / i18n。
- 页面通过 `viewRegistry` 找到组件；标签 store 只保存实例，路由是“当前激活标签”的唯一事实源。
- 命令通过 `CommandRuntime` 访问导航、工作区、主题、通知和设置；模块不直接操作路由。
- 菜单由声明式模型派生：应用内菜单（Radix Menubar）和原生菜单使用同一份快照。

## 数据流

| 场景 | 路径 |
| --- | --- |
| 打开 View | module command → runtime.openView → tabs store + router → ViewRoute effect → 激活 |
| 设置变更 | UI → settings store（乐观）→ `settings:patch` → 主进程校验/落盘 → `settings:changed` 广播 |
| 工作区 | `workspace:open-dialog` → 主进程授权 root → 渲染层 watcher/query → 文件树/预览 |
| 文件读写 | dialog/drop → opaque handle → `files:read/write` → 主进程路径校验 |
| 关闭窗口 | 主进程 `app:before-close` → 渲染层 close guards → `app:close-response` |
| 深链 | `misk://view/<id>?<params>` → 主进程解析 → `app:open-url` → `openView` |

## 目录边界

- `shell/` 不 import `modules/`；模块可以 import `shell/ui/` 与 `core/`。
- `main/` 不 import `renderer/`；共享类型只从 `shared/` 取。
- `shared/` 不 import Electron 或 React。
- `modules/` 之间不互相 import；跨模块协作走命令/事件。

## 安全边界

- `sandbox: true`、`contextIsolation: true`、`nodeIntegration: false`、`webviewTag: false`。
- IPC：zod 输入/输出校验、统一错误信封、sender URL 校验、已知窗口校验。
- 文件：渲染进程不传绝对路径；handle / workspace root + 相对路径；`realpath` 逃逸检查。
- 导航：`will-navigate` 拦截；外部 http/https/mailto 交给系统；权限默认拒绝。
- 深链只导航 View，不授权文件。
