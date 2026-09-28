import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone Vite configuration for V-Foods Landing Page
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'oxc',
  },
})

