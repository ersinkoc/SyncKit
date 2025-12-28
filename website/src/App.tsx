import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Home } from './pages/Home'
import { Docs } from './pages/Docs'
import { API } from './pages/API'
import { Examples } from './pages/Examples'
import { Playground } from './pages/Playground'

function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/docs/*" element={<Docs />} />
            <Route path="/api/*" element={<API />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}

export default App
