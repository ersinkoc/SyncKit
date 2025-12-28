import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, RotateCcw, Wifi, WifiOff, Trash2, Download } from 'lucide-react'

interface QueueItem {
  id: string
  resource: string
  method: string
  status: 'pending' | 'syncing' | 'success' | 'error'
  timestamp: number
}

export function Playground() {
  const [selectedExample, setSelectedExample] = useState('basic')
  const [isOnline, setIsOnline] = useState(true)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const runExample = () => {
    addLog('Running example...')
    addLog('SyncKit initialized')

    const newItem: QueueItem = {
      id: `op_${Date.now()}`,
      resource: 'todos',
      method: 'POST',
      status: isOnline ? 'syncing' : 'pending',
      timestamp: Date.now()
    }

    setQueue(prev => [...prev, newItem])
    addLog(`Operation queued: ${newItem.id}`)

    if (isOnline) {
      setTimeout(() => {
        setQueue(prev =>
          prev.map(item =>
            item.id === newItem.id ? { ...item, status: 'success' } : item
          )
        )
        addLog(`✓ Operation synced: ${newItem.id}`)
      }, 1000)
    }
  }

  const toggleOnline = () => {
    const newStatus = !isOnline
    setIsOnline(newStatus)
    addLog(newStatus ? '🟢 Network: Online' : '🔴 Network: Offline')

    if (newStatus) {
      const pendingItems = queue.filter(item => item.status === 'pending')
      if (pendingItems.length > 0) {
        addLog(`Syncing ${pendingItems.length} pending operations...`)
        pendingItems.forEach((item, index) => {
          setTimeout(() => {
            setQueue(prev =>
              prev.map(q =>
                q.id === item.id ? { ...q, status: 'syncing' } : q
              )
            )
            addLog(`Syncing: ${item.id}`)

            setTimeout(() => {
              setQueue(prev =>
                prev.map(q =>
                  q.id === item.id ? { ...q, status: 'success' } : q
                )
              )
              addLog(`✓ Synced: ${item.id}`)
            }, 500)
          }, index * 600)
        })
      }
    }
  }

  const clearQueue = () => {
    setQueue([])
    addLog('Queue cleared')
  }

  const reset = () => {
    setQueue([])
    setLogs([])
    setIsOnline(true)
    addLog('Playground reset')
  }

  const examples = {
    basic: {
      title: 'Basic Usage',
      code: `import { createSyncKit } from '@oxog/synckit'

const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    const res = await fetch(\`/api/\${operation.resource}\`, {
      method: operation.method,
      body: JSON.stringify(operation.payload)
    })
    return res.json()
  }
})

await sync.init()

// Push an operation
sync.push({
  resource: 'todos',
  method: 'POST',
  payload: { title: 'Buy groceries' }
})`
    },
    offline: {
      title: 'Offline Support',
      code: `import { createSyncKit } from '@oxog/synckit'

const sync = createSyncKit({
  name: 'offline-demo',
  storage: 'indexeddb',
  executor: async (operation) => {
    // This will be called when online
    return await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(operation.payload)
    }).then(r => r.json())
  }
})

await sync.init()

// Listen to network events
sync.on('network-offline', () => {
  console.log('Gone offline - operations will be queued')
})

sync.on('network-online', () => {
  console.log('Back online - syncing queued operations')
})

// This works offline!
sync.push({
  resource: 'items',
  method: 'POST',
  payload: { name: 'New item' }
})`
    },
    retry: {
      title: 'Retry Logic',
      code: `import { createSyncKit } from '@oxog/synckit'

const sync = createSyncKit({
  name: 'retry-demo',
  storage: 'indexeddb',
  executor: async (operation) => {
    const res = await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(operation)
    })
    if (!res.ok) throw new Error('Sync failed')
    return res.json()
  },
  maxRetries: 5,
  retryDelay: 2000,
  backoffStrategy: 'exponential'
})

await sync.init()

// Listen to retry events
sync.on('retry', (event) => {
  console.log(\`Retrying operation \${event.data.id}\`)
  console.log(\`Attempt: \${event.data.retryCount}\`)
})

sync.on('sync-error', (event) => {
  console.error('Sync failed:', event.data.error)
})`
    },
    plugins: {
      title: 'With Plugins',
      code: `import { createSyncKit } from '@oxog/synckit'
import {
  createCompressionPlugin,
  createEncryptionPlugin,
  createBatchingPlugin
} from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'plugins-demo',
  storage: 'indexeddb',
  executor: async (operation) => {
    return await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(operation)
    }).then(r => r.json())
  },
  plugins: [
    // Compress operations
    createCompressionPlugin({
      algorithm: 'gzip'
    }),
    // Encrypt operations
    createEncryptionPlugin({
      key: 'your-secret-key'
    }),
    // Batch operations
    createBatchingPlugin({
      batchSize: 5,
      batchDelay: 1000
    })
  ]
})

await sync.init()`
    }
  }

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Interactive Playground</h1>
          <p className="text-lg text-muted-foreground">
            Try SyncKit in your browser with interactive examples
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Code Editor */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Code Editor</CardTitle>
                    <CardDescription>Edit and run SyncKit examples</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border rounded-md text-sm"
                      value={selectedExample}
                      onChange={(e) => setSelectedExample(e.target.value)}
                    >
                      {Object.entries(examples).map(([key, example]) => (
                        <option key={key} value={key}>
                          {example.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="terminal-window mb-4">
                  <div className="p-4">
                    <pre className="text-sm overflow-x-auto max-h-[500px]">
                      <code>{examples[selectedExample as keyof typeof examples].code}</code>
                    </pre>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runExample} className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    Run Example
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Console Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Console</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="terminal-window">
                  <div className="p-4 font-mono text-sm max-h-[300px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-zinc-500">No logs yet. Run an example to see output.</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="mb-1">
                        {log}
                      </div>
                    ))
                  )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls & Status */}
          <div className="space-y-4">
            {/* Network Control */}
            <Card>
              <CardHeader>
                <CardTitle>Network Simulator</CardTitle>
                <CardDescription>Simulate offline/online status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={isOnline ? 'default' : 'secondary'} className="gap-2">
                    {isOnline ? (
                      <>
                        <Wifi className="h-3 w-3" />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3" />
                        Offline
                      </>
                    )}
                  </Badge>
                </div>
                <Button
                  variant={isOnline ? 'destructive' : 'default'}
                  className="w-full"
                  onClick={toggleOnline}
                >
                  {isOnline ? (
                    <>
                      <WifiOff className="mr-2 h-4 w-4" />
                      Go Offline
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Go Online
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Queue Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sync Queue</CardTitle>
                    <CardDescription>{queue.length} operations</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearQueue}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queue.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No operations in queue
                    </div>
                  ) : (
                    queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {item.method} {item.resource}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.id}
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.status === 'success'
                              ? 'default'
                              : item.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Operations</span>
                    <span className="font-semibold">{queue.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-semibold text-yellow-600">
                      {queue.filter(q => q.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Syncing</span>
                    <span className="font-semibold text-blue-600">
                      {queue.filter(q => q.status === 'syncing').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success</span>
                    <span className="font-semibold text-green-600">
                      {queue.filter(q => q.status === 'success').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Failed</span>
                    <span className="font-semibold text-red-600">
                      {queue.filter(q => q.status === 'error').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
