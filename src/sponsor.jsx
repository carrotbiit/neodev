import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted so the page never waits on (or depends on) a font CDN.
import '@fontsource/press-start-2p'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/chakra-petch/700.css'
import './index.css'
import SponsorPage from './components/SponsorPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SponsorPage />
  </StrictMode>,
)
