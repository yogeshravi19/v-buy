import React from 'react'
import ReactDOM from 'react-dom/client'
import { WelcomePage } from './WelcomePage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WelcomePage
      onOpenApp={() => {
        // Points to the live deployed application URL or local dev
        const appUrl = import.meta.env.VITE_APP_URL || 'https://v-foods.vercel.app'
        window.location.href = appUrl
      }}
    />
  </React.StrictMode>,
)
