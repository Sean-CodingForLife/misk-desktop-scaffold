# 文件与工作区

## 两种能力

1. **文件 handle**：对话框打开/保存或拖放授权后，主进程返回 opaque handle；读写只接受 handle。
2. **工作区 root**：用户选择文件夹后返回稳定 `workspaceId`；访问形式是 `workspaceId + 相对路径`。

渲染进程不传绝对路径做读写。`workspaceId` 是 `sha1(realpath)` 前 16 位；同一路径复用同一 id。

## 路径校验

`src/main/services/path-guard.ts`：

- 拒绝绝对路径、NUL、`..` 段。
- `resolve(root, rel)` 必须仍在 `root + sep` 前缀内（Windows 大小写不敏感）。
- 读写前对目标做 `realpath`；新文件对父目录做 `realpath`，防止符号链接逃逸。
- `files:grant`（拖放）接受渲染层传来的路径，属于受信渲染进程能力；由严格 CSP、无远程内容、无 webview 约束，
  见 SECURITY.md。

## 监听

`workspace:watch(id)` 使用 Node `fs.watch(root, { recursive: true })`，150ms 防抖，
合并事件后发送 `workspace:changed`。忽略 `settings.workspace.ignore`，默认 `.git`、`node_modules`、`dist`、`out`。
监听失败会记录日志、Toast 一次，并保留手动刷新。

## 文件预览

`workspace.preview` 支持两种参数：

```text
{ source: 'workspace', workspaceId, path }   可恢复
{ source: 'handle', handle, name }           不可恢复
```

- 文本：UTF-8，≤ 1MB。
- 图片：png/jpg/jpeg/gif/webp/avif/svg，≤ 5MB，data URL 展示。
- 二进制/过大：显示元数据，可“用默认应用打开”。
- 操作：刷新、在文件夹中显示、复制路径、用默认应用打开。

## 拖放与外部打开

- 拖放：preload 用 `webUtils.getPathForFile` 取路径 → `files:grant` → 目录走 `workspace:open-handle`，
  文件走 handle 预览。
- 外部打开：macOS `open-file`、Windows/Linux argv；目录打开工作区，文件打开预览。
- 深链永远不带路径。
