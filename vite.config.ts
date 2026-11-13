import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The applicant kiosk page lives at /apply/ (apply/index.html). In dev, "/apply" without the
// trailing slash would fall through to the staff app, so send it to "/apply/" (Apache already
// does the same for a folder in production).
const kioskSlashRedirect = (): Plugin => ({
  name: 'kiosk-slash-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/apply' || req.url?.startsWith('/apply?')) {
        res.statusCode = 302
        res.setHeader('Location', '/apply/' + (req.url.slice('/apply'.length)))
        res.end()
        return
      }
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), kioskSlashRedirect()],
  build: {
    // Two pages in one build: the staff app (index.html) and the applicant kiosk (apply/index.html).
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        apply: resolve(__dirname, 'apply/index.html'),
      },
    },
  },
})
