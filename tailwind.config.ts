import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          panel: '#111111',
          raised: '#171717',
        },
        border: {
          DEFAULT: '#262626',
          subtle: '#1a1a1a',
        },
        ink: {
          DEFAULT: '#ededed',
          muted: '#a3a3a3',
          faint: '#737373',
        },
        accent: {
          DEFAULT: '#3b82f6',
        },
        good: '#22c55e',
        warn: '#eab308',
        bad: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
