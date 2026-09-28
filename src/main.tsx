import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EntitlementProvider } from './billing/EntitlementContext.tsx'
import './index.css'
import App from './App.tsx'

const params = new URLSearchParams(window.location.search)
if (params.has('desktop') || /\bElectron\b/.test(navigator.userAgent)) {
  document.documentElement.classList.add('desktop')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EntitlementProvider>
      <App />
    </EntitlementProvider>
  </StrictMode>,
)
