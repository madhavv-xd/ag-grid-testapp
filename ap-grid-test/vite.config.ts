import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls to the Bun/Hono backend so the frontend can use
      // origin-relative URLs with no CORS handling in dev.
      '/api': 'http://localhost:3000',
    },
  },
})
