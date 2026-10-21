import { useDialogStore } from '@renderer/core/dialog/store'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/primitives'

export function ConfirmDialog() {
  const { t } = useTranslation()
  const request = useDialogStore((state) => state.request)
  const resolve = useDialogStore((state) => state.resolve)

  if (!request) {
    return null
  }
  const options = request.options

  return (
    <Modal
      open
      onOpenChange={(value) => {
        if (!value) {
          resolve(false)
        }
      }}
      title={options.title}
      description={options.message}
      className="confirm-modal"
      hideClose
      footer={
        <>
          <Button variant="ghost" onClick={() => resolve(false)}>
            {options.cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={options.danger ? 'danger' : 'primary'}
            onClick={() => resolve(true)}
            autoFocus
          >
            {options.confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    />
  )
}
