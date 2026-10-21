# 设置、存储与会话

## Settings

`userData/settings.json` 是应用偏好的唯一事实源，schema 在 `src/shared/settings/schema.ts`。

```text
appearance   theme / accent / density / reduceMotion
locale       语言
layout       侧栏开关、宽度、当前面板
keybindings  命令 id -> 绑定或 null
commands     recent（命令面板最近使用）
workspace    recent / lastId / showHidden / ignore
advanced     logLevel / confirmOnQuit
```

- 首次启动 `locale` 取系统语言（可解析时），主题默认 `system`。
- 写入：tmp + rename 原子替换，并保留 `.bak`。
- 损坏：备份为 `settings.corrupt-<timestamp>.json`，回默认值并提示。
- 升级：`migrateSettings()` 按 `version` 升级；未知版本回默认。
- patch：深合并，但 `keybindings` 是整体替换（所以 `{}` 能重置全部快捷键）。
- 变更通过 `settings:changed` 广播；主进程同时更新 `nativeTheme.themeSource` 和窗口背景色。

## Secrets

`safeStorage` 加密后存 `userData/secrets.json`。API 只暴露 `set/get/delete/keys`；
`isEncryptionAvailable()` 为 false 时拒绝写入，不降级明文；不写日志、不进入设置导出/诊断包。

## Storage

模块业务数据：`userData/storage/<key>.json`。

- key 规则：`^[a-z0-9][a-z0-9._-]{0,63}$`。
- JSON 可序列化，序列化后上限 2MB，原子写。
- 模块自己用 zod 校验；例如 Tasks 使用 `tasks.v1`。

## Session

`userData/session.json` 只保存标签列表和 activeIndex。写入 300ms 防抖；退出时 flush。
不保存 handle、滚动位置、表单草稿。

## 设置界面

`core.settings` 是单例 View，分区由模块注册：

- core：Appearance / Language / Keyboard shortcuts / Workspace / Advanced / About
- tasks：Tasks（示例模块设置）

支持搜索、导入/导出设置、导出诊断、打开日志目录、重置全部设置。
