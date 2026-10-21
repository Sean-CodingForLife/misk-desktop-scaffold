# 桌面能力

## 已实现

| 能力 | 说明 |
| --- | --- |
| 窗口 | 无边框 Windows/Linux；macOS `hiddenInset`；窗口状态持久化并夹取到显示器 |
| 单实例 | `requestSingleInstanceLock`，第二实例聚焦并处理 argv |
| 深链 | `misk://view/<id>?<params>`，只导航 View |
| 菜单 | 原生菜单 + 应用内 Menubar + 原生右键菜单，同一声明式模型 |
| 通知 | 主进程 `Notification`；点击可聚焦并打开 View |
| 日志 | electron-log 落盘、轮转、级别可设；渲染层经 IPC 写入 |
| 崩溃兜底 | 主进程异常、渲染进程消失、无响应、App/View ErrorBoundary |
| 诊断 | 导出 JSON：应用信息、脱敏设置、会话、模块/View/Command 列表、最近日志 |
| 工作区 | 文件树、监听、最近、拖放、预览 |
| 主题联动 | `nativeTheme` → 渲染层；窗口背景色同步 |

## 有意不做

托盘、全局快捷键、多窗口、自动更新、运行时插件、远程崩溃上报、遥测、分屏/停靠、完整文档编辑器生命周期。

### 接入托盘

在主进程新增 `services/tray.ts`：创建 `Tray`，菜单项通过 `windows.send('command:run', ...)` 或直接调用
`app.quit()`；在 `lifecycle` 的 `whenReady` 里初始化，在 `will-quit` 里 `destroy()`。
把图标放到 `build/`，macOS 使用 template image。

### 接入多窗口

把 `WindowService` 的 `window` 单值改为 `Map<id, BrowserWindow>`；IPC sender 校验改为“属于已知窗口集合”；
渲染层每个窗口独立 bootstrap，共享 settings 广播。注意 session 需要按窗口拆分。

### 接入自动更新

加入 `electron-updater`，在 `whenReady` 后创建 updater（仅 packaged 启用），配置 `publish` feed；
新增“检查更新”命令与状态栏项；发布流程补签名/公证。当前 `release.yml` 只产出安装包，不接 feed。

### 接入全局快捷键

主进程 `globalShortcut.register()`；建议只注册少量系统级快捷键，并允许用户在设置里关闭。
应用内快捷键仍由渲染层 keydown 负责，两者不要绑定同一组合。

### 接入数据库

主进程新增服务（如 SQLite），通过 typed IPC 暴露查询；不要从渲染进程直接打开数据库文件。
业务数据也可以先用 `storage` 服务。
