import { z } from 'zod'
import { MAX_SESSION_TABS } from '../constants'

export const sessionParamsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()])
)

export const sessionTabSchema = z.object({
  viewId: z.string().min(1),
  params: sessionParamsSchema,
  title: z.string().optional()
})

export const sessionSchema = z.object({
  version: z.literal(1),
  tabs: z.array(sessionTabSchema).max(MAX_SESSION_TABS),
  activeIndex: z.number().int().min(-1)
})

export type SessionTab = z.infer<typeof sessionTabSchema>
export type AppSession = z.infer<typeof sessionSchema>

export const defaultSession: AppSession = {
  version: 1,
  tabs: [],
  activeIndex: -1
}
