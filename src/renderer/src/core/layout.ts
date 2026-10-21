import { defaultSettings } from '@shared/settings/schema'
import { useSettingsStore } from './settings/store'

export function toggleSidebar(panelId?: string): void {
  const layout = useSettingsStore.getState().settings.layout
  if (panelId) {
    if (layout.sidebarOpen && layout.sidebarPanel === panelId) {
      void useSettingsStore.getState().patch({ layout: { sidebarOpen: false } })
      return
    }
    void useSettingsStore.getState().patch({ layout: { sidebarOpen: true, sidebarPanel: panelId } })
    return
  }
  void useSettingsStore.getState().patch({ layout: { sidebarOpen: !layout.sidebarOpen } })
}

export function showPanel(panelId: string): void {
  void useSettingsStore.getState().patch({ layout: { sidebarOpen: true, sidebarPanel: panelId } })
}

export function setSidebarWidth(width: number): void {
  void useSettingsStore.getState().patch({ layout: { sidebarWidth: width } })
}

export function resetLayout(): void {
  void useSettingsStore.getState().patch({
    layout: {
      sidebarOpen: defaultSettings.layout.sidebarOpen,
      sidebarWidth: defaultSettings.layout.sidebarWidth,
      sidebarPanel: defaultSettings.layout.sidebarPanel
    }
  })
}
