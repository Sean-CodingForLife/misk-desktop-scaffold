import { getAppInfo } from '@renderer/core/app-info'
import { navigateHome } from '@renderer/core/navigation'
import { useUiStore } from '@renderer/core/ui/store'
import { useResolvedTheme } from '@renderer/shell/theme/ThemeProvider'
import { Kbd } from '@renderer/shell/ui/primitives'
import { formatKeybinding } from '@shared/keybindings'
import { Copy, Minus, Moon, Search, Square, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo } from './Logo'
import { MenuBar } from './MenuBar'

export function TitleBar() {
  const { t } = useTranslation()
  const info = getAppInfo()
  const isMac = info.platform === 'darwin'
  const theme = useResolvedTheme()
  const openPalette = useUiStore((state) => state.openPalette)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.misk.window.isMaximized().then(setMaximized)
    return window.misk.window.onMaximized(setMaximized)
  }, [])

  const toggleMaximize = (): void => {
    void window.misk.window.toggleMaximize().then(setMaximized)
  }

  const toggleTheme = (): void => {
    void window.misk.settings.patch({
      appearance: { theme: theme === 'dark' ? 'light' : 'dark' }
    })
  }

  return (
    <header className={`titlebar${isMac ? ' titlebar-mac' : ''}`}>
      <div
        className="titlebar-drag"
        onDoubleClick={isMac ? undefined : toggleMaximize}
        aria-hidden="true"
      />

      <div className="titlebar-left">
        <button type="button" className="brand no-drag" onClick={navigateHome} title={info.name}>
          <Logo size={20} />
          <span className="brand-name">{info.name}</span>
        </button>
        {isMac ? null : <MenuBar />}
      </div>

      <div className="titlebar-center">
        <button type="button" className="command-center no-drag" onClick={openPalette}>
          <Search size={13} />
          <span>{t('titlebar.commandCenter')}</span>
          <Kbd>{formatKeybinding('Mod+Shift+P', info.platform)}</Kbd>
        </button>
      </div>

      <div className="titlebar-right no-drag">
        <button
          type="button"
          className="titlebar-icon"
          title={t('titlebar.toggleTheme')}
          aria-label={t('titlebar.toggleTheme')}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {isMac ? null : (
          <div className="window-controls">
            <button
              type="button"
              className="window-btn"
              title={t('window.minimize')}
              aria-label={t('window.minimize')}
              onClick={() => void window.misk.window.minimize()}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              className="window-btn"
              title={maximized ? t('window.restore') : t('window.maximize')}
              aria-label={maximized ? t('window.restore') : t('window.maximize')}
              onClick={toggleMaximize}
            >
              {maximized ? <Copy size={12} /> : <Square size={11} />}
            </button>
            <button
              type="button"
              className="window-btn close"
              title={t('window.close')}
              aria-label={t('window.close')}
              onClick={() => void window.misk.window.close()}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
