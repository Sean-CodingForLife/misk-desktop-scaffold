import { create } from 'zustand'
import type { ToastKind } from '../types'

export interface Toast {
  id: string
  message: string
  kind: ToastKind
}

interface ToastState {
  toasts: Toast[]
  notify: (message: string, kind?: ToastKind) => void
  dismiss: (id: string) => void
}

let sequence = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (message, kind = 'info') => {
    sequence += 1
    const id = `toast-${Date.now()}-${sequence}`
    set((state) => ({ toasts: [...state.toasts.slice(-4), { id, message, kind }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    }, 4200)
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  }
}))

export function notify(message: string, kind: ToastKind = 'info'): void {
  useToastStore.getState().notify(message, kind)
}
