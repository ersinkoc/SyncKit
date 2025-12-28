import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, Package, Zap, Code, Settings, Database, RefreshCw, Shield, Layers } from 'lucide-react'

export function Docs() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('getting-started')

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Zap className="h-4 w-4" />,
      subsections: ['Installation', 'Quick Start', 'Basic Usage']
    },
    {
      id: 'core-concepts',
      title: 'Core Concepts',
      icon: <Layers className="h-4 w-4" />,
      subsections: ['Architecture', 'Plugins', 'Events', 'Operations']
    },
    {
      id: 'guides',
      title: 'Guides',
      icon: <Settings className="h-4 w-4" />,
      subsections: ['Configuration', 'Storage', 'Retry Logic', 'Conflict Resolution', 'Service Workers']
    },
    {
      id: 'framework-integration',
      title: 'Framework Integration',
      icon: <Code className="h-4 w-4" />,
      subsections: ['React', 'Vue', 'Svelte']
    }
  ]

  return (
    <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 py-8">
      {/* Sidebar */}
      <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
        <ScrollArea className="h-full py-6 pr-6 lg:py-8">
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 text-sm font-semibold mb-2 w-full font-mono uppercase tracking-tight ${
                    activeSection === section.id ? 'text-emerald-400' : 'text-neutral-400 hover:text-emerald-400'
                  } transition-colors`}
                >
                  {section.icon}
                  {section.title}
                </button>
                <div className="ml-6 space-y-1">
                  {section.subsections.map((subsection) => (
                    <a
                      key={subsection}
                      href={`#${subsection.toLowerCase().replace(/\s+/g, '-')}`}
                      className="block text-sm text-neutral-500 hover:text-emerald-400 transition-colors py-1 font-mono"
                    >
                      <span className="text-blue-400 mr-1">./</span>{subsection}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px]">
        <div className="mx-auto w-full min-w-0">
          {activeSection === 'getting-started' && <GettingStartedContent />}
          {activeSection === 'core-concepts' && <CoreConceptsContent />}
          {activeSection === 'guides' && <GuidesContent />}
          {activeSection === 'framework-integration' && <FrameworkIntegrationContent />}
        </div>

        {/* Table of Contents - Right Sidebar */}
        <div className="hidden text-sm xl:block">
          <div className="sticky top-16 -mt-10 pt-4">
            <ScrollArea className="pb-10">
              <div className="sticky top-16 -mt-10 h-[calc(100vh-3.5rem)] py-12">
                <p className="font-medium mb-4">On This Page</p>
                <div className="space-y-2 text-muted-foreground">
                  {sections.find(s => s.id === activeSection)?.subsections.map((subsection) => (
                    <a
                      key={subsection}
                      href={`#${subsection.toLowerCase().replace(/\s+/g, '-')}`}
                      className="block hover:text-foreground transition-colors"
                    >
                      {subsection}
                    </a>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  )
}

function GettingStartedContent() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-4">Getting Started</h1>
        <p className="text-lg text-muted-foreground">
          Learn how to install and use SyncKit in your application.
        </p>
      </div>

      <section id="installation">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Package className="h-6 w-6" />
          Installation
        </h2>
        <p className="mb-4">Install SyncKit using your preferred package manager:</p>
        <Tabs defaultValue="npm" className="w-full">
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger value="npm" className="font-mono data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">npm</TabsTrigger>
            <TabsTrigger value="yarn" className="font-mono data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">yarn</TabsTrigger>
            <TabsTrigger value="pnpm" className="font-mono data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">pnpm</TabsTrigger>
          </TabsList>
          <TabsContent value="npm">
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dot bg-red-500"></div>
                <div className="terminal-dot bg-yellow-500"></div>
                <div className="terminal-dot bg-green-500"></div>
                <span className="text-xs text-neutral-500 font-mono ml-2">~/terminal</span>
              </div>
              <div className="p-4">
                <pre className="text-sm">
                  <code><span className="text-emerald-400">$</span> <span className="text-blue-400">npm</span> install @oxog/synckit</code>
                </pre>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="yarn">
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dot bg-red-500"></div>
                <div className="terminal-dot bg-yellow-500"></div>
                <div className="terminal-dot bg-green-500"></div>
                <span className="text-xs text-neutral-500 font-mono ml-2">~/terminal</span>
              </div>
              <div className="p-4">
                <pre className="text-sm">
                  <code><span className="text-emerald-400">$</span> <span className="text-blue-400">yarn</span> add @oxog/synckit</code>
                </pre>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="pnpm">
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dot bg-red-500"></div>
                <div className="terminal-dot bg-yellow-500"></div>
                <div className="terminal-dot bg-green-500"></div>
                <span className="text-xs text-neutral-500 font-mono ml-2">~/terminal</span>
              </div>
              <div className="p-4">
                <pre className="text-sm">
                  <code><span className="text-emerald-400">$</span> <span className="text-blue-400">pnpm</span> add @oxog/synckit</code>
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      <section id="quick-start">
        <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
        <p className="mb-4">Create your first SyncKit instance in just a few lines:</p>
        <div className="terminal-window mb-6">
          <div className="terminal-header">
            <div className="terminal-dot bg-red-500"></div>
            <div className="terminal-dot bg-yellow-500"></div>
            <div className="terminal-dot bg-green-500"></div>
            <span className="text-xs text-neutral-500 font-mono ml-2">~/quick-start.ts</span>
          </div>
          <div className="p-6">
            <pre className="text-sm overflow-x-auto">
              <code className="language-typescript">{`import { createSyncKit } from '@oxog/synckit'

const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(\`/api/\${operation.resource}\`, {
      method: operation.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload)
    })
    return response.json()
  }
})

// Initialize the sync engine
await sync.init()

// Push an operation - it will sync automatically!
sync.push({
  resource: 'todos',
  method: 'POST',
  payload: { title: 'Buy groceries', completed: false }
})`}</code>
            </pre>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>What happens here?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>1. Create:</strong> Initialize SyncKit with your configuration</p>
            <p><strong>2. Init:</strong> Set up storage and start monitoring network status</p>
            <p><strong>3. Push:</strong> Queue operations that sync automatically when online</p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="basic-usage">
        <h2 className="text-3xl font-bold mb-4">Basic Usage</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Listening to Events</CardTitle>
              <CardDescription>Subscribe to sync lifecycle events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="terminal-window">
                <div className="p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{`// Listen to sync success
sync.on('sync-success', (event) => {
  console.log('Operation synced:', event.data)
})

// Listen to errors
sync.on('sync-error', (event) => {
  console.error('Sync failed:', event.data)
})

// Listen to all events
sync.onAny((event) => {
  console.log('Event:', event.type, event.data)
})`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managing Operations</CardTitle>
              <CardDescription>Control your queued operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="terminal-window">
                <div className="p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{`// Remove an operation
sync.remove('operation-id')

// Clear all pending operations
sync.clear()

// Retry a failed operation
sync.retry('operation-id')

// Retry all failed operations
sync.retryAll()

// Pause/Resume syncing
sync.pause()
sync.resume()`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function CoreConceptsContent() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-4">Core Concepts</h1>
        <p className="text-lg text-muted-foreground">
          Understand the architecture and fundamental concepts of SyncKit.
        </p>
      </div>

      <section id="architecture">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Layers className="h-6 w-6" />
          Architecture
        </h2>
        <p className="mb-6">
          SyncKit uses a micro-kernel architecture with a plugin-based system. The core kernel is minimal and
          delegates most functionality to plugins, making it highly extensible and tree-shakeable.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Micro-Kernel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The kernel is only 251 bytes and provides the event bus and plugin registry.
                All features are implemented as plugins.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Plugin System</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Plugins can hook into lifecycle events, expose APIs, and communicate through events.
                Only include the plugins you need.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Event-Driven</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All components communicate through a centralized event bus using a publish-subscribe pattern.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Zero Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Uses only browser built-in APIs: IndexedDB, Fetch, CompressionStream, Web Crypto, and more.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section id="plugins">
        <h2 className="text-3xl font-bold mb-4">Plugins</h2>
        <p className="mb-6">SyncKit includes core plugins and optional plugins:</p>

        <div className="space-y-4 mb-6">
          <h3 className="text-xl font-semibold">Core Plugins (Always Included)</h3>
          <div className="grid gap-3">
            {[
              { name: 'Queue Manager', desc: 'Priority queue for managing operations' },
              { name: 'Network Monitor', desc: 'Detects online/offline status changes' },
              { name: 'Storage (IndexedDB)', desc: 'Persistent storage for operations' },
              { name: 'Retry Engine', desc: 'Automatic retry with backoff strategies' },
              { name: 'Conflict Resolver', desc: 'Resolves conflicts with multiple strategies' }
            ].map((plugin) => (
              <Card key={plugin.name}>
                <CardHeader>
                  <CardTitle className="text-base">{plugin.name}</CardTitle>
                  <CardDescription>{plugin.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Optional Plugins</h3>
          <div className="grid gap-3">
            {[
              { name: 'LocalStorage', desc: 'Alternative storage backend' },
              { name: 'Batching', desc: 'Batch multiple operations together' },
              { name: 'Compression', desc: 'Compress operations using gzip/deflate' },
              { name: 'Encryption', desc: 'Encrypt operations with AES-GCM' },
              { name: 'Background Sync', desc: 'Service Worker Background Sync API integration' },
              { name: 'Sync UI', desc: 'Debug panel for monitoring sync activity' },
              { name: 'Analytics', desc: 'Track metrics and performance' }
            ].map((plugin) => (
              <Card key={plugin.name}>
                <CardHeader>
                  <CardTitle className="text-base">{plugin.name}</CardTitle>
                  <CardDescription>{plugin.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      <section id="events">
        <h2 className="text-3xl font-bold mb-4">Events</h2>
        <p className="mb-4">SyncKit uses an event-driven architecture. Here are the main events:</p>
        <div className="terminal-window"><div className="p-6">
          <pre className="text-sm text-zinc-50 overflow-x-auto">
            <code>{`// Lifecycle Events
'init'              // Kernel initialized
'push'              // Operation pushed to queue
'sync-start'        // Sync started for an operation
'sync-success'      // Operation synced successfully
'sync-error'        // Sync failed
'retry'             // Operation retry scheduled
'conflict'          // Conflict detected

// Network Events
'network-online'    // Device went online
'network-offline'   // Device went offline

// Plugin Events
'plugin-registered' // Plugin added to kernel
'plugin-init'       // Plugin initialized`}</code>
          </pre>
        </div>
        </div>
      </section>

      <Separator />

      <section id="operations">
        <h2 className="text-3xl font-bold mb-4">Operations</h2>
        <p className="mb-4">Operations represent actions to be synchronized. Each operation has:</p>
        <div className="terminal-window"><div className="p-6">
          <pre className="text-sm text-zinc-50 overflow-x-auto">
            <code>{`interface Operation<T = any> {
  id: string              // Auto-generated unique ID
  resource: string        // Resource identifier (e.g., 'todos')
  method: string          // HTTP method (GET, POST, PUT, DELETE)
  payload?: T            // Request payload
  priority?: number      // Priority (0-2, default: 1)
  status: 'pending' | 'syncing' | 'success' | 'error'
  retryCount: number     // Number of retry attempts
  createdAt: number      // Timestamp when created
  updatedAt: number      // Timestamp when last updated
  error?: Error          // Error if sync failed
}`}</code>
          </pre>
        </div>
        </div>
      </section>
    </div>
  )
}

function GuidesContent() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-4">Guides</h1>
        <p className="text-lg text-muted-foreground">
          In-depth guides for configuring and using SyncKit features.
        </p>
      </div>

      <section id="configuration">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configuration
        </h2>
        <p className="mb-4">Configure SyncKit with various options:</p>
        <div className="rounded-lg border bg-zinc-950 p-6 mb-6">
          <pre className="text-sm text-zinc-50 overflow-x-auto">
            <code>{`const sync = createSyncKit({
  // Required
  name: 'my-app',
  executor: async (operation) => { /* ... */ },

  // Storage
  storage: 'indexeddb', // or 'localstorage'

  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000,
  backoffStrategy: 'exponential', // 'linear', 'fibonacci', or custom

  // Conflict resolution
  conflictStrategy: 'last-write-wins', // 'server-wins', 'client-wins', 'manual'

  // Network settings
  syncOnReconnect: true,
  batchSize: 10,

  // Optional plugins
  plugins: [
    createCompressionPlugin({ algorithm: 'gzip' }),
    createEncryptionPlugin({ algorithm: 'AES-GCM' }),
    createBatchingPlugin({ batchSize: 5, batchDelay: 1000 })
  ]
})`}</code>
          </pre>
        </div>
      </section>

      <Separator />

      <section id="storage">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Database className="h-6 w-6" />
          Storage
        </h2>
        <p className="mb-6">SyncKit supports multiple storage backends:</p>
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>IndexedDB (Default)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Best for most applications</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Large storage capacity</li>
                <li>Asynchronous operations</li>
                <li>Transaction support</li>
                <li>Better performance</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>LocalStorage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">For simpler use cases</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Synchronous operations</li>
                <li>5-10MB limit</li>
                <li>Simpler API</li>
                <li>Wide browser support</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="terminal-window"><div className="p-6">
          <pre className="text-sm text-zinc-50 overflow-x-auto">
            <code>{`// Using IndexedDB
const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: myExecutor
})

// Using LocalStorage
import { createLocalStoragePlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  storage: 'localstorage',
  executor: myExecutor,
  plugins: [createLocalStoragePlugin()]
})`}</code>
          </pre>
        </div>
        </div>
      </section>

      <Separator />

      <section id="retry-logic">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          Retry Logic
        </h2>
        <p className="mb-6">Configure how SyncKit retries failed operations:</p>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backoff Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`// Exponential backoff (default)
backoffStrategy: 'exponential' // 1s, 2s, 4s, 8s...

// Linear backoff
backoffStrategy: 'linear' // 1s, 2s, 3s, 4s...

// Fibonacci backoff
backoffStrategy: 'fibonacci' // 1s, 1s, 2s, 3s, 5s...

// Custom backoff
backoffStrategy: (retryCount) => {
  return Math.min(retryCount * 2000, 30000)
}`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retry Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,

  maxRetries: 5,              // Max retry attempts
  retryDelay: 1000,           // Base delay in ms
  backoffStrategy: 'exponential',
  jitter: true,               // Add randomness to prevent thundering herd

  // Retry only on specific errors
  retryOn: (error) => {
    return error.status >= 500 || error.status === 429
  }
})`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section id="conflict-resolution">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Conflict Resolution
        </h2>
        <p className="mb-6">Handle conflicts when local and server data differ:</p>
        <div className="space-y-4">
          {[
            {
              strategy: 'last-write-wins',
              title: 'Last Write Wins (Default)',
              desc: 'Most recent update wins based on timestamp'
            },
            {
              strategy: 'server-wins',
              title: 'Server Wins',
              desc: 'Server data always takes precedence'
            },
            {
              strategy: 'client-wins',
              title: 'Client Wins',
              desc: 'Local changes always take precedence'
            },
            {
              strategy: 'manual',
              title: 'Manual Resolution',
              desc: 'Emit event and let application handle conflict'
            }
          ].map((item) => (
            <Card key={item.strategy}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="terminal-window"><div className="p-4">
                  <pre className="text-sm text-zinc-50">
                    <code>{`conflictStrategy: '${item.strategy}'`}</code>
                  </pre>
                </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Custom Resolution</CardTitle>
              <CardDescription>Implement your own conflict resolution logic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`conflictStrategy: (local, server) => {
  // Merge strategy: combine both changes
  return {
    ...server,
    customField: local.customField
  }
}

// Or listen to conflict events
sync.on('conflict', (event) => {
  const { local, server } = event.data
  // Handle manually
})`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section id="service-workers">
        <h2 className="text-3xl font-bold mb-4">Service Workers</h2>
        <p className="mb-6">Enable true background sync with Service Workers:</p>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Register Service Worker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { registerServiceWorker } from '@oxog/synckit/sw'

// Register the service worker
await registerServiceWorker({
  path: '/sw.js',
  scope: '/',
  onRegistered: (registration) => {
    console.log('SW registered:', registration)
  },
  onError: (error) => {
    console.error('SW registration failed:', error)
  }
})`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Worker Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`// sw.js
import { setupSWHandlers } from '@oxog/synckit/sw'

setupSWHandlers({
  syncTag: 'synckit-sync',
  syncHandler: async (operations) => {
    const results = []
    for (const op of operations) {
      const res = await fetch(\`/api/\${op.resource}\`, {
        method: op.method,
        body: JSON.stringify(op.payload)
      })
      results.push(await res.json())
    }
    return results
  }
})

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enable Background Sync Plugin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { createBackgroundSyncPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createBackgroundSyncPlugin({
      tag: 'synckit-sync'
    })
  ]
})`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function FrameworkIntegrationContent() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-4">Framework Integration</h1>
        <p className="text-lg text-muted-foreground">
          Use SyncKit with React, Vue, or Svelte.
        </p>
      </div>

      <section id="react">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Code className="h-6 w-6 text-[#61DAFB]" />
          React
        </h2>
        <p className="mb-6">SyncKit provides React hooks and a Context Provider:</p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Setup Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { SyncKitProvider } from '@oxog/synckit/react'

function App() {
  return (
    <SyncKitProvider
      name="my-app"
      storage="indexeddb"
      executor={async (op) => {
        const res = await fetch(\`/api/\${op.resource}\`, {
          method: op.method,
          body: JSON.stringify(op.payload)
        })
        return res.json()
      }}
    >
      <YourApp />
    </SyncKitProvider>
  )
}`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useSync Hook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { useSync } from '@oxog/synckit/react'

function TodoList() {
  const { push, remove, clear } = useSync()

  const addTodo = (title) => {
    push({
      resource: 'todos',
      method: 'POST',
      payload: { title, completed: false }
    })
  }

  return <button onClick={() => addTodo('New todo')}>Add Todo</button>
}`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useSyncStatus Hook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { useSyncStatus } from '@oxog/synckit/react'

function SyncStatus() {
  const { isSyncing, isPaused } = useSyncStatus()

  return (
    <div>
      {isSyncing && <span>Syncing...</span>}
      {isPaused && <span>Paused</span>}
    </div>
  )
}`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useSyncQueue Hook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { useSyncQueue } from '@oxog/synckit/react'

function QueueStatus() {
  const { pending, syncing, failed } = useSyncQueue()

  return (
    <div>
      <p>Pending: {pending}</p>
      <p>Syncing: {syncing}</p>
      <p>Failed: {failed}</p>
    </div>
  )
}`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useOnline Hook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { useOnline } from '@oxog/synckit/react'

function OnlineIndicator() {
  const isOnline = useOnline()

  return (
    <div className={isOnline ? 'bg-green-500' : 'bg-red-500'}>
      {isOnline ? 'Online' : 'Offline'}
    </div>
  )
}`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section id="vue">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Code className="h-6 w-6 text-[#42B883]" />
          Vue
        </h2>
        <p className="mb-6">SyncKit provides Vue composables and a plugin:</p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Install Plugin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { createApp } from 'vue'
import { createSyncKitPlugin } from '@oxog/synckit/vue'

const app = createApp(App)

app.use(createSyncKitPlugin({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => {
    const res = await fetch(\`/api/\${op.resource}\`, {
      method: op.method,
      body: JSON.stringify(op.payload)
    })
    return res.json()
  }
}))

app.mount('#app')`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useSync Composable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script setup>
import { useSync } from '@oxog/synckit/vue'

const { push, remove, clear } = useSync()

const addTodo = (title) => {
  push({
    resource: 'todos',
    method: 'POST',
    payload: { title, completed: false }
  })
}
</script>

<template>
  <button @click="addTodo('New todo')">Add Todo</button>
</template>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useSyncStatus Composable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script setup>
import { useSyncStatus } from '@oxog/synckit/vue'

const { isSyncing, isPaused } = useSyncStatus()
</script>

<template>
  <div>
    <span v-if="isSyncing">Syncing...</span>
    <span v-if="isPaused">Paused</span>
  </div>
</template>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useSyncQueue Composable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script setup>
import { useSyncQueue } from '@oxog/synckit/vue'

const { pending, syncing, failed } = useSyncQueue()
</script>

<template>
  <div>
    <p>Pending: {{ pending }}</p>
    <p>Syncing: {{ syncing }}</p>
    <p>Failed: {{ failed }}</p>
  </div>
</template>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>useOnline Composable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script setup>
import { useOnline } from '@oxog/synckit/vue'

const isOnline = useOnline()
</script>

<template>
  <div :class="isOnline ? 'bg-green-500' : 'bg-red-500'">
    {{ isOnline ? 'Online' : 'Offline' }}
  </div>
</template>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section id="svelte">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Code className="h-6 w-6 text-[#FF3E00]" />
          Svelte
        </h2>
        <p className="mb-6">SyncKit provides Svelte stores:</p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Sync Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`import { createSyncStore } from '@oxog/synckit/svelte'

const sync = createSyncStore({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => {
    const res = await fetch(\`/api/\${op.resource}\`, {
      method: op.method,
      body: JSON.stringify(op.payload)
    })
    return res.json()
  }
})`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Use Sync Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script>
  import { sync } from './stores'

  function addTodo(title) {
    sync.push({
      resource: 'todos',
      method: 'POST',
      payload: { title, completed: false }
    })
  }
</script>

<button on:click={() => addTodo('New todo')}>
  Add Todo
</button>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script>
  import { createStatusStore } from '@oxog/synckit/svelte'
  import { sync } from './stores'

  const status = createStatusStore(sync.kernel)
</script>

<div>
  {#if $status.isSyncing}
    <span>Syncing...</span>
  {/if}
  {#if $status.isPaused}
    <span>Paused</span>
  {/if}
</div>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queue Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script>
  import { createQueueStore } from '@oxog/synckit/svelte'
  import { sync } from './stores'

  const queue = createQueueStore(sync.kernel)
</script>

<div>
  <p>Pending: {$queue.pending}</p>
  <p>Syncing: {$queue.syncing}</p>
  <p>Failed: {$queue.failed}</p>
</div>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Online Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="terminal-window"><div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{`<script>
  import { createOnlineStore } from '@oxog/synckit/svelte'
  import { sync } from './stores'

  const isOnline = createOnlineStore(sync.kernel)
</script>

<div class={$isOnline ? 'bg-green-500' : 'bg-red-500'}>
  {$isOnline ? 'Online' : 'Offline'}
</div>`}</code>
                </pre>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
