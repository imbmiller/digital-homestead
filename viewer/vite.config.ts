import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages: /digital-homestead/
  base: process.env.VITE_BASE_PATH || '/digital-homestead/',
})
