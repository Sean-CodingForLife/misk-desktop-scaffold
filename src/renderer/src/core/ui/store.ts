import { create } from 'zustand'

interface UiState {
  paletteOpen: boolean
  quickSwitcherOpen: boolean
  shortcutsOpen: boolean
  keybindingRecording: boolean
  openPalette: () => void
  closePalette: () => void
  openQuickSwitcher: () => void
  closeQuickSwitcher: () => void
  openShortcuts: () => void
  closeShortcuts: () => void
  setKeybindingRecording: (value: boolean) => void
  closeOverlays: () => void
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  quickSwitcherOpen: false,
  shortcutsOpen: false,
  keybindingRecording: false,
  openPalette: () => set({ paletteOpen: true, quickSwitcherOpen: false }),
  closePalette: () => set({ paletteOpen: false }),
  openQuickSwitcher: () => set({ quickSwitcherOpen: true, paletteOpen: false }),
  closeQuickSwitcher: () => set({ quickSwitcherOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
  setKeybindingRecording: (value) => set({ keybindingRecording: value }),
  closeOverlays: () => set({ paletteOpen: false, quickSwitcherOpen: false, shortcutsOpen: false })
}))
