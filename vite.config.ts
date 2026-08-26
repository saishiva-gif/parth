import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run dev` proxies /api to dev_server.py (a local-only stand-in for
// Vercel's serverless routing — see that file's docstring). In production,
// Vercel serves api/*.py directly and this proxy is unused.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
