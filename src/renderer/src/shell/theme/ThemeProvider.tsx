import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { directionFor, i18n } from '../../core/i18n'
import { useSettingsStore } from '../../core/settings/store'
import type { ResolvedTheme } from '../../core/types'

const ThemeContext = createContext<ResolvedTheme>('dark')

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSettingsStore((state) => state.settings)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent): void => setSystemDark(event.matches)
    query.addEventListener('change', listener)
    const unsubscribe = window.misk.theme.onSystemChanged(({ shouldUseDarkColors }) => {
      setSystemDark(shouldUseDarkColors)
    })
    return () => {
      query.removeEventListener('change', listener)
      unsubscribe()
    }
  }, [])

  const resolved: ResolvedTheme =
    settings.appearance.theme === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : settings.appearance.theme

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolved
    root.dataset.accent = settings.appearance.accent
    root.dataset.density = settings.appearance.density
    root.dataset.reduceMotion = String(settings.appearance.reduceMotion)
    root.style.colorScheme = resolved
    root.lang = settings.locale
    root.dir = directionFor(settings.locale)
    void i18n.changeLanguage(settings.locale)
  }, [resolved, settings])

  const value = useMemo(() => resolved, [resolved])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useResolvedTheme(): ResolvedTheme {
  return useContext(ThemeContext)
}
