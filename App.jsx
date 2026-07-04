import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, Command, Sparkles } from 'lucide-react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BackgroundEffects from './components/sections/BackgroundEffects'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import Skills from './components/sections/Skills'
import Projects from './components/sections/Projects'
import Experience from './components/sections/Experience'
import Services from './components/sections/Services'
import Testimonials from './components/sections/Testimonials'
import Contact from './components/sections/Contact'

const sectionMeta = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'services', label: 'Services' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'contact', label: 'Contact' },
]

function App() {
  const [activeSection, setActiveSection] = useState('home')
  const [isLoading, setIsLoading] = useState(true)
  const [showTopButton, setShowTopButton] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
      setShowTopButton(window.scrollY > 480)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll('section[id]'))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { threshold: [0.2, 0.4, 0.6], rootMargin: '-10% 0px -30% 0px' },
    )

    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }

      if (event.key === 'Escape') {
        setCommandOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return undefined

    const handlePointerMove = (event) => {
      document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`)
      document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`)
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const commandItems = useMemo(
    () =>
      sectionMeta.map((section) => ({
        ...section,
        icon: <Sparkles size={16} />,
      })),
    [],
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#090909] text-white">
      <BackgroundEffects />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="cursor-glow" />
      </div>

      <div className="relative z-10">
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-white/10">
          <div className="h-full bg-electric transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
        </div>
        <Navbar activeSection={activeSection} onNavigate={scrollToSection} onOpenCommandPalette={() => setCommandOpen(true)} />

        <main>
          <Hero onNavigate={scrollToSection} />
          <About />
          <Skills />
          <Projects />
          <Experience />
          <Services />
          <Testimonials />
          <Contact />
        </main>

        <Footer />
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#090909]"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-electric" />
                <span className="h-3 w-3 rounded-full bg-white/60" />
                <span className="h-3 w-3 rounded-full bg-electric/40" />
              </div>
              <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Loading portfolio</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 px-4 py-16 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-[#101010]/90 p-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-slate-300">
                <Command size={18} className="text-electric" />
                <input
                  autoFocus
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Jump to a section"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      const first = commandItems[0]
                      scrollToSection(first.id)
                      setCommandOpen(false)
                    }
                  }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {commandItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      scrollToSection(item.id)
                      setCommandOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-electric/10 p-2 text-electric">{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.id}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTopButton && (
          <motion.button
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-[60] rounded-full border border-electric/30 bg-electric/[0.15] p-3 text-electric shadow-glow backdrop-blur"
            aria-label="Scroll to top"
          >
            <ChevronUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
