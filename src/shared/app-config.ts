import { z } from 'zod'
import raw from '../../app.config.json'

const appConfigSchema = z.object({
  productName: z.string().min(1),
  appId: z.string().min(1),
  protocol: z.string().regex(/^[a-z][a-z0-9+.-]*$/),
  description: z.string().min(1),
  repository: z.string().url(),
  features: z.object({
    demo: z.boolean(),
    workspace: z.boolean()
  }),
  csp: z.object({
    connectSrc: z.array(z.string()).default(["'self'"])
  })
})

export type AppConfig = z.infer<typeof appConfigSchema>

export const APP_CONFIG: AppConfig = appConfigSchema.parse(raw)
