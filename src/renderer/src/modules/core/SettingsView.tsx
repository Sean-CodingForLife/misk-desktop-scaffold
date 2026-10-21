import { useLocalize } from '@renderer/core/i18n'
import { settingsSectionRegistry } from '@renderer/core/settings/sections'
import type { ViewParams, ViewProps } from '@renderer/core/types'
import { Input } from '@renderer/shell/ui/primitives'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface SettingsParams extends ViewParams {
  section?: string
}

export function SettingsView({ params }: ViewProps<SettingsParams>) {
  const { t } = useTranslation()
  const localize = useLocalize()
  const sections = settingsSectionRegistry.list()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(params.section ?? sections[0]?.id ?? '')

  useEffect(() => {
    if (params.section && params.section !== activeId) {
      setActiveId(params.section)
    }
  }, [activeId, params.section])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return sections
    }
    return sections.filter((section) => {
      const title = localize(section.title).toLowerCase()
      return (
        title.includes(needle) ||
        section.id.includes(needle) ||
        (section.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(needle))
      )
    })
  }, [localize, query, sections])

  const active = sections.find((section) => section.id === activeId) ?? filtered[0] ?? sections[0]
  const ActiveComponent = active?.component

  return (
    <div className="settings-view">
      <aside className="settings-nav">
        <div className="settings-search">
          <Search size={14} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('settings.search')}
            aria-label={t('settings.search')}
          />
        </div>
        <nav aria-label={t('settings.title')}>
          {filtered.map((section) => (
            <button
              type="button"
              key={section.id}
              className={
                section.id === active?.id ? 'settings-nav-item active' : 'settings-nav-item'
              }
              onClick={() => setActiveId(section.id)}
            >
              {localize(section.title)}
            </button>
          ))}
          {filtered.length === 0 ? <p className="panel-empty">{t('settings.noResults')}</p> : null}
        </nav>
      </aside>
      <div className="settings-body">
        {ActiveComponent ? (
          <section className="settings-section">
            <h2>{localize(active?.title)}</h2>
            <ActiveComponent />
          </section>
        ) : (
          <p className="panel-empty">{t('settings.noResults')}</p>
        )}
      </div>
    </div>
  )
}
