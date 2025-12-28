import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Zap, Shield, Package, Blocks, Wifi, Database, Code, Check } from 'lucide-react'

export function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-4 py-24 md:py-32 relative">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center relative z-10">
          <div className="inline-block text-sm font-mono text-neutral-500 mb-4">
            <span className="text-emerald-400">$</span> npm install @oxog/synckit
          </div>
          <h1 className="text-4xl font-mono font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            OFFLINE-FIRST DATA SYNC
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              {' '}MADE SIMPLE
            </span>
          </h1>
          <p className="max-w-[750px] text-lg text-neutral-400 sm:text-xl font-mono">
            <span className="text-neutral-500">//</span> Zero-dependency toolkit for building offline-first applications.<br/>
            <span className="text-neutral-500">//</span> Sync data seamlessly with micro-kernel plugin architecture.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-600 text-black font-mono uppercase glow-emerald">
              <Link to="/docs">
                <span className="mr-2">&gt;</span> Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-neutral-700 hover:bg-neutral-800 hover:border-emerald-500 font-mono uppercase">
              <a href="https://github.com/ersinkoc/synckit" target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="mt-12 w-full max-w-4xl terminal-window relative">
          <div className="terminal-header">
            <div className="terminal-dot bg-red-500"></div>
            <div className="terminal-dot bg-yellow-500"></div>
            <div className="terminal-dot bg-green-500"></div>
            <span className="text-xs text-neutral-500 font-mono ml-2">~/@oxog/synckit/example.ts</span>
          </div>
          <pre className="overflow-x-auto text-sm text-zinc-50 p-6 pt-8">
            <code>
              <span className="text-blue-400">import</span> {`{ `}<span className="text-purple-400">createSyncKit</span> {`} `}<span className="text-blue-400">from</span> <span className="text-emerald-400">'@oxog/synckit'</span>{`\n\n`}
              <span className="text-blue-400">const</span> sync <span className="text-rose-400">=</span> <span className="text-purple-400">createSyncKit</span>({`({\n`}
              {`  name: `}<span className="text-emerald-400">'my-app'</span>{`,\n`}
              {`  storage: `}<span className="text-emerald-400">'indexeddb'</span>{`,\n`}
              {`  executor: `}<span className="text-blue-400">async</span> (operation) <span className="text-blue-400">=&gt;</span> {`{\n`}
              {`    `}<span className="text-blue-400">const</span> res <span className="text-rose-400">=</span> <span className="text-blue-400">await</span> <span className="text-purple-400">fetch</span>(<span className="text-emerald-400">{`\`/api/\${`}<span className="text-amber-400">{`operation.resource`}</span>{`}\``}</span>{`, {\n`}
              {`      method: operation.method,\n`}
              {`      body: JSON.`}<span className="text-purple-400">stringify</span>{`(operation.payload)\n`}
              {`    })\n`}
              {`    `}<span className="text-blue-400">return</span> res.<span className="text-purple-400">json</span>{`()\n`}
              {`  }\n`}
              {`})\n\n`}
              <span className="text-blue-400">await</span> sync.<span className="text-purple-400">init</span>{`()\n\n`}
              <span className="text-neutral-500">{`// Push operations - they sync automatically!`}</span>{`\n`}
              sync.<span className="text-purple-400">push</span>({`({\n`}
              {`  resource: `}<span className="text-emerald-400">'todos'</span>{`,\n`}
              {`  method: `}<span className="text-emerald-400">'POST'</span>{`,\n`}
              {`  payload: { title: `}<span className="text-emerald-400">'Buy groceries'</span>{`, completed: `}<span className="text-amber-400">false</span> {`}\n`}
              {`})`}
            </code>
          </pre>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24 bg-muted/50">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center mb-12">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Powerful Features
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground">
            Everything you need to build robust offline-first applications
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-purple-600" />}
            title="Zero Dependencies"
            description="Pure TypeScript implementation using only browser APIs. No external dependencies."
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10 text-purple-600" />}
            title="Type-Safe"
            description="Full TypeScript support with strict mode. Generic types for payload and results."
          />
          <FeatureCard
            icon={<Package className="h-10 w-10 text-purple-600" />}
            title="Tiny Bundle"
            description="Core is only 251 bytes! Tree-shakeable architecture keeps your bundle small."
          />
          <FeatureCard
            icon={<Blocks className="h-10 w-10 text-purple-600" />}
            title="Plugin Architecture"
            description="Micro-kernel with plugin system. Extend functionality with optional plugins."
          />
          <FeatureCard
            icon={<Wifi className="h-10 w-10 text-purple-600" />}
            title="Offline-First"
            description="Queue operations offline, sync automatically when connection restored."
          />
          <FeatureCard
            icon={<Database className="h-10 w-10 text-purple-600" />}
            title="IndexedDB Storage"
            description="Persistent storage with IndexedDB. Fallback to localStorage available."
          />
        </div>
      </section>

      {/* Framework Support */}
      <section className="container py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center mb-12">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Framework Adapters
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground">
            First-class support for React, Vue, and Svelte
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Code className="h-8 w-8 text-[#61DAFB]" />
              <CardTitle>React</CardTitle>
              <CardDescription>Hooks & Context Provider</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useSync</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useSyncStatus</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useSyncQueue</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useOnline</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Code className="h-8 w-8 text-[#42B883]" />
              <CardTitle>Vue</CardTitle>
              <CardDescription>Composables & Plugin</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useSync</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useSyncStatus</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useSyncQueue</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> useOnline</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Code className="h-8 w-8 text-[#FF3E00]" />
              <CardTitle>Svelte</CardTitle>
              <CardDescription>Stores & Reactive</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> createSyncStore</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> createStatusStore</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> createQueueStore</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-600" /> createOnlineStore</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 bg-muted/50">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Ready to Get Started?
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground">
            Install SyncKit and start building offline-first applications today
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Button size="lg" asChild>
              <Link to="/docs">Read the Docs</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/playground">Try it Out</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        {icon}
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
