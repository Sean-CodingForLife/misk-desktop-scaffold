import type { ComponentType } from 'react'

export class HomeRegistry {
  private component: ComponentType | null = null

  set(component: ComponentType): void {
    this.component = component
  }

  get(): ComponentType | null {
    return this.component
  }
}

export const homeRegistry = new HomeRegistry()
