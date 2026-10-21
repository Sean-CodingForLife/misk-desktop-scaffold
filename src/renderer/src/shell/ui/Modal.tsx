import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@renderer/core/utils'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
  hideTitle?: boolean
  hideClose?: boolean
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  hideTitle,
  hideClose
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className={cn('modal', className)}
          aria-describedby={description ? undefined : undefined}
        >
          <Dialog.Title className={hideTitle ? 'sr-only' : 'modal-title'}>{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="modal-description">{description}</Dialog.Description>
          ) : null}
          {hideClose ? null : (
            <Dialog.Close className="modal-close" aria-label="Close">
              <X size={15} />
            </Dialog.Close>
          )}
          {children}
          {footer ? <div className="modal-actions">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
