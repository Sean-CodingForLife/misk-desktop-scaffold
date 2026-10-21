import { getAppInfo } from '@renderer/core/app-info'
import { bindingFor, conflictsFor } from '@renderer/core/commands/bindings'
import { commandRegistry } from '@renderer/core/commands/registry'
import { useDialogStore } from '@renderer/core/dialog/store'
import { SUPPORTED_LOCALES, useLocalize } from '@renderer/core/i18n'
import { moduleStatuses } from '@renderer/core/modules/types'
import { panelRegistry } from '@renderer/core/panels/registry'
import { useSettingsStore } from '@renderer/core/settings/store'
import { notify } from '@renderer/core/toast/store'
import { useUiStore } from '@renderer/core/ui/store'
import { cn } from '@renderer/core/utils'
import { viewRegistry } from '@renderer/core/views/registry'
import { Button, Field, Input, Select } from '@renderer/shell/ui/primitives'
import { Switch } from '@renderer/shell/ui/Switch'
import { bindingFromEvent, formatKeybinding } from '@shared/keybindings'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ACCENTS = ['violet', 'cyan', 'emerald', 'amber', 'rose'] as const
const ACCENT_KEYS = {
  violet: 'settings.accentViolet',
  cyan: 'settings.accentCyan',
  emerald: 'settings.accentEmerald',
  amber: 'settings.accentAmber',
  rose: 'settings.accentRose'
} as const

export function AppearanceSection() {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)

  return (
    <div className="settings-fields">
      <Field label={t('settings.theme')} htmlFor="settings-theme">
        <Select
          id="settings-theme"
          value={settings.appearance.theme}
          onChange={(event) =>
            void patch({ appearance: { theme: event.target.value as 'system' | 'light' | 'dark' } })
          }
        >
          <option value="system">{t('settings.themeSystem')}</option>
          <option value="light">{t('settings.themeLight')}</option>
          <option value="dark">{t('settings.themeDark')}</option>
        </Select>
      </Field>

      <Field label={t('settings.accent')}>
        <div className="accent-row" role="group" aria-label={t('settings.accent')}>
          {ACCENTS.map((accent) => (
            <button
              type="button"
              key={accent}
              className={cn(
                'swatch',
                `swatch-${accent}`,
                settings.appearance.accent === accent && 'active'
              )}
              title={t(ACCENT_KEYS[accent])}
              aria-label={t(ACCENT_KEYS[accent])}
              aria-pressed={settings.appearance.accent === accent}
              onClick={() => void patch({ appearance: { accent } })}
            />
          ))}
        </div>
      </Field>

      <Field label={t('settings.density')} htmlFor="settings-density">
        <Select
          id="settings-density"
          value={settings.appearance.density}
          onChange={(event) =>
            void patch({ appearance: { density: event.target.value as 'comfortable' | 'compact' } })
          }
        >
          <option value="comfortable">{t('settings.densityComfortable')}</option>
          <option value="compact">{t('settings.densityCompact')}</option>
        </Select>
      </Field>

      <Field label={t('settings.reduceMotion')}>
        <Switch
          checked={settings.appearance.reduceMotion}
          onCheckedChange={(checked) => void patch({ appearance: { reduceMotion: checked } })}
          label={t('settings.reduceMotion')}
        />
      </Field>
    </div>
  )
}

export function LanguageSection() {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)

  return (
    <div className="settings-fields">
      <div className="language-list">
        {SUPPORTED_LOCALES.map((locale) => (
          <button
            type="button"
            key={locale.code}
            className={cn('settings-action', settings.locale === locale.code && 'active')}
            onClick={() => void patch({ locale: locale.code })}
          >
            <span>{locale.name}</span>
            {settings.locale === locale.code ? <span className="settings-check">✓</span> : null}
          </button>
        ))}
      </div>
      <p className="panel-hint">{t('settings.languageHint')}</p>
    </div>
  )
}

export function KeybindingsSection() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)
  const info = getAppInfo()
  const [query, setQuery] = useState('')
  const [recording, setRecording] = useState<string | null>(null)
  const commands = commandRegistry.list()
  const conflicts = useMemo(
    () => conflictsFor(commands, settings.keybindings, info.platform),
    [commands, info.platform, settings.keybindings]
  )

  useEffect(() => {
    useUiStore.getState().setKeybindingRecording(recording !== null)
    return () => useUiStore.getState().setKeybindingRecording(false)
  }, [recording])

  useEffect(() => {
    if (!recording) {
      return
    }
    const handler = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'Escape') {
        setRecording(null)
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        void patch({ keybindings: { ...settings.keybindings, [recording]: null } })
        setRecording(null)
        return
      }
      const binding = bindingFromEvent(event, info.platform)
      if (binding) {
        void patch({ keybindings: { ...settings.keybindings, [recording]: binding } })
        setRecording(null)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [info.platform, patch, recording, settings.keybindings])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return commands
      .map((command) => ({
        id: command.id,
        title: localize(command.title),
        category: localize(command.category)
      }))
      .filter(
        (row) => !needle || row.title.toLowerCase().includes(needle) || row.id.includes(needle)
      )
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [commands, localize, query])

  return (
    <div className="settings-fields">
      <div className="settings-inline">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('common.search')}
          aria-label={t('common.search')}
        />
        <Button onClick={() => void patch({ keybindings: {} })}>
          {t('settings.keybindingsReset')}
        </Button>
      </div>
      <p className="panel-hint">{t('settings.keybindingsHint')}</p>
      <div className="keybinding-list">
        {rows.map((row) => {
          const command = commandRegistry.get(row.id)
          const binding = command ? bindingFor(command, settings.keybindings) : null
          const conflictIds = conflicts.get(row.id) ?? []
          return (
            <div className="keybinding-row" key={row.id}>
              <div className="keybinding-text">
                <span>{row.title}</span>
                <small>{row.category || row.id}</small>
                {conflictIds.length > 0 ? (
                  <em className="keybinding-conflict">
                    {t('settings.keybindingsConflict', {
                      command: conflictIds
                        .map((id) => {
                          const other = commandRegistry.get(id)
                          return other ? localize(other.title) : id
                        })
                        .join(', ')
                    })}
                  </em>
                ) : null}
              </div>
              <button
                type="button"
                className={cn('keybinding-button', recording === row.id && 'recording')}
                onClick={() => setRecording(recording === row.id ? null : row.id)}
              >
                {recording === row.id
                  ? t('settings.keybindingsRecord')
                  : binding
                    ? formatKeybinding(binding, info.platform)
                    : t('common.none')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WorkspaceSection() {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)
  const recent = settings.workspace.recent

  return (
    <div className="settings-fields">
      <Field label={t('settings.showHidden')}>
        <Switch
          checked={settings.workspace.showHidden}
          onCheckedChange={(checked) => void patch({ workspace: { showHidden: checked } })}
          label={t('settings.showHidden')}
        />
      </Field>
      <div className="field">
        <div className="field-text">
          <span className="field-label">{t('settings.recent')}</span>
        </div>
        <div className="field-control field-control-wide">
          {recent.length === 0 ? (
            <p className="panel-empty">{t('home.noRecent')}</p>
          ) : (
            <ul className="recent-list settings-recent">
              {recent.map((item) => (
                <li key={item.id}>
                  <span className="recent-name" title={item.path}>
                    {item.name}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('common.remove')}
                    title={t('common.remove')}
                    onClick={() =>
                      void patch({
                        workspace: {
                          recent: recent.filter((entry) => entry.id !== item.id),
                          lastId:
                            settings.workspace.lastId === item.id ? null : settings.workspace.lastId
                        }
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            onClick={() => void patch({ workspace: { recent: [], lastId: null } })}
            disabled={recent.length === 0}
          >
            {t('settings.clearRecent')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AdvancedSection() {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)
  const info = getAppInfo()

  const snapshot = () => ({
    modules: moduleStatuses,
    views: viewRegistry.list().map((view) => view.id),
    commands: commandRegistry.list().map((command) => command.id),
    panels: panelRegistry.list().map((panel) => panel.id)
  })

  const exportSettings = async (): Promise<void> => {
    const result = await window.misk.settings.export()
    if (!result.canceled && result.path) {
      notify(t('toast.exported', { path: result.path }), 'success')
    }
  }

  const importSettings = async (): Promise<void> => {
    try {
      const result = await window.misk.settings.import()
      if (!result.canceled) {
        if (result.settings) {
          useSettingsStore.getState().set(result.settings)
        }
        notify(t('toast.settingsImported'), 'success')
      }
    } catch (error) {
      notify(
        t('toast.settingsFailed', {
          message: error instanceof Error ? error.message : String(error)
        }),
        'error'
      )
    }
  }

  const exportDiagnostics = async (): Promise<void> => {
    const result = await window.misk.diagnostics.export(snapshot())
    if (!result.canceled && result.path) {
      notify(t('toast.diagnosticsSaved', { path: result.path }), 'success')
    }
  }

  const resetAll = async (): Promise<void> => {
    const confirmed = await useDialogStore.getState().confirm({
      title: t('settings.resetAll'),
      message: t('settings.resetMessage'),
      confirmLabel: t('common.reset'),
      danger: true
    })
    if (!confirmed) {
      return
    }
    await useSettingsStore.getState().reset()
    notify(t('toast.reset'), 'success')
  }

  return (
    <div className="settings-fields">
      <Field label={t('settings.logLevel')} htmlFor="settings-log-level">
        <Select
          id="settings-log-level"
          value={settings.advanced.logLevel}
          onChange={(event) =>
            void patch({
              advanced: { logLevel: event.target.value as 'error' | 'warn' | 'info' | 'debug' }
            })
          }
        >
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="info">info</option>
          <option value="debug">debug</option>
        </Select>
      </Field>

      <div className="settings-actions">
        <Button onClick={() => void window.misk.app.openLogs()}>{t('settings.openLogs')}</Button>
        <Button onClick={() => void exportSettings()}>{t('settings.export')}</Button>
        <Button onClick={() => void importSettings()}>{t('settings.import')}</Button>
        <Button onClick={() => void exportDiagnostics()}>{t('settings.diagnostics')}</Button>
        <Button variant="danger" onClick={() => void resetAll()}>
          {t('settings.resetAll')}
        </Button>
      </div>

      <p className="panel-hint">
        {info.userDataPath} · {info.logsPath}
      </p>
    </div>
  )
}

export function AboutSection() {
  const { t } = useTranslation()
  const info = getAppInfo()

  return (
    <div className="settings-fields">
      <div className="about-hero">
        <span className="about-logo">{info.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h3>{info.name}</h3>
          <p>v{info.version}</p>
        </div>
      </div>
      <div className="about-grid">
        <div>
          <span>{t('settings.version')}</span>
          <strong>{info.version}</strong>
        </div>
        <div>
          <span>{t('settings.electron')}</span>
          <strong>{info.electron}</strong>
        </div>
        <div>
          <span>{t('settings.chromium')}</span>
          <strong>{info.chrome}</strong>
        </div>
        <div>
          <span>{t('settings.node')}</span>
          <strong>{info.node}</strong>
        </div>
        <div>
          <span>{t('settings.license')}</span>
          <strong>MIT</strong>
        </div>
      </div>
      <div className="settings-actions">
        <Button onClick={() => void window.misk.app.openExternal(info.repository)}>
          {t('settings.repository')}
        </Button>
      </div>
    </div>
  )
}
