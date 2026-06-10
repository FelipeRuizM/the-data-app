import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// ── App version ─────────────────────────────────────────────────────────────
// Derived from git history so every push to GitHub bumps it automatically
// (the Pages workflow rebuilds on push, baking the new number in).
// Baseline: the rename to "The Data App" (commit 504ba75, 13th commit) = v2.0.0.
// Each commit after it bumps the patch; every 10 commits roll into the minor.
const V2_BASELINE_COMMITS = 13
function getAppVersion(): string {
  try {
    const count = Number(execSync('git rev-list --count HEAD').toString().trim())
    const n = Math.max(0, count - V2_BASELINE_COMMITS)
    return `2.${Math.floor(n / 10)}.${n % 10}`
  } catch {
    return '2.0.0' // git unavailable (e.g. building outside a checkout)
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/the-data-app/',
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
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
