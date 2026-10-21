import { useLocalize } from '@renderer/core/i18n'
import { activateTab, closeTab } from '@renderer/core/navigation'
import { useRouteStore } from '@renderer/core/route/store'
import { useTabsStore } from '@renderer/core/tabs/store'
import { cn } from '@renderer/core/utils'
import { viewRegistry } from '@renderer/core/views/registry'
import { FileText, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function TabStrip() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const tabs = useTabsStore((state) => state.tabs)
  const activeKey = useRouteStore((state) => state.key)
  const reorder = useTabsStore((state) => state.reorder)

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="tab-bar">
      <div className="tab-strip" role="tablist" aria-label={t('activity.panels')}>
        {tabs.map((tab, index) => {
          const definition = viewRegistry.get(tab.viewId)
          const Icon = definition?.icon ?? FileText
          const active =
            activeKey ===
            `${tab.viewId}?${Object.keys(tab.params)
              .filter((key) => tab.params[key] !== undefined)
              .sort()
              .map(
                (key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(tab.params[key]))}`
              )
              .join('&')}`
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              draggable
              className={cn('tab', active && 'active')}
              title={localize(definition?.title) || tab.title}
              onClick={() => activateTab(tab)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  activateTab(tab)
                } else if (event.key === 'Delete') {
                  event.preventDefault()
                  closeTab(tab.id)
                }
              }}
              onAuxClick={(event) => {
                if (event.button === 1) {
                  closeTab(tab.id)
                }
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/misk-tab', String(index))
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const from = Number(event.dataTransfer.getData('text/misk-tab'))
                if (Number.isFinite(from)) {
                  reorder(from, index)
                }
              }}
            >
              <Icon size={13} strokeWidth={1.9} className="tab-icon" />
              <span className="tab-title">{tab.title}</span>
              <button
                type="button"
                className="tab-close"
                title={t('tab.close')}
                aria-label={t('tab.close')}
                onClick={(event) => {
                  event.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
