// Entry point of the applicant kiosk page (/apply/). Separate from the staff app (src/main.tsx):
// it never loads the staff screens, and its address lookups use the public kiosk endpoints.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import { switchToKioskLocations } from '../services/locationService'
import KioskApp from './KioskApp'

switchToKioskLocations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KioskApp />
  </StrictMode>,
)
