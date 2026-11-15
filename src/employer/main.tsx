// Entry point of the employer portal page (/employer/). Separate from the staff app (src/main.tsx) and the kiosk:
// it never loads the staff screens, and has its own look (employer.css) and its own sign-in cookie.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './employer.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
