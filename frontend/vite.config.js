import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    /*
     * Separate documents, not one app with a router. The sponsor page shares the
     * palette, the masthead and the sun, but none of the title screen's
     * machinery — no wave transition, no virtual scroll axis — so it
     * is cheaper and simpler as its own entry than as a route inside App.
     */
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        sponsor: resolve(import.meta.dirname, 'sponsor.html'),
        signup: resolve(import.meta.dirname, 'signup.html'),
      },
    },
  },
  envDir: path.resolve(__dirname, '..'),
})
