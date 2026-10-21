import { useToastStore } from '@renderer/core/toast/store'
import { cn } from '@renderer/core/utils'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
} as const

export function ToastHost() {
  const { t } = useTranslation()
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind]
        return (
          <div key={toast.id} className={cn('toast', `toast-${toast.kind}`)}>
            <Icon size={15} />
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label={t('common.close')}
              onClick={() => dismiss(toast.id)}
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
