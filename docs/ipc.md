# IPC

## 契约

所有 channel、输入/输出 schema 在 `src/shared/ipc/contract.ts`：

```ts
export const ipcContract = {
  'settings:get': { input: z.void(), output: settingsSchema },
  'settings:patch': { input: settingsPatchSchema, output: settingsSchema },
  'files:read': {
    input: z.object({ handle: z.string(), maxBytes: z.number().optional() }),
    output: fileContentSchema
  }
} as const
```

主进程 `registerIpc()` 统一注册：

1. `assertTrustedSender(event)`：sender frame URL 必须是 `app://bundle/` 或开发服务器 URL，且 sender 属于应用窗口。
2. 解析输入 schema；失败返回 `E_INVALID_INPUT`。
3. 调用 handler；异常转为错误信封。
4. 解析输出 schema；失败记日志并返回 `E_INTERNAL`。

## 信封

```ts
type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } }
```

错误码：`E_INVALID_INPUT`、`E_NOT_FOUND`、`E_CANCELED`、`E_PERMISSION`、`E_IO`、`E_CONFLICT`、
`E_UNAVAILABLE`、`E_INTERNAL`。渲染层 `IpcError` 携带 `code`。

## Preload

`window.misk` 按域分组：

```ts
app / window / settings / secrets / storage / session / files /
workspace / menu / notifications / clipboard / theme / diagnostics / log
```

不暴露通用 `invoke(channel, payload)`。所有事件订阅返回 `unsubscribe`。

## 新增 channel

1. 在 `contract.ts` 增加 `input`/`output` schema。
2. 在 `src/main/ipc/register.ts` 增加 `define(...)`。
3. 在 `src/preload/index.ts` 增加命名空间方法。
4. 如需事件，在 `eventSchemas` 增加并在 preload 用 `on` 暴露。

不要绕过 schema；不要在 renderer 直接使用 `ipcRenderer`。

## 文件与工作区

- `files:*` 使用 opaque handle，不接受绝对路径作为读写参数。
- `workspace:*` 使用稳定 `workspaceId` + 相对路径；主进程做 `..`、绝对路径、realpath 逃逸检查。
- 路径只用于展示；深链不接受路径。
