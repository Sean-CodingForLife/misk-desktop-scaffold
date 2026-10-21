import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppInfo } from '../app-info'
import { useDialogStore } from '../dialog/store'
import { useRouteStore } from '../route/store'
import { useSettingsStore } from '../settings/store'
import { useUiStore } from '../ui/store'
import { useWorkspaceStore } from '../workspace/store'
import { buildMenuSections, type MenuSectionModel } from './model'

export function useMenuModel(): MenuSectionModel[] {
  useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const viewId = useRouteStore((state) => state.viewId)
  const viewParams = useRouteStore((state) => state.params)
  const paletteOpen = useUiStore((state) => state.paletteOpen)
  const quickSwitcherOpen = useUiStore((state) => state.quickSwitcherOpen)
  const shortcutsOpen = useUiStore((state) => state.shortcutsOpen)
  const dialogOpen = useDialogStore((state) => state.request !== null)

  return useMemo(
    () =>
      buildMenuSections({
        when: {
          activeViewId: viewId ?? undefined,
          activeViewParams: viewParams,
          workspaceOpen: workspace !== null,
          paletteOpen,
          quickSwitcherOpen,
          modalOpen: shortcutsOpen || dialogOpen
        },
        platform: getAppInfo().platform,
        keybindings: settings.keybindings,
        recent: settings.workspace.recent
      }),
    [
      dialogOpen,
      paletteOpen,
      quickSwitcherOpen,
      settings.keybindings,
      settings.workspace.recent,
      shortcutsOpen,
      viewId,
      viewParams,
      workspace
    ]
  )
}
