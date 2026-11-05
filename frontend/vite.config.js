import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two Flask backends are proxied in development so the browser does not run
// into CORS issues:
//   /api/*     -> extraction server (audio -> entities), default :5000
//   /checkin/* -> check-in server (snapshot + entities),  default :5001
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const extractBackend = env.VITE_EXTRACT_BACKEND_URL || 'http://localhost:5000'
  const checkinBackend = env.VITE_CHECKIN_BACKEND_URL || 'http://localhost:5001'

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
