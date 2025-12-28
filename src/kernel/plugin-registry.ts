import type { Plugin, PluginInfo, Unsubscribe, SyncKit } from '../types'

/**
 * Internal wrapper for registered plugins.
 */
interface PluginWrapper {
  plugin: Plugin
  unsubscribes: Unsubscribe[]
  installed: Date
}

/**
 * Plugin registry manages plugin lifecycle and hook subscriptions.
 */
export class PluginRegistry {
  private plugins: Map<string, PluginWrapper>
  private kernel: SyncKit

  constructor(kernel: SyncKit) {
    this.plugins = new Map()
    this.kernel = kernel
  }

  /**
   * Register a plugin.
   *
   * @param plugin - Plugin to register
   * @throws Error if plugin with same name already registered
   *
   * @example
   * ```ts
   * registry.register({
   *   name: 'my-plugin',
   *   version: '1.0.0',
   *   type: 'optional',
   *   install: (kernel) => { ... },
   *   uninstall: () => { ... }
   * })
   * ```
   */
  async register(plugin: Plugin): Promise<void> {
    // Validate plugin
    this.validatePlugin(plugin)

    // Check for duplicates
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`)
    }

    const wrapper: PluginWrapper = {
      plugin,
      unsubscribes: [],
      installed: new Date(),
    }

    // Register hooks if provided
    if (plugin.hooks) {
      this.registerHooks(plugin, wrapper)
    }

    // Store wrapper
    this.plugins.set(plugin.name, wrapper)

    // Call install
    try {
      await plugin.install(this.kernel)
    } catch (error) {
      // Rollback if install fails
      this.plugins.delete(plugin.name)
      wrapper.unsubscribes.forEach((unsub) => unsub())
      throw new Error(`Failed to install plugin '${plugin.name}': ${error}`)
    }
  }

  /**
   * Unregister a plugin.
   *
   * @param name - Plugin name
   * @returns true if unregistered, false if not found
   *
   * @example
   * ```ts
   * registry.unregister('my-plugin')
   * ```
   */
  async unregister(name: string): Promise<boolean> {
    const wrapper = this.plugins.get(name)
    if (!wrapper) {
      return false
    }

    // Call uninstall
    try {
      await wrapper.plugin.uninstall()
    } catch (error) {
      console.error(`Error uninstalling plugin '${name}':`, error)
    }

    // Unsubscribe all hooks
    wrapper.unsubscribes.forEach((unsub) => unsub())

    // Remove from registry
    this.plugins.delete(name)

    return true
  }

  /**
   * Get a plugin by name.
   *
   * @param name - Plugin name
   * @returns Plugin instance or undefined
   *
   * @example
   * ```ts
   * const plugin = registry.getPlugin<QueueManagerPlugin>('queue-manager')
   * ```
   */
  getPlugin<P extends Plugin>(name: string): P | undefined {
    const wrapper = this.plugins.get(name)
    return wrapper?.plugin as P | undefined
  }

  /**
   * List all registered plugins.
   *
   * @returns Array of plugin info
   *
   * @example
   * ```ts
   * const plugins = registry.listPlugins()
   * plugins.forEach(p => console.log(p.name, p.version))
   * ```
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((wrapper) => ({
      name: wrapper.plugin.name,
      version: wrapper.plugin.version,
      type: wrapper.plugin.type,
      enabled: true,
    }))
  }

  /**
   * Check if a plugin is registered.
   *
   * @param name - Plugin name
   * @returns true if registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Unregister all plugins.
   */
  async clear(): Promise<void> {
    const names = Array.from(this.plugins.keys())
    for (const name of names) {
      await this.unregister(name)
    }
  }

  /**
   * Validate plugin structure.
   * @private
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name) {
      throw new Error('Plugin must have a name')
    }

    if (!plugin.version) {
      throw new Error('Plugin must have a version')
    }

    if (!plugin.type) {
      throw new Error('Plugin must have a type (core or optional)')
    }

    if (typeof plugin.install !== 'function') {
      throw new Error('Plugin must have an install method')
    }

    if (typeof plugin.uninstall !== 'function') {
      throw new Error('Plugin must have an uninstall method')
    }
  }

  /**
   * Register plugin hooks with event bus.
   * @private
   */
  private registerHooks(plugin: Plugin, wrapper: PluginWrapper): void {
    const hooks = plugin.hooks!

    // Map hooks to events
    if (hooks.onOnline) {
      const unsub = this.kernel.on('online', hooks.onOnline as any)
      wrapper.unsubscribes.push(unsub)
    }

    if (hooks.onOffline) {
      const unsub = this.kernel.on('offline', hooks.onOffline as any)
      wrapper.unsubscribes.push(unsub)
    }

    if (hooks.onQueueChange) {
      const unsub = this.kernel.on('queue-change', (event) => {
        hooks.onQueueChange!(event.queue)
      })
      wrapper.unsubscribes.push(unsub)
    }

    if (hooks.onStatusChange) {
      const unsub = this.kernel.on('status-change', (event) => {
        hooks.onStatusChange!(event.status)
      })
      wrapper.unsubscribes.push(unsub)
    }

    // Note: beforePush, afterPush, beforeSync, afterSync, beforeRetry, onConflict
    // are handled directly by the kernel during operation execution
  }
}
