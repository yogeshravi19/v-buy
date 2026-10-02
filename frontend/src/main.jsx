import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles.css'
import './saas_dashboard.css'
import App from './App.jsx'

const WelcomePage = lazy(() =>
  import('./pages/landing/WelcomePage.tsx').then(m => ({ default: m.WelcomePage }))
)

const isWelcome = window.location.pathname === '/welcome' || window.location.pathname === '/welcome/'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isWelcome ? (
      <Suspense fallback={null}>
        <WelcomePage onOpenApp={() => { window.location.href = '/' }} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
