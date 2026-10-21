import { cn } from '@renderer/core/utils'
import type { ComponentPropsWithRef, ReactNode } from 'react'

export { Button, IconButton } from './Button'

export function Input({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cn('input', className)} {...props} />
}

export function Select({ className, children, ...props }: ComponentPropsWithRef<'select'>) {
  return (
    <select className={cn('select', className)} {...props}>
      {children}
    </select>
  )
}

export function Field({
  label,
  description,
  children,
  htmlFor
}: {
  label: ReactNode
  description?: ReactNode
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="field">
      <div className="field-text">
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
        {description ? <p className="field-description">{description}</p> : null}
      </div>
      <div className="field-control">{children}</div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon ? <span className="empty-state-icon">{icon}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <span className="spinner-dot" />
    </span>
  )
}
