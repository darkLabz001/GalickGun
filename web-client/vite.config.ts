import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/attacks': {
        target: 'http://localhost:3000',
      },
      '/configuration': {
        target: 'http://localhost:3000',
      },
    },
  },
})
