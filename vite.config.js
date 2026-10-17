import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// During development, requests to /api are proxied to the Flask backend so the
// browser does not run into CORS issues. Override the target with
// VITE_BACKEND_URL in .env (default: http://localhost:5000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://localhost:5000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
        },
      },
    },
  }
})
