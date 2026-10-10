import '@fontsource-variable/plus-jakarta-sans'
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './styles.css'
import './saas_dashboard.css'
import App from './App.jsx'

// High-Traffic Campus Query Cache: Stale-While-Revalidate for 1,000+ students
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes data freshness
      gcTime: 1000 * 60 * 10,   // 10 minutes garbage collection retention
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
})

const WelcomePage = lazy(() =>
  import('./pages/landing/WelcomePage.tsx').then(m => ({ default: m.WelcomePage }))
)

const isWelcome = window.location.pathname === '/welcome' || window.location.pathname === '/welcome/'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isWelcome ? (
        <Suspense fallback={null}>
          <WelcomePage onOpenApp={() => { window.location.href = '/' }} />
        </Suspense>
      ) : (
        <App />
      )}
    </QueryClientProvider>
  </StrictMode>,
)

