type CloseGuard = () => boolean | Promise<boolean>

const guards = new Set<CloseGuard>()

export function registerCloseGuard(guard: CloseGuard): () => void {
  guards.add(guard)
  return () => guards.delete(guard)
}

export async function runCloseGuards(): Promise<boolean> {
  for (const guard of [...guards]) {
    try {
      const allowed = await guard()
      if (!allowed) {
        return false
      }
    } catch (error) {
      console.error('[close-guard] guard failed', error)
    }
  }
  return true
}
