import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shield, BarChart3, Bell, FileText, Smartphone,
  Wifi, WifiOff, Camera, Clock, Users, ChevronRight,
  Activity, Zap, Globe, ArrowRight, Menu, X, Download
} from 'lucide-react'
import { useState } from 'react'
import WaterBackground from '../../components/landing/WaterBackground'
import HeroWaterAnimation from '../../components/landing/HeroWaterAnimation'
import FlowingParticles from '../../components/landing/FlowingParticles'
import StatsCounter from '../../components/landing/StatsCounter'

/* ─── Fade-in section wrapper ─── */
const FadeInSection = ({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Stagger children wrapper ─── */
const StaggerContainer = ({ children, className = '' }: {
  children: React.ReactNode; className?: string
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerChild = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
}

/* ─── Feature Card ─── */
const FeatureCard = ({ icon: Icon, title, description, gradient }: {
  icon: any; title: string; description: string; gradient: string
}) => (
  <motion.div
    variants={staggerChild}
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    className="group relative cursor-pointer"
  >
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
         style={{ background: gradient }} />
    <div className="relative bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8
                    hover:border-teal-500/30 transition-all duration-500 h-full">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6
                       bg-gradient-to-br shadow-lg`}
           style={{ background: gradient }}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  </motion.div>
)

/* ─── How it works step ─── */
const StepCard = ({ number, title, description, icon: Icon }: {
  number: number; title: string; description: string; icon: any
}) => (
  <motion.div variants={staggerChild} className="relative">
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500
                        flex items-center justify-center shadow-lg shadow-teal-500/25">
          <Icon className="w-9 h-9 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-900
                        border-2 border-teal-400 flex items-center justify-center">
          <span className="text-xs font-bold text-teal-400">{number}</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{description}</p>
    </div>
  </motion.div>
)

/* ─── MAIN LANDING PAGE ─── */
const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95])

  const features = [
    { icon: BarChart3, title: 'Data Dashboard', description: 'Monitor manually inputted influent & effluent data with charts, compliance indicators, and anomaly detection.', gradient: 'linear-gradient(135deg, #14b8a6, #06b6d4)' },
    { icon: Smartphone, title: 'Mobile-First PWA', description: 'Capture data in the field with our installable Progressive Web App — works on any device.', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    { icon: Users, title: 'Operator Input', description: 'Simple and intuitive manual data entry interface for operators to log measurements accurately.', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    { icon: Camera, title: 'Timestamp Camera', description: 'Built-in camera with automatic timestamp & parameter watermarks baked into every photo.', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
    { icon: FileText, title: 'Automated Reports', description: 'Schedule daily, weekly, or monthly compliance PDF reports delivered to stakeholders via email.', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    { icon: Shield, title: 'RBAC Security', description: 'Role-based access control with Admin, Operator, and Client roles — each sees only what they need.', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  ]

  const steps = [
    { icon: Smartphone, title: 'Capture Data', description: 'Operators input influent & effluent measurements via the mobile PWA.' },
    { icon: Wifi, title: 'Sync to Cloud', description: 'Data is sent to Supabase via Cloudflare Workers. Zero-downtime, zero-cost infrastructure.' },
    { icon: BarChart3, title: 'Visualize & Analyze', description: 'Admins and clients view dashboards, trend graphs, and compliance status.' },
    { icon: Bell, title: 'Get Notified', description: 'Automated alerts when parameters exceed regulatory limits. Never miss a violation.' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Water Background */}
      <WaterBackground />

      {/* ─── NAVBAR ─── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-4 mt-4">
          <div className="max-w-7xl mx-auto bg-slate-900/70 backdrop-blur-2xl border border-slate-700/40
                          rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/20">
            <Link to="/" className="flex items-center gap-3 cursor-pointer">
              <img src="/Official Header logo.png" alt="Logo" className="h-10 w-auto" />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-300 hover:text-teal-400 transition-colors duration-200 cursor-pointer">Features</a>
              <a href="#how-it-works" className="text-sm text-slate-300 hover:text-teal-400 transition-colors duration-200 cursor-pointer">How It Works</a>
              <a href="#stats" className="text-sm text-slate-300 hover:text-teal-400 transition-colors duration-200 cursor-pointer">Impact</a>
              <a href="#cta" className="text-sm text-slate-300 hover:text-teal-400 transition-colors duration-200 cursor-pointer">Get Started</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <a href="/Wil-C-Operator.apk" download
                className="px-4 py-2 text-sm text-teal-400 hover:text-teal-300 border border-teal-500/30
                           hover:border-teal-400 rounded-xl transition-all duration-200 cursor-pointer
                           flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Download App
              </a>
              <Link to="/login/operator"
                className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600
                           hover:border-slate-500 rounded-xl transition-all duration-200 cursor-pointer">
                Operator Login
              </Link>
              <Link to="/login/aquadash"
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500
                           hover:from-teal-400 hover:to-cyan-400 rounded-xl transition-all duration-200
                           shadow-lg shadow-teal-500/25 cursor-pointer">
                Sign In
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white cursor-pointer p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden mt-2 max-w-7xl mx-auto bg-slate-900/95 backdrop-blur-2xl
                         border border-slate-700/40 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)}
                   className="text-slate-300 hover:text-teal-400 transition-colors py-2 cursor-pointer">Features</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}
                   className="text-slate-300 hover:text-teal-400 transition-colors py-2 cursor-pointer">How It Works</a>
                <a href="#stats" onClick={() => setMobileMenuOpen(false)}
                   className="text-slate-300 hover:text-teal-400 transition-colors py-2 cursor-pointer">Impact</a>
              <hr className="border-slate-700" />
              <a href="/Wil-C-Operator.apk" download
                className="text-teal-400 hover:text-teal-300 py-2 cursor-pointer flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Operator App
              </a>
              <Link to="/login/operator" className="text-slate-300 hover:text-white py-2 cursor-pointer">
                Operator Login
              </Link>
                <Link to="/login/aquadash"
                  className="w-full text-center px-5 py-3 font-medium text-white bg-gradient-to-r from-teal-500
                             to-cyan-500 rounded-xl cursor-pointer">
                  Sign In
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      {/* ─── HERO SECTION ─── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-4"
      >
        <FlowingParticles />
        <HeroWaterAnimation />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10
                       border border-teal-500/20 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-sm text-teal-400 font-medium">Manual Data Tracking • Zero-Cost Infrastructure</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6"
          >
            <span className="text-white">Wastewater</span>
            <br />
            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Monitoring System
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed"
          >
            Log influent & effluent parameters manually.
            Auto-generate compliance reports, and never miss an exceedance — all from your phone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/login/aquadash"
              className="group flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white
                         bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl shadow-2xl
                         shadow-teal-500/30 hover:shadow-teal-500/50 hover:from-teal-400 hover:to-cyan-400
                         transition-all duration-300 cursor-pointer">
              Open Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-8 py-4 text-lg font-medium text-slate-300
                         border border-slate-600 hover:border-teal-500/50 hover:text-white
                         rounded-2xl transition-all duration-300 cursor-pointer">
              Explore Features
              <ChevronRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="relative py-24 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-teal-400 text-sm font-semibold uppercase tracking-wider">Powerful Capabilities</span>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mt-3 mb-4">
              Everything You Need to Stay Compliant
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From field data capture to automated compliance reporting — purpose-built for
              wastewater treatment professionals.
            </p>
          </FadeInSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="relative py-24 sm:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-500/[0.03] to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <FadeInSection className="text-center mb-16">
            <span className="text-teal-400 text-sm font-semibold uppercase tracking-wider">Simple Workflow</span>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mt-3 mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Four steps from field to compliance — no training required.
            </p>
          </FadeInSection>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {steps.map((step, i) => (
              <StepCard key={i} number={i + 1} {...step} />
            ))}
          </StaggerContainer>

          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[calc(50%+1.5rem)] left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        </div>
      </section>

      {/* ─── STATS / IMPACT ─── */}
      <section id="stats" className="relative py-24 sm:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-teal-400 text-sm font-semibold uppercase tracking-wider">Real Impact</span>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mt-3 mb-4">
              Built for Scale
            </h2>
          </FadeInSection>

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCounter end={99.9} suffix="%" label="Uptime SLA" icon={Zap} />
            <StatsCounter end={500} suffix="+" label="Data Points / Day" icon={Activity} />
            <StatsCounter end={24} suffix="/7" label="Monitoring" icon={Clock} />
            <StatsCounter end={100} suffix="%" label="Compliance Rate" icon={Shield} />
          </StaggerContainer>
        </div>
      </section>

      {/* ─── TECH STACK BADGE ─── */}
      <section className="relative py-16 px-4">
        <FadeInSection className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 sm:p-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Zero-Cost Cloud Architecture</h3>
              <p className="text-slate-400">Powered by modern edge infrastructure</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: 'React', color: 'from-cyan-500 to-blue-500' },
                { name: 'Cloudflare Workers', color: 'from-orange-400 to-amber-500' },
                { name: 'Supabase', color: 'from-emerald-400 to-green-500' },
                { name: 'PWA', color: 'from-purple-500 to-indigo-500' },
                { name: 'TypeScript', color: 'from-blue-400 to-blue-600' },
                { name: 'Tailwind CSS', color: 'from-teal-400 to-cyan-500' },
              ].map((tech) => (
                <motion.div
                  key={tech.name}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="px-5 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50
                             hover:border-slate-500 transition-colors duration-200 cursor-pointer"
                >
                  <span className={`text-sm font-medium bg-gradient-to-r ${tech.color} bg-clip-text text-transparent`}>
                    {tech.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section id="cta" className="relative py-24 sm:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-t from-teal-500/[0.05] to-transparent" />
        <FadeInSection className="max-w-4xl mx-auto text-center relative z-10">
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-blue-500/20
                            rounded-[2rem] blur-3xl opacity-50" />
            <div className="relative bg-slate-800/60 backdrop-blur-2xl border border-slate-700/50
                            rounded-3xl p-10 sm:p-16">
              <Globe className="w-12 h-12 text-teal-400 mx-auto mb-6" />
              <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
                Ready to Go Digital?
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
                Join the next generation of wastewater monitoring. Deploy in minutes,
                zero infrastructure costs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/Wil-C-Operator.apk" download
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold
                             text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl
                             shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50
                             hover:from-teal-400 hover:to-cyan-400 transition-all duration-300 cursor-pointer">
                  <Download className="w-5 h-5" />
                  Download Operator App
                </a>
                <Link to="/login/operator"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium
                             text-slate-300 border border-slate-600 hover:border-teal-500/50
                             hover:text-white rounded-2xl transition-all duration-300 cursor-pointer">
                  <Users className="w-5 h-5" />
                  Operator Portal
                </Link>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative border-t border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/For Dashboard and Fave Icon.png" alt="Logo" className="h-8 w-auto" />
            <span className="text-sm text-slate-400">
              © {new Date().getFullYear()} — Wastewater Dashboard
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">How It Works</a>
            <Link to="/login/aquadash" className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
