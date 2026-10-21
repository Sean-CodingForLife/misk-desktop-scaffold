import { type Disposable, disposable } from '../disposable'
import type { StatusItemDefinition } from '../types'

export class StatusRegistry {
  private readonly definitions = new Map<string, StatusItemDefinition>()

  register(item: StatusItemDefinition): Disposable {
    if (!item.id) {
      throw new Error('[status] item needs an id')
    }
    if (this.definitions.has(item.id)) {
      console.warn(`[status] duplicate id: ${item.id}`)
      return { dispose: () => undefined }
    }
    this.definitions.set(item.id, item)
    return disposable(() => this.definitions.delete(item.id))
  }

  list(align: 'left' | 'right'): StatusItemDefinition[] {
    return [...this.definitions.values()]
      .filter((item) => (item.align ?? 'left') === align)
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }
}

export const statusRegistry = new StatusRegistry()
