import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Code, CheckCircle2 } from 'lucide-react'

export function Examples() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Examples</h1>
          <p className="text-lg text-muted-foreground">
            Real-world examples and use cases for SyncKit
          </p>
        </div>

        <Tabs defaultValue="todo-app" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="todo-app">Todo App</TabsTrigger>
            <TabsTrigger value="chat-app">Chat App</TabsTrigger>
            <TabsTrigger value="ecommerce">E-Commerce</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
          </TabsList>

          <TabsContent value="todo-app" className="space-y-6 mt-6">
            <TodoAppExample />
          </TabsContent>

          <TabsContent value="chat-app" className="space-y-6 mt-6">
            <ChatAppExample />
          </TabsContent>

          <TabsContent value="ecommerce" className="space-y-6 mt-6">
            <ECommerceExample />
          </TabsContent>

          <TabsContent value="forms" className="space-y-6 mt-6">
            <FormsExample />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function TodoAppExample() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Offline-First Todo Application
              </CardTitle>
              <CardDescription>
                A complete todo app with offline support, real-time sync, and conflict resolution
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge>React</Badge>
              <Badge variant="outline">TypeScript</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Create, update, and delete todos offline
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Automatic synchronization when connection restored
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Visual feedback for sync status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Conflict resolution with last-write-wins strategy
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Queue management with retry on failure
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Setup</h4>
            <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm overflow-x-auto">
                  <code>{`import { SyncKitProvider } from '@oxog/synckit/react'

function App() {
  return (
    <SyncKitProvider
      name="todo-app"
      storage="indexeddb"
      executor={async (operation) => {
        const response = await fetch(\`/api/todos\${operation.id ? '/' + operation.id : ''}\`, {
          method: operation.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.payload)
        })
        return response.json()
      }}
      maxRetries={5}
      retryDelay={2000}
      backoffStrategy="exponential"
      conflictStrategy="last-write-wins"
    >
      <TodoApp />
    </SyncKitProvider>
  )
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Component Implementation</h4>
            <div className="terminal-window">
              <div className="p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`import { useSync, useSyncQueue, useOnline } from '@oxog/synckit/react'

function TodoApp() {
  const [todos, setTodos] = useState([])
  const { push } = useSync()
  const { pending, failed } = useSyncQueue()
  const isOnline = useOnline()

  const addTodo = (title: string) => {
    const newTodo = { id: Date.now(), title, completed: false }
    setTodos([...todos, newTodo])

    push({
      resource: 'todos',
      method: 'POST',
      payload: newTodo
    })
  }

  const toggleTodo = (id: number) => {
    const todo = todos.find(t => t.id === id)
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))

    push({
      resource: 'todos',
      method: 'PUT',
      payload: { ...todo, completed: !todo.completed }
    })
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id))

    push({
      resource: 'todos',
      method: 'DELETE',
      payload: { id }
    })
  }

  return (
    <div>
      <header>
        <h1>Todos</h1>
        <div className="status">
          <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
          {pending > 0 && <span>{pending} pending</span>}
          {failed > 0 && <span>{failed} failed</span>}
        </div>
      </header>

      <AddTodoForm onAdd={addTodo} />

      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>
    </div>
  )
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="https://github.com/ersinkoc/synckit/tree/main/examples/react-todo" target="_blank" rel="noreferrer">
                <Code className="mr-2 h-4 w-4" />
                View Source
              </a>
            </Button>
            <Button asChild>
              <a href="/playground?example=todo-app" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Try Live Demo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChatAppExample() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Offline-Capable Chat Application</CardTitle>
              <CardDescription>
                Real-time chat with offline message queuing and background sync
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge>Vue</Badge>
              <Badge variant="outline">TypeScript</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Send messages while offline
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Background sync with Service Workers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Optimistic UI updates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Message delivery status indicators
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Automatic retry with exponential backoff
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Setup with Background Sync</h4>
            <div className="terminal-window">
              <div className="p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`import { createApp } from 'vue'
import { createSyncKitPlugin } from '@oxog/synckit/vue'
import { createBackgroundSyncPlugin } from '@oxog/synckit/plugins'
import { registerServiceWorker } from '@oxog/synckit/sw'

// Register service worker
await registerServiceWorker({ path: '/sw.js' })

const app = createApp(App)

app.use(createSyncKitPlugin({
  name: 'chat-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(\`/api/messages\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload)
    })
    return response.json()
  },
  plugins: [
    createBackgroundSyncPlugin({ tag: 'chat-sync' })
  ]
}))`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Component Implementation</h4>
            <div className="terminal-window">
              <div className="p-4">
                <pre className="text-sm overflow-x-auto">
                <code>{`<script setup lang="ts">
import { ref } from 'vue'
import { useSync, useSyncQueue, useOnline } from '@oxog/synckit/vue'

const { push } = useSync()
const { pending } = useSyncQueue()
const isOnline = useOnline()

const messages = ref([])
const newMessage = ref('')

const sendMessage = () => {
  const message = {
    id: Date.now(),
    text: newMessage.value,
    timestamp: Date.now(),
    status: 'pending'
  }

  messages.value.push(message)

  push({
    resource: 'messages',
    method: 'POST',
    payload: message
  })

  newMessage.value = ''
}
</script>

<template>
  <div class="chat-app">
    <header>
      <h1>Chat</h1>
      <div class="status">
        <span v-if="!isOnline">📡 Offline Mode</span>
        <span v-if="pending > 0">{{ pending }} messages queued</span>
      </div>
    </header>

    <div class="messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message"
      >
        <p>{{ msg.text }}</p>
        <span class="status">
          {{ msg.status === 'pending' ? '⏳' : '✓' }}
        </span>
      </div>
    </div>

    <form @submit.prevent="sendMessage">
      <input v-model="newMessage" placeholder="Type a message..." />
      <button type="submit">Send</button>
    </form>
  </div>
</template>`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="https://github.com/ersinkoc/synckit/tree/main/examples/vue-chat" target="_blank" rel="noreferrer">
                <Code className="mr-2 h-4 w-4" />
                View Source
              </a>
            </Button>
            <Button asChild>
              <a href="/playground?example=chat-app" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Try Live Demo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ECommerceExample() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>E-Commerce Shopping Cart</CardTitle>
              <CardDescription>
                Offline shopping cart with encryption and batching
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge>Svelte</Badge>
              <Badge variant="outline">TypeScript</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Add/remove items offline
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Encrypted cart data with AES-GCM
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Batch operations for performance
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Conflict resolution for cart updates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Compressed payload transfer
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Setup with Encryption & Batching</h4>
            <div className="terminal-window">
              <div className="p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`import { createSyncStore } from '@oxog/synckit/svelte'
import { createEncryptionPlugin, createBatchingPlugin, createCompressionPlugin } from '@oxog/synckit/plugins'

export const sync = createSyncStore({
  name: 'shop-cart',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(\`/api/cart\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload)
    })
    return response.json()
  },
  plugins: [
    createEncryptionPlugin({
      key: 'your-encryption-key'
    }),
    createBatchingPlugin({
      batchSize: 5,
      batchDelay: 1000
    }),
    createCompressionPlugin({
      algorithm: 'gzip'
    })
  ]
})`}</code>
              </pre>
            </div>
          </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Component Implementation</h4>
            <div className="terminal-window">
              <div className="p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`<script lang="ts">
  import { sync } from './stores'
  import { createQueueStore, createOnlineStore } from '@oxog/synckit/svelte'

  const queue = createQueueStore(sync.kernel)
  const isOnline = createOnlineStore(sync.kernel)

  let cart = []

  function addToCart(product) {
    cart = [...cart, product]

    sync.push({
      resource: 'cart/add',
      method: 'POST',
      payload: { productId: product.id, quantity: 1 }
    })
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId)

    sync.push({
      resource: 'cart/remove',
      method: 'POST',
      payload: { productId }
    })
  }

  function checkout() {
    sync.push({
      resource: 'cart/checkout',
      method: 'POST',
      payload: { items: cart },
      priority: 2 // High priority
    })
  }
</script>

<div class="cart">
  <header>
    <h2>Shopping Cart ({cart.length})</h2>
    <div class="status">
      {#if !$isOnline}
        <span class="offline">🔴 Offline</span>
      {/if}
      {#if $queue.pending > 0}
        <span>{$queue.pending} operations pending</span>
      {/if}
    </div>
  </header>

  <ul>
    {#each cart as item}
      <li>
        <span>{item.name} - ${item.price}</span>
        <button on:click={() => removeFromCart(item.id)}>Remove</button>
      </li>
    {/each}
  </ul>

  <button
    class="checkout"
    disabled={cart.length === 0}
    on:click={checkout}
  >
    Checkout
  </button>
</div>`}</code>
              </pre>
            </div>
          </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="https://github.com/ersinkoc/synckit/tree/main/examples/svelte-ecommerce" target="_blank" rel="noreferrer">
                <Code className="mr-2 h-4 w-4" />
                View Source
              </a>
            </Button>
            <Button asChild>
              <a href="/playground?example=ecommerce" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Try Live Demo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FormsExample() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Offline Form Submission</CardTitle>
              <CardDescription>
                Progressive form with auto-save and offline support
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge>Vanilla JS</Badge>
              <Badge variant="outline">TypeScript</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Auto-save form data as user types
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Submit forms while offline
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Draft persistence in IndexedDB
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Visual submission status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Automatic retry on network errors
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Setup</h4>
            <div className="terminal-window">
              <div className="p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`import { createSyncKit } from '@oxog/synckit'
import { createAnalyticsPlugin } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'contact-form',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload)
    })
    return response.json()
  },
  maxRetries: 5,
  plugins: [
    createAnalyticsPlugin({
      onMetric: (metric) => {
        console.log('Form metric:', metric)
      }
    })
  ]
})

await sync.init()`}</code>
              </pre>
            </div>
          </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Implementation</h4>
            <div className="terminal-window">
              <div className="p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`const form = document.querySelector('form')
const statusEl = document.querySelector('.status')

let autoSaveTimer

// Auto-save on input
form.addEventListener('input', () => {
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    const formData = new FormData(form)
    const data = Object.fromEntries(formData)

    // Save draft locally
    localStorage.setItem('form-draft', JSON.stringify(data))
    statusEl.textContent = 'Draft saved'
  }, 500)
})

// Submit form
form.addEventListener('submit', (e) => {
  e.preventDefault()

  const formData = new FormData(form)
  const data = Object.fromEntries(formData)

  // Queue submission
  const opId = sync.push({
    resource: 'contact',
    method: 'POST',
    payload: data,
    priority: 2 // High priority
  })

  statusEl.textContent = 'Submitting...'
  form.reset()
  localStorage.removeItem('form-draft')
})

// Listen for sync events
sync.on('sync-success', () => {
  statusEl.textContent = '✓ Submitted successfully!'
})

sync.on('sync-error', (event) => {
  statusEl.textContent = '⚠ Submission failed, will retry'
})

// Restore draft on load
const draft = localStorage.getItem('form-draft')
if (draft) {
  const data = JSON.parse(draft)
  Object.entries(data).forEach(([key, value]) => {
    const input = form.querySelector(\`[name="\${key}"]\`)
    if (input) input.value = value
  })
  statusEl.textContent = 'Draft restored'
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="https://github.com/ersinkoc/synckit/tree/main/examples/vanilla-form" target="_blank" rel="noreferrer">
                <Code className="mr-2 h-4 w-4" />
                View Source
              </a>
            </Button>
            <Button asChild>
              <a href="/playground?example=form" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Try Live Demo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
