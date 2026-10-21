import { type Disposable, disposable } from '../disposable'
import type { PanelDefinition } from '../types'

export class PanelRegistry {
  private readonly definitions = new Map<string, PanelDefinition>()

  register(panel: PanelDefinition): Disposable {
    if (!panel.id) {
      throw new Error('[panels] panel needs an id')
    }
    if (this.definitions.has(panel.id)) {
      console.warn(`[panels] duplicate id: ${panel.id}`)
      return { dispose: () => undefined }
    }
    this.definitions.set(panel.id, panel)
    return disposable(() => this.definitions.delete(panel.id))
  }

  list(): PanelDefinition[] {
    return [...this.definitions.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }

  get(id: string): PanelDefinition | undefined {
    return this.definitions.get(id)
  }
}

export const panelRegistry = new PanelRegistry()
