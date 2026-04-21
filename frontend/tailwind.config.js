/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand — Gold
        primary: {
          50:  '#fdf8e7',
          100: '#faefc4',
          200: '#f5db85',
          300: '#f0c84a',
          400: '#e8b620',
          500: '#C9A227',  // main brand gold
          600: '#a8841f',
          700: '#856618',
          800: '#624a11',
          900: '#3f2f0a',
        },
        // Secondary — Dark gray (sidebar, topbar)
        secondary: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1F2937',  // main secondary
          900: '#111827',
        },
        // Background
        surface: '#F9FAFB',
        // Semantic
        success: '#10b981',
        danger:  '#ef4444',
        warning: '#f59e0b',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)',
        'card-lg': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};