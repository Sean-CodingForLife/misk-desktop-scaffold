# 命令、快捷键与菜单

## Command

```ts
interface Command<A = void> {
  id: string
  title: LocalizedText
  category?: LocalizedText
  icon?: LucideIcon
  defaultKeybinding?: string
  args?: z.ZodType<A>
  when?: (context: WhenContext) => boolean
  run: (runtime: CommandRuntime, args: A) => void | Promise<void>
}
```

- 命令是菜单、快捷键、命令面板、通知动作的唯一执行入口。
- `when` 接收 `{ activeViewId, workspaceOpen, paletteOpen, quickSwitcherOpen, modalOpen }`。
- `args` 用于菜单/通知/深链传参；执行前 zod 校验，失败 Toast。
- 运行时异常会被捕获并 Toast，不会拖垮壳。

## 快捷键

- 语法：`Mod+Shift+P`、`Ctrl+Tab`、`F1`、`Mod+,`；`Mod` 在 macOS 为 Cmd。
- 默认绑定在命令定义；用户覆盖存 `settings.keybindings`，`null` 表示解绑。
- 输入框内：只有带 Ctrl/Meta/Alt 的绑定触发，普通字母键不劫持输入。
- 同一绑定绑定多个命令时，设置页显示冲突，不自动解绑。
- 执行器只有渲染层 keydown 一套。原生菜单的命令项不向系统注册 accelerator：
  - Windows/Linux：`accelerator` + `registerAccelerator: false`，只显示。
  - macOS：`registerAccelerator` 不生效，因此不设 accelerator，把快捷键拼到菜单标签上。
  这样避免 macOS 原生菜单与 keydown 双触发。

## 菜单

菜单模型在 `MenuRegistry` 中声明，支持：

- `separator`、`item`、`submenu`、`dynamicItems`（最近工作区）。
- `role`（undo/copy/quit…）、`command`、`args`。
- `enabled` / `checked` 可以是布尔或函数，构建快照时求值。
- `visible` 控制显隐；`order` 控制顺序。

原生菜单由渲染层通过 `menu:update` 发送快照；点击 command 项时主进程回发 `command:run`。
应用内菜单栏只用于非 macOS：macOS 使用系统菜单栏。

右键菜单通过 `window.misk.menu.popup(items, x, y)` 使用原生菜单。
