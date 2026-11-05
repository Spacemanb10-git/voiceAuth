import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Flask backend (../backend) serves both route groups; Vite proxies them in
// development so the browser does not run into CORS issues:
//   /api/*     -> audio -> transcript -> form fields
//   /checkin/* -> photo + form -> SQLite
// Both default to http://localhost:5000; they can point at separate servers.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const extractBackend = env.VITE_EXTRACT_BACKEND_URL || 'http://localhost:5000'
  const checkinBackend = env.VITE_CHECKIN_BACKEND_URL || extractBackend

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: extractBackend, changeOrigin: true },
        '/checkin': { target: checkinBackend, changeOrigin: true },
      },
    },
  }
})
