# 安全

## 报告

发现安全问题请不要公开开 issue；通过仓库的 Security advisory 私下报告，或联系维护者。
请附：版本、平台、复现步骤、影响范围。

## 威胁模型

渲染进程是**受信**的（只加载本地打包内容，无远程页面、无 webview）。主要防护目标是：

- XSS/远程内容注入后的能力提升；
- IPC 参数伪造导致任意文件读写；
- 外部链接/深链被滥用为文件访问入口；
- 恶意依赖或渲染进程崩溃拖垮应用。

## 已实施的边界

- `sandbox: true`、`contextIsolation: true`、`nodeIntegration: false`、`webviewTag: false`。
- 生产页面走 `app://` 自定义协议，路径前缀校验，响应头 CSP；不使用 `file://`。
- `will-navigate` 拦截；外部 http/https/mailto 才交给系统；权限请求默认拒绝。
- IPC：zod 输入/输出校验、统一错误信封、sender frame URL + 窗口校验。
- 文件：opaque handle；工作区 root + 相对路径；绝对路径/`..`/realpath 逃逸检查。
- 深链只导航 View，不携带路径。
- Secrets 用 `safeStorage`；不可用时拒绝而不是明文降级。
- 诊断导出不包含 secrets，并移除最近工作区路径。

## 已知信任边界

`files:grant` 接受渲染层传来的路径（拖放场景）。这依赖“渲染进程受信 + CSP + 无远程内容”。
如果未来加载远程内容或运行时插件，必须把 grant 改成由主进程从原生拖放事件直接获取路径，
或引入用户确认。

## 依赖

`npm audit` 与 Dependabot 已配置。升级 Electron 时关注 Chromium CVE 与 breaking changes。
