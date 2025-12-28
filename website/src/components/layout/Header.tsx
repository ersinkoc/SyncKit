import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { Github, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2 group">
            <span className="text-xl font-bold font-mono text-emerald-500 group-hover:text-emerald-400 transition-colors">
              <span className="text-blue-400">&gt;</span> SYNCKIT
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-mono uppercase">
            <Link to="/docs" className="transition-colors hover:text-emerald-400 text-neutral-400">
              ./docs
            </Link>
            <Link to="/api" className="transition-colors hover:text-emerald-400 text-neutral-400">
              ./api
            </Link>
            <Link to="/examples" className="transition-colors hover:text-emerald-400 text-neutral-400">
              ./examples
            </Link>
            <Link to="/playground" className="transition-colors hover:text-emerald-400 text-neutral-400">
              ./playground
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" asChild className="hover:bg-emerald-500/10 hover:text-emerald-400">
              <a href="https://github.com/ersinkoc/synckit" target="_blank" rel="noreferrer">
                <Github className="h-5 w-5" />
              </a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
