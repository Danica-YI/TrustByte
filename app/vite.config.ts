import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // allow importing the generated data in ../data (shared with a future backend)
  server: {
    fs: { allow: ['..'] },
    // the Windy chat backend (server/main.py)
    proxy: { '/api': 'http://localhost:8787' },
  },
})
