# 生成器

## 命令

```bash
npm run gen:module -- notes
npm run gen:view -- notes.detail --module notes
npm run gen:panel -- notes.outline --module notes
npm run gen:settings -- notes.preferences --module notes
```

`gen:module` 会创建：

```text
src/renderer/src/modules/notes/
├─ index.tsx
├─ NotesView.tsx
└─ locales/{en-US,zh-CN}.json
```

并自动在 `modules/index.ts` 的标记之间插入 import 和 `modules.push(notesModule)`：

```ts
// <generated:imports>
// </generated:imports>
// <generated:modules>
// </generated:modules>
```

新模块的 `index.tsx` 还包含 `// <generated:views>`、`// <generated:panels>`、`// <generated:settings>` 标记；
`gen:view` / `gen:panel` / `gen:settings` 会往对应标记插入注册代码和语言 key。

内置模块没有这些标记，生成器会打印需要手动粘贴的注册片段。

## 移除示例

```bash
npm run eject-demo
```

删除 `modules/tasks`、移除注册，并把 `app.config.json` 的 `features.demo` 置 false。

## 改名

```bash
npm run rename-app -- --name "Acme Desk" --id com.acme.desk --protocol acme
```

更新 `app.config.json` 和 `package.json`（包名 slug）。`electron-builder.config.cjs` 直接读取 `app.config.json`，
所以产品名、appId、协议只需要改一处。改完运行 `npm install` 刷新 lockfile。

## 约定

- 名称只允许 `^[a-z][a-z0-9-]*$`。
- 已存在的文件不会被覆盖。
- 生成器不交互，可在 CI 中运行。
