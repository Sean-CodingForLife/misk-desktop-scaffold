# 发布

## 打包

```bash
npm run package:win     # NSIS + portable
npm run package:mac     # dmg + zip
npm run package:linux   # AppImage + deb
```

`electron-builder.config.cjs` 从 `app.config.json` 读取产品名、appId、协议，输出到 `dist/`。
图标：`build/icon.png`（1024）为源；Windows 用 `build/icon.ico`，macOS/Linux 由 builder 从 PNG 转换。

## 签名 / 公证

仓库默认不签名。接入时在 CI 配置：

- Windows：`CSC_LINK` / `CSC_KEY_PASSWORD`（或证书存储）。
- macOS：`CSC_LINK` / `CSC_KEY_PASSWORD` + `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`
  （electron-builder notarize）。
- 不签名时设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`，避免 CI 查找本机证书。

## CI

`.github/workflows/ci.yml`：

- `verify`：ubuntu + windows；lint → typecheck → coverage → build。
- `e2e`：windows；build → Playwright Electron。

`.github/workflows/release.yml`：

- 推送 `v*` tag 触发；三平台矩阵打包并上传 GitHub Release。
- 默认未签名；需要签名时补充 secrets。
- 不包含自动更新 feed；接入方式见 [桌面能力](desktop.md)。

## 版本

- `package.json` 版本与 `app.config.json` 产品信息分开：前者是应用版本，后者是身份。
- 发版前更新 `CHANGELOG.md`，打 tag；`app.getVersion()` 读取 package.json。
