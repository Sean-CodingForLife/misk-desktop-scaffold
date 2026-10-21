# FAQ

## 为什么没有内置文档模型？

因为壳不绑定具体业务。文件能力由 `files` 服务提供，模块可以按需实现文本、画布、表格或二进制状态；
壳不强制任何内容生命周期。要做具体编辑器，在模块里实现打开、保存、脏标记和关闭守卫即可。

## 为什么设置不存 localStorage？

localStorage 只属于某个渲染进程的存储分区，无法被主进程、原生菜单、多窗口共享，也没有 schema 和版本升级。
现在主进程持有 `settings.json`，渲染层是镜像。

## 如何加托盘 / 多窗口 / 自动更新？

见 [桌面能力](desktop.md) 的接入配方。这些不在默认实现里，是为了保持脚手架小而完整。

## 为什么 macOS 菜单快捷键在标签后面？

`registerAccelerator` 只有 Windows/Linux 支持。macOS 上如果给 command 菜单项设 accelerator，
会和渲染层 keydown 双触发；因此 macOS 不注册，只把快捷键拼到 label 上。执行仍由渲染层统一处理。

## 支持运行时插件吗？

不支持。扩展在构建期注册，优点是类型安全、可 tree-shake、无沙箱逃逸。需要运行时插件时，
可以在 `ModuleRegistry` 之上加一个加载源（ESM 或 utilityProcess 隔离），但那是另一个项目级决定。

## 为什么 `npm run e2e` 起不来？

- 先 `npm run build`。
- Windows 上确认没有 `ELECTRON_RUN_AS_NODE=1`，否则 Electron 以 Node 模式启动。
- 检查 `node_modules/electron/dist/electron.exe` 是否存在；缺了就 `npm run postinstall`。

## 如何改产品名 / appId / 协议？

```bash
npm run rename-app -- --name "Acme Desk" --id com.acme.desk --protocol acme
```

然后 `npm install` 刷新 lockfile，重新 build。

## 如何删除示例？

```bash
npm run eject-demo
```

## 数据存哪里？

- 设置：`userData/settings.json`
- 会话：`userData/session.json`
- 模块数据：`userData/storage/*.json`
- 窗口状态：`userData/window-state.json`
- 日志：`app.getPath('logs')/main.log`
- 密钥：`userData/secrets.json`（safeStorage 加密）

菜单 **Settings → Advanced → Open log folder** 可直接打开日志目录。
