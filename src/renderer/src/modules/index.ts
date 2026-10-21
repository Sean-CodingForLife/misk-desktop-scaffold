import type { ModuleDefinition } from '@renderer/core/modules/types'
import { APP_CONFIG } from '@shared/app-config'
import { coreModule } from './core'
import { tasksModule } from './tasks'
import { workspaceModule } from './workspace'
// <generated:imports>
// </generated:imports>

export function getModules(): ModuleDefinition[] {
  const modules: ModuleDefinition[] = [coreModule]
  if (APP_CONFIG.features.workspace) {
    modules.push(workspaceModule)
  }
  if (APP_CONFIG.features.demo) {
    modules.push(tasksModule)
  }
  // <generated:modules>
  // </generated:modules>
  return modules
}
