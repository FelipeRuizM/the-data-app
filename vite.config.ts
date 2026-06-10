import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/the-data-app/',
  build: {
    rollupOptions: {
      output: {
        // Split the heavy vendors into their own cacheable chunks so the
        // initial bundle isn't one monolithic file.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
        },
      },
    },
  },
})
