import React from 'react'
import { Compass, ArrowLeft, Home } from 'lucide-react'

interface NotFoundPageProps {
  onGoHome?: () => void
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  const handleHome = () => {
    if (onGoHome) {
      onGoHome()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/50">
          <Compass size={32} />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          404 Error
        </span>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1 mb-2">
          Page Not Found
        </h1>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          The requested address does not exist or may have been moved. Return to your dashboard to continue.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            onClick={handleHome}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Home size={14} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
