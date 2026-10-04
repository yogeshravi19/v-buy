import React from 'react'
import ReactDOM from 'react-dom/client'
import { WelcomePage } from './WelcomePage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WelcomePage
      onOpenApp={() => {
        // Points to the live deployed application on Render or custom VITE_APP_URL
        const appUrl = import.meta.env.VITE_APP_URL || 'https://vfoods.onrender.com'
        window.location.href = appUrl
      }}
    />
  </React.StrictMode>,
)
