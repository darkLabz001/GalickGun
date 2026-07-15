/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'galactic': {
          'dark': '#050510',
          'darker': '#0a0a1a',
          'purple': '#8b5cf6',
          'blue': '#3b82f6',
          'cyan': '#06b6d4',
          'pink': '#ec4899',
          'green': '#10b981',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.3s ease-in-out infinite',
        'glow': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '10%': { transform: 'translateX(-2px) translateY(-1px)' },
          '20%': { transform: 'translateX(2px) translateY(1px)' },
          '30%': { transform: 'translateX(-3px) translateY(0)' },
          '40%': { transform: 'translateX(3px) translateY(-1px)' },
          '50%': { transform: 'translateX(-2px) translateY(1px)' },
          '60%': { transform: 'translateX(2px) translateY(0)' },
          '70%': { transform: 'translateX(-1px) translateY(-1px)' },
          '80%': { transform: 'translateX(1px) translateY(1px)' },
          '90%': { transform: 'translateX(-1px) translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
