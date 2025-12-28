import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Search, Package, Blocks, Code, Zap } from 'lucide-react'

export function API() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">API Reference</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Complete API documentation for SyncKit
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search API..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="core" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="plugins">Plugins</TabsTrigger>
            <TabsTrigger value="adapters">Adapters</TabsTrigger>
            <TabsTrigger value="service-worker">Service Worker</TabsTrigger>
          </TabsList>

          <TabsContent value="core" className="space-y-6 mt-6">
            <CoreAPIContent searchQuery={searchQuery} />
          </TabsContent>

          <TabsContent value="plugins" className="space-y-6 mt-6">
            <PluginsAPIContent searchQuery={searchQuery} />
          </TabsContent>

          <TabsContent value="adapters" className="space-y-6 mt-6">
            <AdaptersAPIContent searchQuery={searchQuery} />
          </TabsContent>

          <TabsContent value="service-worker" className="space-y-6 mt-6">
            <ServiceWorkerAPIContent searchQuery={searchQuery} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function CoreAPIContent({ searchQuery }: { searchQuery: string }) {
  const apis = [
    {
      name: 'createSyncKit',
      category: 'Function',
      description: 'Creates and initializes a new SyncKit instance',
      signature: 'createSyncKit<T, R>(config: SyncKitConfig<T, R>): SyncKit<T, R>',
      params: [
        { name: 'config', type: 'SyncKitConfig<T, R>', desc: 'Configuration object' },
      ],
      returns: 'SyncKit instance',
      example: `const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => {
    const res = await fetch(\`/api/\${op.resource}\`, {
      method: op.method,
      body: JSON.stringify(op.payload)
    })
    return res.json()
  }
})`
    },
    {
      name: 'SyncKit',
      category: 'Interface',
      description: 'Main SyncKit instance interface',
      signature: 'interface SyncKit<T = any, R = any>',
      methods: [
        { name: 'init()', returns: 'Promise<void>', desc: 'Initialize the sync engine' },
        { name: 'push(operation)', returns: 'string', desc: 'Push an operation to the queue' },
        { name: 'remove(id)', returns: 'void', desc: 'Remove an operation by ID' },
        { name: 'clear()', returns: 'void', desc: 'Clear all pending operations' },
        { name: 'retry(id)', returns: 'void', desc: 'Retry a specific operation' },
        { name: 'retryAll()', returns: 'void', desc: 'Retry all failed operations' },
        { name: 'pause()', returns: 'void', desc: 'Pause syncing' },
        { name: 'resume()', returns: 'void', desc: 'Resume syncing' },
        { name: 'on(event, handler)', returns: 'Unsubscribe', desc: 'Subscribe to events' },
        { name: 'onAny(handler)', returns: 'Unsubscribe', desc: 'Subscribe to all events' },
      ],
      example: `await sync.init()

const opId = sync.push({
  resource: 'todos',
  method: 'POST',
  payload: { title: 'Buy groceries' }
})

sync.on('sync-success', (event) => {
  console.log('Synced:', event.data)
})`
    },
    {
      name: 'SyncKitConfig',
      category: 'Interface',
      description: 'Configuration options for creating a SyncKit instance',
      signature: 'interface SyncKitConfig<T = any, R = any>',
      properties: [
        { name: 'name', type: 'string', required: true, desc: 'Unique name for this instance' },
        { name: 'executor', type: '(op: Operation<T>) => Promise<R>', required: true, desc: 'Function to execute operations' },
        { name: 'storage', type: "'indexeddb' | 'localstorage'", required: false, desc: 'Storage backend (default: indexeddb)' },
        { name: 'maxRetries', type: 'number', required: false, desc: 'Maximum retry attempts (default: 3)' },
        { name: 'retryDelay', type: 'number', required: false, desc: 'Base retry delay in ms (default: 1000)' },
        { name: 'backoffStrategy', type: "'exponential' | 'linear' | 'fibonacci' | Function", required: false, desc: 'Backoff strategy (default: exponential)' },
        { name: 'conflictStrategy', type: "'last-write-wins' | 'server-wins' | 'client-wins' | 'manual' | Function", required: false, desc: 'Conflict resolution strategy' },
        { name: 'syncOnReconnect', type: 'boolean', required: false, desc: 'Sync when going online (default: true)' },
        { name: 'plugins', type: 'Plugin[]', required: false, desc: 'Additional plugins to register' },
      ],
      example: `const config: SyncKitConfig = {
  name: 'my-app',
  executor: myExecutor,
  maxRetries: 5,
  retryDelay: 2000,
  backoffStrategy: 'exponential',
  conflictStrategy: 'last-write-wins'
}`
    },
    {
      name: 'Operation',
      category: 'Interface',
      description: 'Represents a sync operation',
      signature: 'interface Operation<T = any>',
      properties: [
        { name: 'id', type: 'string', required: true, desc: 'Unique operation ID (auto-generated)' },
        { name: 'resource', type: 'string', required: true, desc: 'Resource identifier' },
        { name: 'method', type: 'string', required: true, desc: 'HTTP method (GET, POST, PUT, DELETE, etc.)' },
        { name: 'payload', type: 'T', required: false, desc: 'Operation payload' },
        { name: 'priority', type: 'number', required: false, desc: 'Priority level (0-2, default: 1)' },
        { name: 'status', type: "'pending' | 'syncing' | 'success' | 'error'", required: true, desc: 'Current status' },
        { name: 'retryCount', type: 'number', required: true, desc: 'Number of retry attempts' },
        { name: 'createdAt', type: 'number', required: true, desc: 'Creation timestamp' },
        { name: 'updatedAt', type: 'number', required: true, desc: 'Last update timestamp' },
        { name: 'error', type: 'Error', required: false, desc: 'Error if sync failed' },
      ],
      example: `const operation: Operation = {
  id: 'op_abc123',
  resource: 'todos',
  method: 'POST',
  payload: { title: 'Buy groceries' },
  priority: 1,
  status: 'pending',
  retryCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now()
}`
    },
    {
      name: 'KernelEvent',
      category: 'Interface',
      description: 'Event emitted by the kernel',
      signature: 'interface KernelEvent',
      properties: [
        { name: 'type', type: 'string', required: true, desc: 'Event type' },
        { name: 'data', type: 'any', required: false, desc: 'Event data' },
        { name: 'timestamp', type: 'number', required: true, desc: 'Event timestamp' },
      ],
      events: [
        { name: 'init', desc: 'Kernel initialized' },
        { name: 'push', desc: 'Operation pushed to queue' },
        { name: 'sync-start', desc: 'Sync started for operation' },
        { name: 'sync-success', desc: 'Operation synced successfully' },
        { name: 'sync-error', desc: 'Sync failed' },
        { name: 'retry', desc: 'Operation retry scheduled' },
        { name: 'conflict', desc: 'Conflict detected' },
        { name: 'network-online', desc: 'Device went online' },
        { name: 'network-offline', desc: 'Device went offline' },
      ],
      example: `sync.on('sync-success', (event) => {
  console.log(event.type)      // 'sync-success'
  console.log(event.data)      // { operation, result }
  console.log(event.timestamp) // 1234567890
})`
    },
    {
      name: 'generateId',
      category: 'Function',
      description: 'Generate a sortable unique ID',
      signature: 'generateId(prefix?: string): string',
      params: [
        { name: 'prefix', type: 'string', desc: 'Optional prefix (default: "op")' },
      ],
      returns: 'Unique ID string',
      example: `import { generateId } from '@oxog/synckit/utils'

const id = generateId('todo') // 'todo_abc123_xyz789'`
    },
  ]

  const filteredAPIs = apis.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {filteredAPIs.map((api) => (
        <Card key={api.name} id={api.name.toLowerCase()}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {api.category === 'Function' && <Zap className="h-5 w-5 text-emerald-500" />}
                  {api.category === 'Interface' && <Code className="h-5 w-5 text-emerald-500" />}
                  {api.name}
                </CardTitle>
                <CardDescription>{api.description}</CardDescription>
              </div>
              <Badge variant="outline">{api.category}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Signature</h4>
              <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50">
                  <code>{api.signature}</code>
                </pre>
              </div>
            </div> </div>

            {api.params && (
              <div>
                <h4 className="font-semibold mb-2">Parameters</h4>
                <div className="space-y-2">
                  {api.params.map((param) => (
                    <div key={param.name} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-emerald-500">{param.name}</code>
                        <code className="text-sm font-mono text-muted-foreground">{param.type}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{param.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {api.properties && (
              <div>
                <h4 className="font-semibold mb-2">Properties</h4>
                <div className="space-y-2">
                  {api.properties.map((prop) => (
                    <div key={prop.name} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-emerald-500">{prop.name}</code>
                        <code className="text-sm font-mono text-muted-foreground">{prop.type}</code>
                        {prop.required && <Badge variant="secondary">Required</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{prop.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {api.methods && (
              <div>
                <h4 className="font-semibold mb-2">Methods</h4>
                <div className="space-y-2">
                  {api.methods.map((method) => (
                    <div key={method.name} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-emerald-500">{method.name}</code>
                        <span className="text-sm text-muted-foreground">→</span>
                        <code className="text-sm font-mono text-muted-foreground">{method.returns}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{method.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {api.events && (
              <div>
                <h4 className="font-semibold mb-2">Events</h4>
                <div className="space-y-2">
                  {api.events.map((event) => (
                    <div key={event.name} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-emerald-500">{event.name}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {api.returns && (
              <div>
                <h4 className="font-semibold mb-2">Returns</h4>
                <p className="text-sm text-muted-foreground">{api.returns}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Example</h4>
              <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{api.example}</code>
                </pre>
              </div>
            </div> </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PluginsAPIContent({ searchQuery }: { searchQuery: string }) {
  const plugins = [
    {
      name: 'createCompressionPlugin',
      description: 'Enable gzip/deflate compression for operations',
      signature: 'createCompressionPlugin(options?: CompressionOptions): Plugin',
      options: [
        { name: 'algorithm', type: "'gzip' | 'deflate'", default: "'gzip'", desc: 'Compression algorithm' },
      ],
      example: `import { createCompressionPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createCompressionPlugin({ algorithm: 'gzip' })
  ]
})`
    },
    {
      name: 'createEncryptionPlugin',
      description: 'Encrypt operations using AES-GCM',
      signature: 'createEncryptionPlugin(options: EncryptionOptions): Plugin',
      options: [
        { name: 'key', type: 'CryptoKey | string', required: true, desc: 'Encryption key or password' },
        { name: 'algorithm', type: "'AES-GCM'", default: "'AES-GCM'", desc: 'Encryption algorithm' },
      ],
      example: `import { createEncryptionPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createEncryptionPlugin({
      key: 'your-secret-key'
    })
  ]
})`
    },
    {
      name: 'createBatchingPlugin',
      description: 'Batch multiple operations together',
      signature: 'createBatchingPlugin(options?: BatchingOptions): Plugin',
      options: [
        { name: 'batchSize', type: 'number', default: '10', desc: 'Maximum operations per batch' },
        { name: 'batchDelay', type: 'number', default: '1000', desc: 'Delay before processing batch (ms)' },
      ],
      example: `import { createBatchingPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createBatchingPlugin({
      batchSize: 5,
      batchDelay: 2000
    })
  ]
})`
    },
    {
      name: 'createBackgroundSyncPlugin',
      description: 'Enable Service Worker Background Sync API',
      signature: 'createBackgroundSyncPlugin(options?: BackgroundSyncOptions): Plugin',
      options: [
        { name: 'tag', type: 'string', default: "'synckit-sync'", desc: 'Background sync tag' },
      ],
      example: `import { createBackgroundSyncPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createBackgroundSyncPlugin({
      tag: 'my-sync-tag'
    })
  ]
})`
    },
    {
      name: 'createSyncUIPlugin',
      description: 'Debug panel for monitoring sync activity',
      signature: 'createSyncUIPlugin(options?: SyncUIOptions): Plugin',
      options: [
        { name: 'position', type: "'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'", default: "'bottom-right'", desc: 'Panel position' },
      ],
      example: `import { createSyncUIPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createSyncUIPlugin({
      position: 'bottom-right'
    })
  ]
})`
    },
    {
      name: 'createAnalyticsPlugin',
      description: 'Track sync metrics and performance',
      signature: 'createAnalyticsPlugin(options?: AnalyticsOptions): Plugin',
      options: [
        { name: 'onMetric', type: '(metric: Metric) => void', required: false, desc: 'Callback for metric events' },
      ],
      example: `import { createAnalyticsPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  plugins: [
    createAnalyticsPlugin({
      onMetric: (metric) => {
        console.log('Metric:', metric)
      }
    })
  ]
})`
    },
    {
      name: 'createLocalStoragePlugin',
      description: 'Use localStorage as storage backend',
      signature: 'createLocalStoragePlugin(options?: LocalStorageOptions): Plugin',
      options: [
        { name: 'prefix', type: 'string', default: "'synckit'", desc: 'localStorage key prefix' },
      ],
      example: `import { createLocalStoragePlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  executor: myExecutor,
  storage: 'localstorage',
  plugins: [
    createLocalStoragePlugin({
      prefix: 'my-app'
    })
  ]
})`
    },
  ]

  const filteredPlugins = plugins.filter(plugin =>
    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {filteredPlugins.map((plugin) => (
        <Card key={plugin.name} id={plugin.name.toLowerCase()}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Blocks className="h-5 w-5 text-emerald-500" />
                  {plugin.name}
                </CardTitle>
                <CardDescription>{plugin.description}</CardDescription>
              </div>
              <Badge variant="outline">Plugin</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Signature</h4>
              <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50">
                  <code>{plugin.signature}</code>
                </pre>
              </div>
            </div> </div>

            <div>
              <h4 className="font-semibold mb-2">Options</h4>
              <div className="space-y-2">
                {plugin.options.map((option) => (
                  <div key={option.name} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-emerald-500">{option.name}</code>
                      <code className="text-sm font-mono text-muted-foreground">{option.type}</code>
                      {option.required && <Badge variant="secondary">Required</Badge>}
                      {option.default && <Badge variant="outline">Default: {option.default}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Example</h4>
              <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{plugin.example}</code>
                </pre>
              </div>
            </div> </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AdaptersAPIContent({ searchQuery }: { searchQuery: string }) {
  const adapters = [
    {
      framework: 'React',
      icon: '⚛️',
      items: [
        {
          name: 'SyncKitProvider',
          type: 'Component',
          description: 'Context provider for SyncKit',
          props: [
            { name: 'name', type: 'string', required: true, desc: 'Instance name' },
            { name: 'executor', type: 'Executor', required: true, desc: 'Executor function' },
            { name: 'storage', type: "'indexeddb' | 'localstorage'", desc: 'Storage backend' },
            { name: 'children', type: 'ReactNode', required: true, desc: 'Child components' },
          ],
          example: `import { SyncKitProvider } from '@oxog/synckit/react'

<SyncKitProvider
  name="my-app"
  executor={myExecutor}
  storage="indexeddb"
>
  <App />
</SyncKitProvider>`
        },
        {
          name: 'useSync',
          type: 'Hook',
          description: 'Access SyncKit instance',
          returns: '{ push, remove, clear, retry, retryAll, pause, resume }',
          example: `import { useSync } from '@oxog/synckit/react'

function MyComponent() {
  const { push } = useSync()

  const addItem = () => {
    push({
      resource: 'items',
      method: 'POST',
      payload: { name: 'New item' }
    })
  }

  return <button onClick={addItem}>Add</button>
}`
        },
        {
          name: 'useSyncStatus',
          type: 'Hook',
          description: 'Monitor sync status',
          returns: '{ isSyncing: boolean, isPaused: boolean }',
          example: `import { useSyncStatus } from '@oxog/synckit/react'

function SyncIndicator() {
  const { isSyncing } = useSyncStatus()
  return isSyncing ? 'Syncing...' : 'Idle'
}`
        },
        {
          name: 'useSyncQueue',
          type: 'Hook',
          description: 'Monitor queue status',
          returns: '{ pending: number, syncing: number, failed: number }',
          example: `import { useSyncQueue } from '@oxog/synckit/react'

function QueueStatus() {
  const { pending, failed } = useSyncQueue()
  return <div>Pending: {pending}, Failed: {failed}</div>
}`
        },
        {
          name: 'useOnline',
          type: 'Hook',
          description: 'Monitor online status',
          returns: 'boolean',
          example: `import { useOnline } from '@oxog/synckit/react'

function OnlineIndicator() {
  const isOnline = useOnline()
  return <div>{isOnline ? '🟢' : '🔴'}</div>
}`
        },
      ]
    },
    {
      framework: 'Vue',
      icon: '💚',
      items: [
        {
          name: 'createSyncKitPlugin',
          type: 'Plugin',
          description: 'Vue plugin for SyncKit',
          example: `import { createSyncKitPlugin } from '@oxog/synckit/vue'

app.use(createSyncKitPlugin({
  name: 'my-app',
  executor: myExecutor
}))`
        },
        {
          name: 'useSync',
          type: 'Composable',
          description: 'Access SyncKit instance',
          returns: '{ push, remove, clear, retry, retryAll, pause, resume }',
          example: `import { useSync } from '@oxog/synckit/vue'

const { push } = useSync()

push({
  resource: 'items',
  method: 'POST',
  payload: { name: 'New item' }
})`
        },
        {
          name: 'useSyncStatus',
          type: 'Composable',
          description: 'Monitor sync status',
          returns: '{ isSyncing: Ref<boolean>, isPaused: Ref<boolean> }',
          example: `import { useSyncStatus } from '@oxog/synckit/vue'

const { isSyncing } = useSyncStatus()`
        },
        {
          name: 'useSyncQueue',
          type: 'Composable',
          description: 'Monitor queue status',
          returns: '{ pending: Ref<number>, syncing: Ref<number>, failed: Ref<number> }',
          example: `import { useSyncQueue } from '@oxog/synckit/vue'

const { pending, failed } = useSyncQueue()`
        },
        {
          name: 'useOnline',
          type: 'Composable',
          description: 'Monitor online status',
          returns: 'Ref<boolean>',
          example: `import { useOnline } from '@oxog/synckit/vue'

const isOnline = useOnline()`
        },
      ]
    },
    {
      framework: 'Svelte',
      icon: '🔥',
      items: [
        {
          name: 'createSyncStore',
          type: 'Store',
          description: 'Create SyncKit store',
          returns: 'SyncStore',
          example: `import { createSyncStore } from '@oxog/synckit/svelte'

export const sync = createSyncStore({
  name: 'my-app',
  executor: myExecutor
})

// Use in components
$sync.push({ ... })`
        },
        {
          name: 'createStatusStore',
          type: 'Store',
          description: 'Create status store',
          returns: 'Readable<{ isSyncing: boolean, isPaused: boolean }>',
          example: `import { createStatusStore } from '@oxog/synckit/svelte'

export const status = createStatusStore(sync.kernel)

// Use in components
$status.isSyncing`
        },
        {
          name: 'createQueueStore',
          type: 'Store',
          description: 'Create queue store',
          returns: 'Readable<{ pending: number, syncing: number, failed: number }>',
          example: `import { createQueueStore } from '@oxog/synckit/svelte'

export const queue = createQueueStore(sync.kernel)

// Use in components
$queue.pending`
        },
        {
          name: 'createOnlineStore',
          type: 'Store',
          description: 'Create online status store',
          returns: 'Readable<boolean>',
          example: `import { createOnlineStore } from '@oxog/synckit/svelte'

export const isOnline = createOnlineStore(sync.kernel)

// Use in components
$isOnline`
        },
      ]
    },
  ]

  return (
    <div className="space-y-8">
      {adapters.map((adapter) => (
        <div key={adapter.framework}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>{adapter.icon}</span>
            {adapter.framework}
          </h2>
          <div className="space-y-6">
            {adapter.items
              .filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((item) => (
                <Card key={item.name} id={`${adapter.framework}-${item.name}`.toLowerCase()}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{item.name}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.props && (
                      <div>
                        <h4 className="font-semibold mb-2">Props</h4>
                        <div className="space-y-2">
                          {item.props.map((prop) => (
                            <div key={prop.name} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono text-emerald-500">{prop.name}</code>
                                <code className="text-sm font-mono text-muted-foreground">{prop.type}</code>
                                {prop.required && <Badge variant="secondary">Required</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{prop.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.returns && (
                      <div>
                        <h4 className="font-semibold mb-2">Returns</h4>
                        <code className="text-sm font-mono text-muted-foreground">{item.returns}</code>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2">Example</h4>
                      <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                          <code>{item.example}</code>
                </pre>
              </div>
            </div> </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ServiceWorkerAPIContent({ searchQuery }: { searchQuery: string }) {
  const swAPIs = [
    {
      name: 'registerServiceWorker',
      description: 'Register a service worker',
      signature: 'registerServiceWorker(options?: SWRegistrationOptions): Promise<ServiceWorkerRegistration | null>',
      options: [
        { name: 'path', type: 'string', default: "'/sw.js'", desc: 'Service worker file path' },
        { name: 'scope', type: 'string', default: "'/'", desc: 'Service worker scope' },
        { name: 'onRegistered', type: '(reg: ServiceWorkerRegistration) => void', desc: 'Success callback' },
        { name: 'onError', type: '(error: Error) => void', desc: 'Error callback' },
      ],
      example: `import { registerServiceWorker } from '@oxog/synckit/sw'

await registerServiceWorker({
  path: '/sw.js',
  scope: '/',
  onRegistered: (reg) => console.log('SW registered'),
  onError: (error) => console.error('Failed:', error)
})`
    },
    {
      name: 'setupSWHandlers',
      description: 'Set up service worker event handlers',
      signature: 'setupSWHandlers(options?: SWHandlerOptions): void',
      options: [
        { name: 'syncTag', type: 'string', default: "'synckit-sync'", desc: 'Background sync tag' },
        { name: 'syncHandler', type: 'SyncEventHandler', desc: 'Sync event handler function' },
        { name: 'onMessage', type: '(event: MessageEvent) => void', desc: 'Message event handler' },
      ],
      example: `// In your service worker file (sw.js)
import { setupSWHandlers } from '@oxog/synckit/sw'

setupSWHandlers({
  syncTag: 'my-sync',
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
})`
    },
    {
      name: 'messageAllClients',
      description: 'Send message to all clients from SW',
      signature: 'messageAllClients(message: SWMessage): Promise<void>',
      example: `import { messageAllClients } from '@oxog/synckit/sw'

// In service worker
await messageAllClients({
  type: 'sync-complete',
  data: { count: 5 }
})`
    },
    {
      name: 'createDefaultSyncHandler',
      description: 'Create a default sync event handler',
      signature: 'createDefaultSyncHandler(executor: (operations: unknown[]) => Promise<unknown[]>): SyncEventHandler',
      example: `import { createDefaultSyncHandler } from '@oxog/synckit/sw'

const syncHandler = createDefaultSyncHandler(async (operations) => {
  // Process operations
  return results
})`
    },
  ]

  const filteredAPIs = swAPIs.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {filteredAPIs.map((api) => (
        <Card key={api.name} id={api.name.toLowerCase()}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-500" />
                  {api.name}
                </CardTitle>
                <CardDescription>{api.description}</CardDescription>
              </div>
              <Badge variant="outline">Service Worker</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Signature</h4>
              <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{api.signature}</code>
                </pre>
              </div>
            </div> </div>

            {api.options && (
              <div>
                <h4 className="font-semibold mb-2">Options</h4>
                <div className="space-y-2">
                  {api.options.map((option) => (
                    <div key={option.name} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-emerald-500">{option.name}</code>
                        <code className="text-sm font-mono text-muted-foreground">{option.type}</code>
                        {option.default && <Badge variant="outline">Default: {option.default}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Example</h4>
              <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm text-zinc-50 overflow-x-auto">
                  <code>{api.example}</code>
                </pre>
              </div>
            </div> </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
