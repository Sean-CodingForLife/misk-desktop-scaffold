import { type Disposable, disposable } from '../disposable'
import { translateText } from '../i18n'
import type { WhenContext } from '../types'
import type { Command, CommandRuntime } from './types'

const ID_PATTERN = /^[a-z][a-zA-Z0-9-]*(\.[a-z][a-zA-Z0-9-]*)+$/

export class CommandRegistry {
  private readonly commands = new Map<string, Command<unknown>>()

  register<A>(command: Command<A>): Disposable {
    if (!ID_PATTERN.test(command.id)) {
      throw new Error(`[commands] invalid id "${command.id}" (expected module.name)`)
    }
    if (this.commands.has(command.id)) {
      console.warn(`[commands] duplicate id: ${command.id}`)
      return { dispose: () => undefined }
    }
    this.commands.set(command.id, command as unknown as Command<unknown>)
    return disposable(() => this.commands.delete(command.id))
  }

  list(): Command<unknown>[] {
    return [...this.commands.values()]
  }

  get<A = void>(id: string): Command<A> | undefined {
    return this.commands.get(id) as Command<A> | undefined
  }

  async execute(id: string, args: unknown, runtime: CommandRuntime): Promise<boolean> {
    const command = this.commands.get(id)
    if (!command) {
      runtime.notify(
        translateText(
          { key: 'toast.commandFailed', fallback: `Unknown command: ${id}` },
          `Unknown command: ${id}`
        ),
        'error'
      )
      return false
    }
    const context: WhenContext = runtime.getWhenContext()
    try {
      if (command.when && !command.when(context)) {
        return false
      }
    } catch (error) {
      console.error(`[commands] when() failed for ${id}`, error)
      return false
    }
    let parsed: unknown = args
    if (command.args) {
      const result = command.args.safeParse(args)
      if (!result.success) {
        runtime.notify(
          translateText(
            { key: 'toast.invalidCommandArgs', fallback: 'Invalid command arguments' },
            'Invalid command arguments'
          ),
          'error'
        )
        return false
      }
      parsed = result.data
    }
    try {
      await command.run(runtime, parsed as never)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[commands] failed: ${id}`, error)
      runtime.notify(
        translateText(
          { key: 'toast.commandFailed', fallback: `Command failed: ${message}` },
          `Command failed: ${message}`
        ),
        'error'
      )
      return false
    }
  }
}

export const commandRegistry = new CommandRegistry()
