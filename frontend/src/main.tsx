import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f8fafc' }}>
          <div style={{ maxWidth: '640px', width: '100%' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Something went wrong</h1>
            <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>
              The app failed to load. Please try a hard refresh (Ctrl/Cmd + Shift + R). If the problem continues, share the error below:
            </p>
            <pre style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#fca5a5', overflowX: 'auto' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Service worker registration is handled by vite-plugin-pwa's registerSW.js
// (injected into index.html). The workbox config in vite.config.ts sets
// skipWaiting + clientsClaim so new deploys activate immediately.

// Surface early (pre-render) load errors instead of a silent white screen.
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
    console.error('Resource failed to load:', (target as HTMLScriptElement).src || (target as HTMLLinkElement).href)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={window.location.pathname.startsWith('/pwa') ? '/pwa' : undefined}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)