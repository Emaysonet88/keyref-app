import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Create separate chunks for inventory data files
          if (id.includes('data/inventory')) {
            return 'inventory-data'
          }
        }
      }
    },
    assetsInlineLimit: 0 // Ensure JSON files are not inlined
  },
  publicDir: 'public'
})
