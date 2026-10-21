import { useEffect, useMemo } from 'react'
import { toNativeTemplate } from '../../core/menus/model'
import { useMenuModel } from '../../core/menus/useMenuModel'

export function useAppMenu() {
  const model = useMenuModel()
  const template = useMemo(() => toNativeTemplate(model), [model])
  useEffect(() => {
    void window.misk.menu.update(template).catch((error) => {
      console.error('[menu] failed to update native menu', error)
    })
  }, [template])
  return model
}
