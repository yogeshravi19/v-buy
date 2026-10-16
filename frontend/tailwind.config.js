/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF', // Canonical Royal Blue
          900: '#1E3A8A',
          950: '#172554',
        },
        emerald: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669', // Canonical Emerald (Veg & Success)
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        slate: {
          850: '#131F33',
          900: '#0F172A', // Canonical Dark Slate
          950: '#0B192C',
        },
        surface: {
          50:  '#F8FAFC', // Light Gray background
          100: '#F1F5F9', // Secondary subtle surface
          200: '#E2E8F0', // Border
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(15,23,42,0.06), 0 1px 3px -1px rgba(15,23,42,0.04)',
        elevated: '0 10px 25px -4px rgba(15,23,42,0.08), 0 4px 10px -2px rgba(15,23,42,0.04)',
        modal: '0 20px 40px -6px rgba(15,23,42,0.16)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':   'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
