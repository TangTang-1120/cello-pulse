import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base:
    process.env.ELECTRON_BUILD === '1'
      ? './'
      : process.env.VITE_BASE || '/',
  plugins: [react()],
})
