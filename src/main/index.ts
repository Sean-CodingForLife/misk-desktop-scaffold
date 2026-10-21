import { app } from 'electron'
import { bootstrap, registerAppScheme } from './app/lifecycle'

registerAppScheme()

void bootstrap().catch((error) => {
  console.error('[misk] failed to start', error)
  app.quit()
})
