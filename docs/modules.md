# 模块

模块是业务的唯一入口，构建期注册，类型安全，可被 tree-shake。没有运行时插件加载。

## 定义

```ts
import { defineModule } from '@renderer/core/modules/types'

export const notesModule = defineModule({
  id: 'notes',
  name: { key: 'module.notes.name', ns: 'notes', fallback: 'Notes' },
  dependsOn: ['core'],
  activate: (ctx) => {
    ctx.i18n.add('en-US', 'notes', en)
    ctx.views.register({ id: 'notes.main', title: { key: 'notes.main.title', ns: 'notes' }, component: NotesView })
    ctx.commands.register({
      id: 'notes.open',
      title: { key: 'notes.open', ns: 'notes' },
      run: (runtime) => runtime.openView('notes.main')
    })
    ctx.menus.add('view', { command: 'notes.open', order: 80 })
  }
})
```

把模块加进 `src/renderer/src/modules/index.ts` 的 `getModules()`；生成器会自动完成这一步。

## 生命周期

- `activateModules()` 按 `dependsOn` 拓扑排序；检测重复 id、缺失依赖、环。
- 每个模块的注册都包在 `track(disposable)` 中；激活失败会逆序 dispose 已注册项，记录状态。
- 激活失败不影响其他模块；Home 的模块列表显示状态，失败项标红。
- 模块在 React 渲染前激活；需要异步准备（读存储、升级）时可以 `async activate`，启动会等待。

## 扩展点

| 扩展点 | 方法 | 说明 |
| --- | --- | --- |
| View | `ctx.views.register(def)` | 标签页内容，见 [View](views-router.md) |
| Command | `ctx.commands.register(cmd)` | 命令面板/快捷键/菜单动作 |
| Panel | `ctx.panels.register(panel)` | 活动栏 + 侧边栏 |
| Status | `ctx.status.register(item)` | 状态栏片段 |
| Settings | `ctx.settings.register(section)` | 设置页分区 |
| Menu | `ctx.menus.add(menuId, item)` | File/Edit/View/Window/Help |
| Home | `ctx.home.set(component)` | 替换 Home 页 |
| i18n | `ctx.i18n.add(locale, ns, messages)` | 语言包（同时镜像到 core namespace） |
| 通知 | `ctx.notifications.notify(...)` | 应用内 Toast |
| 日志 | `ctx.logger.*` | 主进程日志文件 |
| 应用信息 | `ctx.app` | 版本、平台、路径、locale |

## id 约定

- 模块 id：`^[a-z][a-z0-9-]*$`，例如 `notes`。
- View / Command / Panel / Settings id 必须带模块前缀，允许 camelCase：
  `notes.main`、`view.commandPalette`、`workspace.openFolder`。
- 重复 id 打印警告并忽略，不覆盖已有实现。

## 模块间协作

优先通过 `runtime.executeCommand(id, args)` 调用其他模块的命令；不要直接 import 其他模块的实现。
需要共享状态时，用 `storage` 服务 + 模块自己的 schema，或注册一个显式命令作为 API。
