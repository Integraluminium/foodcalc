import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The SPA authenticates via session cookies, so API calls must be
      // same-origin: in dev, /api is proxied to the axum server.
      // 127.0.0.1 instead of `localhost`: Node resolves localhost to ::1
      // (IPv6) first, but the backend binds to 0.0.0.0 (IPv4 only).
      '/api': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
})

