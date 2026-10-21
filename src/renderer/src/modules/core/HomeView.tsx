import { getAppInfo } from '@renderer/core/app-info'
import { commandRegistry } from '@renderer/core/commands/registry'
import { useLocalize } from '@renderer/core/i18n'
import { moduleStatuses } from '@renderer/core/modules/types'
import { openView } from '@renderer/core/navigation'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useUiStore } from '@renderer/core/ui/store'
import { cn } from '@renderer/core/utils'
import { viewRegistry } from '@renderer/core/views/registry'
import { useWorkspaceStore } from '@renderer/core/workspace/store'
import { Button } from '@renderer/shell/ui/primitives'
import { formatKeybinding } from '@shared/keybindings'
import {
  ArrowRight,
  Command,
  FolderOpen,
  Layers,
  ListChecks,
  Plus,
  Settings,
  Sparkles
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function HomeView() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const info = getAppInfo()
  const settings = useSettingsStore((state) => state.settings)
  const patch = useSettingsStore((state) => state.patch)
  const openWorkspace = useWorkspaceStore((state) => state.openDialog)
  const openRecent = useWorkspaceStore((state) => state.openRecent)
  const openPalette = useUiStore((state) => state.openPalette)
  const recent = settings.workspace.recent
  const hasTasks = Boolean(viewRegistry.get('tasks.board'))

  const removeRecent = (id: string): void => {
    void patch({
      workspace: {
        recent: recent.filter((item) => item.id !== id),
        lastId: settings.workspace.lastId === id ? null : settings.workspace.lastId
      }
    })
  }

  return (
    <div className="home">
      <div className="home-hero">
        <span className="home-mark">{info.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
        </div>
      </div>

      <div className="home-actions">
        <Button variant="primary" size="lg" onClick={() => void openWorkspace()}>
          <FolderOpen size={16} />
          {t('home.openWorkspace')}
        </Button>
        <Button size="lg" onClick={openPalette}>
          <Command size={16} />
          {t('home.commandPalette')}
        </Button>
        {hasTasks ? (
          <Button size="lg" onClick={() => openView('tasks.board')}>
            <Plus size={16} />
            {t('home.newTask')}
          </Button>
        ) : null}
        <Button size="lg" variant="ghost" onClick={() => openView('core.settings')}>
          <Settings size={16} />
          {t('home.settings')}
        </Button>
      </div>

      <p className="home-hint">
        {t('home.shortcuts', {
          shortcut: formatKeybinding('Mod+Shift+P', info.platform)
        })}
      </p>

      <div className="home-grid">
        <section className="home-card">
          <div className="home-card-heading">
            <Layers size={15} />
            <h2>{t('home.recent')}</h2>
          </div>
          {recent.length === 0 ? (
            <p className="panel-empty">{t('home.noRecent')}</p>
          ) : (
            <ul className="recent-list">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="recent-item"
                    onClick={() => void openRecent(item.id)}
                    title={item.path}
                  >
                    <FolderOpen size={14} />
                    <span className="recent-name">{item.name}</span>
                    <span className="recent-path">{item.path}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('home.removeRecent')}
                    title={t('home.removeRecent')}
                    onClick={() => removeRecent(item.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-heading">
            <Sparkles size={15} />
            <h2>{t('home.getStarted')}</h2>
          </div>
          <div className="home-stats">
            <div>
              <strong>{moduleStatuses.filter((module) => module.ok).length}</strong>
              <span>{t('home.modules')}</span>
            </div>
            <div>
              <strong>{viewRegistry.list().length}</strong>
              <span>{t('home.views')}</span>
            </div>
            <div>
              <strong>{commandRegistry.list().length}</strong>
              <span>{t('home.commands')}</span>
            </div>
          </div>
          <p className="panel-hint">{t('home.modulesHint')}</p>
          <div className="home-modules">
            {moduleStatuses.map((module) => (
              <div className={cn('home-module', !module.ok && 'failed')} key={module.id}>
                <span className="home-module-dot" />
                <span>{localize(module.name)}</span>
                <small>{module.id}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="home-card home-card-wide">
          <div className="home-card-heading">
            <ListChecks size={15} />
            <h2>{t('home.workspace')}</h2>
          </div>
          <div className="home-quick">
            <button type="button" onClick={() => openView('core.settings')}>
              <Settings size={16} />
              <span>{t('settings.title')}</span>
              <ArrowRight size={14} />
            </button>
            <button type="button" onClick={openPalette}>
              <Command size={16} />
              <span>{t('menu.commandPalette')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
