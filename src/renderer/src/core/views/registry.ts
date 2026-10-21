import { type ComponentType, lazy } from 'react'
import { type Disposable, disposable } from '../disposable'
import { translateText } from '../i18n'
import type { ViewDefinition, ViewParams, ViewProps } from '../types'

const ID_PATTERN = /^[a-z][a-zA-Z0-9-]*(\.[a-z][a-zA-Z0-9-]*)+$/

export interface ParsedViewParams<P extends ViewParams> {
  ok: boolean
  params?: P
  error?: string
}

export class ViewRegistry {
  private readonly definitions = new Map<string, ViewDefinition>()
  private readonly components = new Map<string, ComponentType<ViewProps>>()

  register<P extends ViewParams>(definition: ViewDefinition<P>): Disposable {
    if (!ID_PATTERN.test(definition.id)) {
      throw new Error(`[views] invalid id "${definition.id}" (expected module.name)`)
    }
    if (!definition.component && !definition.load) {
      throw new Error(`[views] "${definition.id}" needs component or load`)
    }
    if (this.definitions.has(definition.id)) {
      console.warn(`[views] duplicate id: ${definition.id}`)
      return { dispose: () => undefined }
    }
    this.definitions.set(definition.id, definition as unknown as ViewDefinition)
    return disposable(() => {
      this.definitions.delete(definition.id)
      this.components.delete(definition.id)
    })
  }

  get<P extends ViewParams = ViewParams>(id: string): ViewDefinition<P> | undefined {
    return this.definitions.get(id) as ViewDefinition<P> | undefined
  }

  list(): ViewDefinition[] {
    return [...this.definitions.values()]
  }

  parseParams<P extends ViewParams>(
    definition: ViewDefinition<P>,
    params: ViewParams
  ): ParsedViewParams<P> {
    if (!definition.params) {
      return { ok: true, params: params as P }
    }
    const result = definition.params.safeParse(params)
    if (!result.success) {
      return { ok: false, error: result.error.message }
    }
    return { ok: true, params: result.data }
  }

  titleFor(definition: ViewDefinition): string {
    return translateText(definition.title)
  }

  isRestorable(definition: ViewDefinition, params: ViewParams): boolean {
    if (typeof definition.restorable === 'function') {
      return definition.restorable(params)
    }
    return definition.restorable !== false
  }

  componentFor(definition: ViewDefinition): ComponentType<ViewProps> | null {
    const cached = this.components.get(definition.id)
    if (cached) {
      return cached
    }
    if (definition.component) {
      const component = definition.component as unknown as ComponentType<ViewProps>
      this.components.set(definition.id, component)
      return component
    }
    if (definition.load) {
      const component = lazy(definition.load) as unknown as ComponentType<ViewProps>
      this.components.set(definition.id, component)
      return component
    }
    return null
  }
}

export const viewRegistry = new ViewRegistry()
