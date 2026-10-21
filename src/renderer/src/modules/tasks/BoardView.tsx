import { registerCloseGuard } from '@renderer/core/close-guards'
import { useDialogStore } from '@renderer/core/dialog/store'
import { cn } from '@renderer/core/utils'
import { Button, Field, Input } from '@renderer/shell/ui/primitives'
import { Switch } from '@renderer/shell/ui/Switch'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type Task,
  type TaskColumn,
  useTaskSettingsStore,
  useTasksStore,
  useTaskUiStore
} from './store'

const COLUMNS: TaskColumn[] = ['todo', 'doing', 'done']
const COLUMN_KEYS = { todo: 'tasks.todo', doing: 'tasks.doing', done: 'tasks.done' } as const

function TaskCard({ task }: { task: Task }) {
  const { t } = useTranslation()
  const update = useTasksStore((state) => state.update)
  const remove = useTasksStore((state) => state.remove)
  const move = useTasksStore((state) => state.move)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const index = COLUMNS.indexOf(task.column)

  const commit = (): void => {
    const next = title.trim()
    if (next) {
      update(task.id, { title: next })
    } else {
      setTitle(task.title)
    }
    setEditing(false)
  }

  const moveTo = (delta: number): void => {
    const next = COLUMNS[index + delta]
    if (next) {
      move(task.id, next)
    }
  }

  return (
    <article
      className="task-card"
      draggable={!editing}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/task-id', task.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
    >
      {editing ? (
        <input
          className="task-edit"
          value={title}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              setTitle(task.title)
              setEditing(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="task-title"
          title={task.title}
          onDoubleClick={() => setEditing(true)}
          onClick={() => setEditing(true)}
        >
          {task.title}
        </button>
      )}
      <div className="task-card-actions">
        <button
          type="button"
          className="icon-btn"
          disabled={index === 0}
          title={t('tasks.moveLeft')}
          aria-label={t('tasks.moveLeft')}
          onClick={() => moveTo(-1)}
        >
          <ChevronLeft size={13} />
        </button>
        <button
          type="button"
          className="icon-btn"
          disabled={index === COLUMNS.length - 1}
          title={t('tasks.moveRight')}
          aria-label={t('tasks.moveRight')}
          onClick={() => moveTo(1)}
        >
          <ChevronRight size={13} />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          title={t('tasks.delete')}
          aria-label={t('tasks.delete')}
          onClick={() => remove(task.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  )
}

export function BoardView() {
  const { t } = useTranslation()
  const tasks = useTasksStore((state) => state.tasks)
  const add = useTasksStore((state) => state.add)
  const clearDone = useTasksStore((state) => state.clearDone)
  const showDone = useTaskSettingsStore((state) => state.showDone)
  const focusTick = useTaskUiStore((state) => state.focusTick)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusTick > 0) {
      inputRef.current?.focus()
    }
  }, [focusTick])

  useEffect(() => {
    if (!draft.trim()) {
      return
    }
    return registerCloseGuard(async () => {
      return useDialogStore.getState().confirm({
        title: t('tasks.discardDraft'),
        message: t('tasks.discardDraftMessage'),
        confirmLabel: t('tasks.discardDraftConfirm'),
        danger: true
      })
    })
  }, [draft, t])

  const visible = useMemo(() => {
    return COLUMNS.map((column) => ({
      column,
      tasks: tasks
        .filter((task) => task.column === column && (showDone || column !== 'done'))
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    }))
  }, [showDone, tasks])

  const submit = (): void => {
    if (!draft.trim()) {
      return
    }
    add(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  const drop = (event: DragEvent<HTMLElement>, column: TaskColumn): void => {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/task-id')
    if (!id) {
      return
    }
    useTasksStore.getState().move(id, column)
  }

  return (
    <div className="tasks-view">
      <header className="tasks-header">
        <div>
          <h1>{t('tasks.title')}</h1>
          <p>{t('tasks.total', { count: tasks.length })}</p>
        </div>
        <Button variant="ghost" onClick={clearDone}>
          {t('tasks.clearDone')}
        </Button>
      </header>

      <div className="tasks-composer">
        <Input
          ref={inputRef}
          value={draft}
          placeholder={t('tasks.addPlaceholder')}
          aria-label={t('tasks.addPlaceholder')}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
        <Button variant="primary" onClick={submit} disabled={!draft.trim()}>
          <Plus size={14} />
          {t('tasks.add')}
        </Button>
      </div>

      <div className="task-board">
        {visible.map(({ column, tasks: columnTasks }) => (
          <section
            className={cn('task-column', `task-column-${column}`)}
            key={column}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => drop(event, column)}
          >
            <header className="task-column-header">
              <h2>{t(COLUMN_KEYS[column])}</h2>
              <span>{columnTasks.length}</span>
            </header>
            <div className="task-column-body">
              {columnTasks.length === 0 ? (
                <p className="task-empty">{t('tasks.empty')}</p>
              ) : (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function TasksStatusItem() {
  const { t } = useTranslation()
  const count = useTasksStore(
    (state) => state.tasks.filter((task) => task.column !== 'done').length
  )
  return <span className="status-item">{t('tasks.openCount', { count })}</span>
}

export function TasksSettings() {
  const { t } = useTranslation()
  const showDone = useTaskSettingsStore((state) => state.showDone)
  const setShowDone = useTaskSettingsStore((state) => state.setShowDone)

  return (
    <div className="settings-fields">
      <Field label={t('tasks.showDone')}>
        <Switch checked={showDone} onCheckedChange={setShowDone} label={t('tasks.showDone')} />
      </Field>
    </div>
  )
}
