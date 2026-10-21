import { i18n } from '@renderer/core/i18n'
import { updateTabTitle } from '@renderer/core/navigation'
import { tabKey, useRouteStore } from '@renderer/core/route/store'
import { useTabsStore } from '@renderer/core/tabs/store'
import type { TabInstance, ViewProps } from '@renderer/core/types'
import { useUiStore } from '@renderer/core/ui/store'
import { viewRegistry } from '@renderer/core/views/registry'
import { Button, EmptyState, Spinner } from '@renderer/shell/ui/primitives'
import { AlertTriangle } from 'lucide-react'
import { Component, type ComponentType, type ReactNode, Suspense, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface BoundaryProps {
  children: ReactNode
  tabId: string
}

interface BoundaryState {
  error: Error | null
}

class ViewErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('[view] crashed', error)
  }

  componentDidUpdate(previous: BoundaryProps): void {
    if (previous.tabId !== this.props.tabId && this.state.error) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="view-error">
          <AlertTriangle size={22} />
          <h2>{i18n.t('error.viewTitle')}</h2>
          <p>{i18n.t('error.viewMessage')}</p>
          <code>{this.state.error.message}</code>
          <Button onClick={() => this.setState({ error: null })}>{i18n.t('error.reload')}</Button>
        </div>
      )
    }
    return this.props.children
  }
}

function ViewPane({ tab, active }: { tab: TabInstance; active: boolean }) {
  const { t } = useTranslation()
  const setTitle = useCallback((title: string) => updateTabTitle(tab.id, title), [tab.id])
  const definition = viewRegistry.get(tab.viewId)
  if (!definition) {
    return (
      <div className="view-pane active">
        <div className="view-error">
          <AlertTriangle size={22} />
          <h2>{t('error.unknownView')}</h2>
          <code>{tab.viewId}</code>
        </div>
      </div>
    )
  }
  const parsed = viewRegistry.parseParams(definition, tab.params)
  if (!parsed.ok || !parsed.params) {
    return (
      <div className="view-pane active">
        <div className="view-error">
          <AlertTriangle size={22} />
          <h2>{t('error.invalidParams')}</h2>
          <code>{parsed.error}</code>
        </div>
      </div>
    )
  }
  const Component = viewRegistry.componentFor(definition)
  if (!Component) {
    return null
  }
  const keepAlive = definition.keepAlive !== false
  if (!active && !keepAlive) {
    return null
  }
  const View = Component as ComponentType<ViewProps>
  return (
    <div className="view-pane" style={{ display: active ? 'flex' : 'none' }}>
      <ViewErrorBoundary tabId={tab.id}>
        <Suspense
          fallback={
            <div className="view-loading">
              <Spinner label={t('common.loading')} />
            </div>
          }
        >
          <View instanceId={tab.id} params={parsed.params} isActive={active} setTitle={setTitle} />
        </Suspense>
      </ViewErrorBoundary>
    </div>
  )
}

export function ViewStack() {
  const { t } = useTranslation()
  const tabs = useTabsStore((state) => state.tabs)
  const activeKey = useRouteStore((state) => state.key)
  const openPalette = useUiStore((state) => state.openPalette)
  const hasActive = tabs.some((tab) => tabKey(tab.viewId, tab.params) === activeKey)

  if (!hasActive && tabs.length === 0) {
    return (
      <div className="view-stack">
        <EmptyState
          title={t('home.title')}
          description={t('home.subtitle')}
          action={<Button onClick={openPalette}>{t('home.commandPalette')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="view-stack">
      {tabs.map((tab) => (
        <ViewPane key={tab.id} tab={tab} active={activeKey === tabKey(tab.viewId, tab.params)} />
      ))}
    </div>
  )
}
