import * as Menubar from '@radix-ui/react-menubar'
import { executeCommand } from '@renderer/core/commands/execute'
import type { MenuItemModel } from '@renderer/core/menus/model'
import { useMenuModel } from '@renderer/core/menus/useMenuModel'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

function renderItem(item: MenuItemModel, index: number): ReactNode {
  if (item.kind === 'separator') {
    return <Menubar.Separator className="menu-separator" key={`sep-${index}`} />
  }
  if (item.kind === 'submenu') {
    return (
      <Menubar.Sub key={`sub-${index}-${item.label}`}>
        <Menubar.SubTrigger className="menu-item" disabled={item.enabled === false}>
          {item.label}
          <span className="menu-chevron">›</span>
        </Menubar.SubTrigger>
        <Menubar.Portal>
          <Menubar.SubContent className="menu-content" sideOffset={4} alignOffset={-4}>
            {(item.items ?? []).map(renderItem)}
          </Menubar.SubContent>
        </Menubar.Portal>
      </Menubar.Sub>
    )
  }

  const run = (): void => {
    if (item.role) {
      void window.misk.menu.runRole(item.role)
      return
    }
    if (item.command) {
      void executeCommand(item.command, item.args)
    }
  }

  if (item.checked !== undefined) {
    return (
      <Menubar.CheckboxItem
        key={`item-${index}-${item.label}`}
        className="menu-item"
        checked={item.checked}
        disabled={item.enabled === false}
        onSelect={run}
      >
        <span className="menu-check" aria-hidden="true">
          {item.checked ? '✓' : ''}
        </span>
        <span className="menu-label">{item.label}</span>
        {item.displayAccelerator ? (
          <span className="menu-shortcut">{item.displayAccelerator}</span>
        ) : null}
      </Menubar.CheckboxItem>
    )
  }

  return (
    <Menubar.Item
      key={`item-${index}-${item.label}`}
      className="menu-item"
      disabled={item.enabled === false}
      onSelect={run}
    >
      <span className="menu-check" aria-hidden="true" />
      <span className="menu-label">{item.label}</span>
      {item.displayAccelerator ? (
        <span className="menu-shortcut">{item.displayAccelerator}</span>
      ) : null}
    </Menubar.Item>
  )
}

export function MenuBar() {
  const { t } = useTranslation()
  const sections = useMenuModel()

  return (
    <Menubar.Root className="menubar no-drag" aria-label={t('activity.panels')}>
      {sections.map((section) => (
        <Menubar.Menu key={section.id}>
          <Menubar.Trigger className="menubar-trigger">{section.label}</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="menu-content" align="start" sideOffset={4}>
              {section.items.map(renderItem)}
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      ))}
    </Menubar.Root>
  )
}
