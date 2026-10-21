const app = require('./app.config.json')

/**
 * Single source of truth for product identity. The renderer/main read the
 * same file through src/shared/app-config.ts, so renaming happens in one place.
 */
module.exports = {
  appId: app.appId,
  productName: app.productName,
  copyright: `Copyright © ${new Date().getFullYear()} ${app.productName} contributors`,
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: ['out/**/*', 'package.json'],
  extraResources: [
    {
      from: 'build/icon.png',
      to: 'icon.png'
    }
  ],
  asar: true,
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  protocols: [
    {
      name: app.productName,
      schemes: [app.protocol]
    }
  ],
  win: {
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    artifactName: '${productName}-Setup-${version}.${ext}',
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: app.productName
  },
  portable: {
    artifactName: '${productName}-Portable-${version}.${ext}'
  },
  mac: {
    icon: 'build/icon.png',
    category: 'public.app-category.productivity',
    target: ['dmg', 'zip']
  },
  linux: {
    icon: 'build/icon.png',
    category: 'Utility',
    target: ['AppImage', 'deb']
  }
}
