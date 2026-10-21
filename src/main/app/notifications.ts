import type { NotificationAction, NotificationRequest } from '@shared/ipc/contract'
import { Notification } from 'electron'

export function showNotification(
  request: NotificationRequest,
  onActivated: (action: NotificationAction | undefined) => void
): void {
  if (!Notification.isSupported()) {
    return
  }
  const notification = new Notification({
    title: request.title,
    body: request.body,
    silent: request.silent ?? false
  })
  notification.on('click', () => onActivated(request.action))
  notification.show()
}
