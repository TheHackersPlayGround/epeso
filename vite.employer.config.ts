import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Builds ONLY the employer portal page (employer/index.html) into dist-employer/. This is what gets published on the
// public employer address: it contains none of the staff app or kiosk code.
// Build it with the API on the same address:   set VITE_API_BASE=/epeso_backend/api   (scripts/deploy-employer.ps1 does this)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-employer',
    emptyOutDir: true,
    rollupOptions: { input: { employer: resolve(__dirname, 'employer/index.html') } },
  },
})
