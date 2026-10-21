import { i18n } from '@renderer/core/i18n'
import { defineModule } from '@renderer/core/modules/types'
import { useSettingsStore } from '@renderer/core/settings/store'
import { FileText, FolderOpen } from 'lucide-react'
import { z } from 'zod'
import { FilePreviewView, previewParamsSchema } from './FilePreviewView'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'
import { WorkspacePanel } from './WorkspacePanel'

const pathArgs = z.object({ path: z.string().min(1) })

export const workspaceModule = defineModule({
  id: 'workspace',
  name: { key: 'module.workspace.name', ns: 'workspace', fallback: 'Workspace' },
  description: {
    key: 'module.workspace.description',
    ns: 'workspace',
    fallback: 'Folders, file tree, watcher and preview.'
  },
  activate: (ctx) => {
    ctx.i18n.add('en-US', 'workspace', enUS)
    ctx.i18n.add('zh-CN', 'workspace', zhCN)

    ctx.panels.register({
      id: 'workspace.files',
      title: { key: 'panel.workspace.files', ns: 'workspace' },
      icon: FolderOpen,
      order: 0,
      component: WorkspacePanel
    })

    ctx.views.register({
      id: 'workspace.preview',
      title: { key: 'workspace.preview', ns: 'workspace' },
      icon: FileText,
      component: FilePreviewView,
      params: previewParamsSchema,
      keepAlive: false,
      restorable: (params) => params.source === 'workspace'
    })

    ctx.commands.register({
      id: 'workspace.openFolder',
      title: { key: 'workspace.commandOpen', ns: 'workspace' },
      category: { key: 'menu.file' },
      defaultKeybinding: 'Mod+Shift+O',
      icon: FolderOpen,
      run: (runtime) => runtime.openWorkspace()
    })

    ctx.commands.register({
      id: 'workspace.openRecent',
      title: { key: 'menu.openRecent' },
      category: { key: 'menu.file' },
      hidden: true,
      args: z.object({ id: z.string().min(1) }),
      run: (runtime, args) => runtime.openRecentWorkspace(args.id)
    })

    ctx.commands.register({
      id: 'workspace.refresh',
      title: { key: 'workspace.commandRefresh', ns: 'workspace' },
      category: { key: 'menu.view' },
      when: (when) => when.workspaceOpen,
      run: (runtime) => runtime.invalidateWorkspace()
    })

    ctx.commands.register({
      id: 'workspace.close',
      title: { key: 'workspace.commandClose', ns: 'workspace' },
      category: { key: 'menu.file' },
      when: (when) => when.workspaceOpen,
      run: (runtime) => runtime.closeWorkspace()
    })

    ctx.commands.register({
      id: 'workspace.reveal',
      title: { key: 'workspace.commandReveal', ns: 'workspace' },
      category: { key: 'menu.view' },
      hidden: true,
      when: (when) => when.workspaceOpen,
      args: pathArgs,
      run: async (runtime, args) => {
        const workspace = runtime.getWorkspace()
        if (workspace) {
          await window.misk.workspace.reveal(workspace.id, args.path)
        }
      }
    })

    ctx.commands.register({
      id: 'workspace.copyPath',
      title: { key: 'workspace.commandCopy', ns: 'workspace' },
      category: { key: 'menu.view' },
      hidden: true,
      args: pathArgs,
      run: async (_runtime, args) => {
        await window.misk.clipboard.writeText(args.path)
        ctx.notifications.notify(i18n.t('toast.copied'), 'success')
      }
    })

    ctx.commands.register({
      id: 'workspace.openFile',
      title: { key: 'workspace.commandOpenFile', ns: 'workspace' },
      category: { key: 'menu.view' },
      hidden: true,
      when: (when) => when.workspaceOpen,
      args: pathArgs,
      run: (runtime, args) => {
        const workspace = runtime.getWorkspace()
        if (workspace) {
          runtime.openView('workspace.preview', {
            source: 'workspace',
            workspaceId: workspace.id,
            path: args.path
          })
        }
      }
    })

    ctx.menus.add('file', { command: 'workspace.openFolder', order: 10 })
    ctx.menus.add('file', {
      label: { key: 'menu.openRecent' },
      order: 20,
      dynamicItems: () => {
        const recent = useSettingsStore.getState().settings.workspace.recent
        if (recent.length === 0) {
          return [{ label: { key: 'menu.noRecent' }, enabled: false }]
        }
        return recent.map((item) => ({
          label: item.name,
          command: 'workspace.openRecent',
          args: { id: item.id }
        }))
      }
    })
    ctx.menus.add('file', { separator: true, order: 25 })
  }
})
