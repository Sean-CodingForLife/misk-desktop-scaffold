import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import {
  type AppSession,
  defaultSession,
  type SessionTab,
  sessionSchema
} from '@shared/session/schema'
import { app } from 'electron'
import { writeFileAtomic } from './fs-utils'

export interface SessionPatch {
  tabs?: SessionTab[]
  activeIndex?: number
}

export class SessionService {
  private readonly file: string
  private value: AppSession = defaultSession
  private timer: NodeJS.Timeout | null = null

  constructor(file = join(app.getPath('userData'), 'session.json')) {
    this.file = file
  }

  async init(): Promise<AppSession> {
    try {
      const raw = await fs.readFile(this.file, 'utf8')
      const parsed = sessionSchema.safeParse(JSON.parse(raw) as unknown)
      this.value = parsed.success ? parsed.data : defaultSession
    } catch {
      this.value = defaultSession
    }
    return this.value
  }

  get(): AppSession {
    return this.value
  }

  async patch(patch: SessionPatch): Promise<AppSession> {
    const next = sessionSchema.parse({
      ...this.value,
      ...(patch.tabs !== undefined ? { tabs: patch.tabs } : {}),
      ...(patch.activeIndex !== undefined ? { activeIndex: patch.activeIndex } : {})
    })
    this.value = next
    this.schedule()
    return next
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this.write(this.value)
  }

  private schedule(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.timer = null
      void this.write(this.value)
    }, 300)
  }

  private async write(value: AppSession): Promise<void> {
    try {
      await writeFileAtomic(this.file, `${JSON.stringify(value, null, 2)}\n`)
    } catch (error) {
      console.warn('[session] failed to persist', error)
    }
  }
}
