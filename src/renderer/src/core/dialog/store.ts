import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmRequest {
  id: string
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

interface DialogState {
  request: ConfirmRequest | null
  confirm: (options: ConfirmOptions) => Promise<boolean>
  resolve: (value: boolean) => void
}

let sequence = 0

export const useDialogStore = create<DialogState>((set, get) => ({
  request: null,
  confirm: (options) => {
    const existing = get().request
    existing?.resolve(false)
    sequence += 1
    const id = `confirm-${sequence}`
    return new Promise<boolean>((resolve) => {
      set({ request: { id, options, resolve } })
    })
  },
  resolve: (value) => {
    const current = get().request
    set({ request: null })
    current?.resolve(value)
  }
}))
