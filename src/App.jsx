import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import Layout from './components/Layout'
import Home from './pages/Home'
import NuevoPedido from './pages/NuevoPedido'
import Clientes from './pages/Clientes'
import PedidosDia from './pages/PedidosDia'
import Reportes from './pages/Reportes'
import Ajustes from './pages/Ajustes'
import Toast from './components/Toast'
import db from './db'

export const toastEvent = new EventTarget()

export function showToast(msg) {
  toastEvent.dispatchEvent(new CustomEvent('toast', { detail: msg }))
}

const defaultPlates = [
  { name: 'Milanesa con puré', price: 4000 },
  { name: 'Milanesa con arroz', price: 4000 },
  { name: 'Milanesa con rusa', price: 4000 },
  { name: 'Zapallito relleno', price: 4000 },
  { name: 'Pollo broster', price: 4000 },
  { name: 'Sopa de maní', price: 4000, offers: [{ label: '2x$5000', qty: 2, totalPrice: 5000 }] },
  { name: 'Sopa', price: 1500 },
  { name: 'Locro', price: 4000, offers: [{ label: '3x$10000', qty: 3, totalPrice: 10000 }] },
  { name: 'Napolitana', price: 4000 },
  { name: 'Chancho a la olla', price: 4000 },
  { name: 'Asado', price: 6000 },
  { name: 'Lengua a la vinagreta', price: 4000 },
  { name: 'Matambre', price: 4000 },
  { name: 'Pollo', price: 4000 },
  { name: 'Picante de pollo', price: 4000 },
  { name: 'Pastel de papa', price: 4000 },
  { name: 'Tortilla de papa', price: 4000 },
  { name: 'Lasaña', price: 4000 },
  { name: 'Matambre a la pizza', price: 4000 },
  { name: 'Tarta de jamón y queso', price: 4000 },
  { name: 'Tarta de atún', price: 4000 },
  { name: 'Canelones de choclo verdura y pollo', price: 4000 },
  { name: 'Fideos caseros normal', price: 4000 },
  { name: 'Fideos caseros de espinaca', price: 4000 },
  { name: 'Ñoquis caseros', price: 4000 },
  { name: 'Sorrentinos caseros', price: 4000 },
  { name: 'Ravioles caseros', price: 4000 },
  { name: 'Milanesas de carne o pollo', price: 4000 },
  { name: 'Lechón', price: 4000 },
  { name: 'Guiso de lentejas', price: 4000 },
]

async function seedData() {
  const count = await db.plates.count()
  if (count > 0) return
  await db.plates.bulkAdd(defaultPlates.map(p => ({ name: p.name, price: p.price, active: 1, offers: p.offers || [], sopaPrice: p.sopaPrice ?? 1000 })))
}

async function migratePlates() {
  const plates = await db.plates.toArray()
  for (const plate of plates) {
    if (['Bandeja', 'Bandeja sola', 'Menú sopa+bandeja'].includes(plate.name)) {
      await db.plates.delete(plate.id)
      continue
    }
    const updates = {}
    if (plate.sopaPrice === undefined || plate.sopaPrice === 0) {
      updates.sopaPrice = 1000
    }
    if (!plate.offers || plate.offers.length === 0) {
      if (plate.name === 'Locro') updates.offers = [{ label: '3x$10000', qty: 3, totalPrice: 10000 }]
      else if (plate.name === 'Sopa de maní') updates.offers = [{ label: '2x$5000', qty: 2, totalPrice: 5000 }]
    }
    if (Object.keys(updates).length > 0) {
      await db.plates.update(plate.id, updates)
    }
  }
}

function App() {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  useEffect(() => {
    seedData().then(migratePlates)

    window.addEventListener('beforeunload', (e) => {
      e.preventDefault()
      e.returnValue = ''
    })

    let handler
    ;(async () => {
      try {
        handler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back()
          } else {
            setShowCloseConfirm(true)
          }
        })
      } catch (_) {}
    })()

    return () => {
      if (handler) handler.remove()
    }
  }, [])

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nuevo-pedido" element={<NuevoPedido />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/pedidos" element={<PedidosDia />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Routes>
      </Layout>

      <Toast eventTarget={toastEvent} />

      {showCloseConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(61, 44, 46, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowCloseConfirm(false) }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 24,
            width: '85%', maxWidth: 320,
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              ¿Seguro deseas cerrar la app?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
              Los pedidos guardados no se pierden.
            </p>
            <button className="btn btn-primary" onClick={async () => { setShowCloseConfirm(false); try { await CapacitorApp.exitApp() } catch (_) {} }} style={{ marginBottom: 8 }}>
              Cerrar
            </button>
            <button className="btn btn-outline" onClick={() => setShowCloseConfirm(false)}>
              Seguir
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
