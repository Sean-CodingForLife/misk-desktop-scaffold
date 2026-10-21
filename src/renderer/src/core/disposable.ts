export interface Disposable {
  dispose: () => void
}

export function disposable(action: () => void): Disposable {
  let disposed = false
  return {
    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      action()
    }
  }
}
