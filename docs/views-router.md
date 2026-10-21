# View、路由与标签

## ViewDefinition

```ts
interface ViewDefinition<P extends ViewParams = ViewParams> {
  id: string
  title: LocalizedText
  icon?: LucideIcon
  component?: ComponentType<ViewProps<P>>
  load?: () => Promise<{ default: ComponentType<ViewProps<P>> }>
  params?: z.ZodType<P>
  singleton?: boolean
  dedupeParams?: boolean
  keepAlive?: boolean
  restorable?: boolean | ((params: P) => boolean)
}
```

`ViewProps`：

```ts
interface ViewProps<P> {
  instanceId: string
  params: P
  isActive: boolean
  setTitle: (title: string) => void
}
```

- `params` 只允许扁平的 `string | number | boolean`，因为它们要进 URL 和 session。
- `component` 与 `load` 二选一；`load` 用于懒加载。
- `singleton`：同 viewId 只保留一个实例，重复打开更新参数。
- `dedupeParams`（默认 true）：viewId + 参数相同则聚焦已有实例。
- `keepAlive`（默认 true）：切换标签不卸载；预览类视图设为 false。
- `restorable`：为 false 的实例不写入 session；也可以是函数，例如只恢复 workspace 来源的预览。

## 路由

只有两个路由：

```text
/                     Home
/view/$viewId?<参数>   View 标签页
```

- 使用 TanStack Router 的 memory history。
- 标签 store 保存实例；**路由是当前激活标签的唯一事实源**。
- `openView()` 负责参数校验、复用、创建实例与导航；`ensureTab()` 只保证实例存在（深链/恢复）。
- 关闭当前标签会激活相邻标签；没有标签时回到 `/`。
- Home 不进入标签列表。

## 会话恢复

`userData/session.json` 保存 `{ tabs, activeIndex }`，不保存 handle、滚动位置或表单草稿。
启动时丢弃：未知 View、参数非法、`restorable` 为 false、workspace 预览但工作区已不在。

## 深链

`misk://view/tasks.board?filter=todo`

- 主进程只接受 `misk://view/<viewId>`，校验格式后转发。
- 渲染层找不到 View 时 Toast 提示。
- 深链**不携带文件路径**，避免远程链接变成文件读取入口。

## 示例

```ts
ctx.views.register<PreviewParams>({
  id: 'notes.preview',
  title: { key: 'notes.preview', ns: 'notes' },
  component: NotePreview,
  params: z.object({ noteId: z.string() }),
  keepAlive: false,
  restorable: (params) => Boolean(params.noteId)
})
```
