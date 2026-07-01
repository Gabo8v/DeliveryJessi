import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

;(async () => {
  if (!sessionStorage.getItem('sw_done')) {
    let needsReload = false
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) { reg.unregister(); needsReload = true }
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      if (keys.length > 0) needsReload = true
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    sessionStorage.setItem('sw_done', '1')
    if (needsReload) { window.location.reload(); return }
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})()
