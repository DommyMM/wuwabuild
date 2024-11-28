import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    define: {
      global: {},
      '__API_URL__': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:5000')
    },
    server: {
      port: 3000
    }
  }
})