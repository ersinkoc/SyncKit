export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="text-center text-sm leading-loose text-muted-foreground font-mono md:text-left">
          <span className="text-muted-foreground/80">//</span> Built by{' '}
          <a
            href="https://github.com/ersinkoc"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Ersin KOÇ
          </a>
          . Source code on{' '}
          <a
            href="https://github.com/ersinkoc/synckit"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            GitHub
          </a>
          .
        </div>
      </div>
    </footer>
  )
}
