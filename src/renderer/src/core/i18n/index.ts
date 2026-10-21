import { createInstance } from 'i18next'
import { useCallback } from 'react'
import { initReactI18next, useTranslation } from 'react-i18next'
import type { LocalizedText, TextDirection } from '../types'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'

export const SUPPORTED_LOCALES = [
  { code: 'en-US', name: 'English' },
  { code: 'zh-CN', name: '简体中文' }
] as const

export const i18n = createInstance()

export function resolveLocale(input: string | undefined): string {
  if (!input) {
    return 'en-US'
  }
  const exact = SUPPORTED_LOCALES.find((locale) => locale.code === input)
  if (exact) {
    return exact.code
  }
  const lower = input.toLowerCase()
  const caseInsensitive = SUPPORTED_LOCALES.find((locale) => locale.code.toLowerCase() === lower)
  if (caseInsensitive) {
    return caseInsensitive.code
  }
  const base = lower.split('-')[0]
  return (
    SUPPORTED_LOCALES.find((locale) => locale.code.toLowerCase().split('-')[0] === base)?.code ??
    'en-US'
  )
}

export async function initI18n(locale: string): Promise<void> {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(resolveLocale(locale))
    return
  }
  await i18n.use(initReactI18next).init({
    resources: {
      'en-US': { core: enUS },
      'zh-CN': { core: zhCN }
    },
    lng: resolveLocale(locale),
    fallbackLng: 'en-US',
    defaultNS: 'core',
    interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
    returnNull: false
  })
}

export function addModuleResources(
  locale: string,
  namespace: string,
  messages: Record<string, string>
): void {
  i18n.addResourceBundle(locale, namespace, messages, true, true)
}

export function directionFor(locale: string): TextDirection {
  return ['ar', 'fa', 'he', 'ur', 'yi'].includes(locale.toLowerCase().split('-')[0] ?? '')
    ? 'rtl'
    : 'ltr'
}

export function translateText(text: LocalizedText | undefined, fallback?: string): string {
  if (text === undefined) {
    return fallback ?? ''
  }
  if (typeof text === 'string') {
    return text
  }
  const namespace = text.ns ?? 'core'
  const defaultValue = text.fallback ?? fallback ?? text.key
  if (!i18n.exists(text.key, { ns: namespace })) {
    return defaultValue
  }
  return String(i18n.t(text.key, { ns: namespace, defaultValue }))
}

export function useLocalize(): (text: LocalizedText | undefined, fallback?: string) => string {
  useTranslation()
  return useCallback((text: LocalizedText | undefined, fallback?: string) => {
    return translateText(text, fallback)
  }, [])
}

export function formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(i18n.language, options).format(value)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(i18n.language, options).format(value)
}
