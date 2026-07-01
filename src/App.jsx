import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
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
  { name: 'Bandeja', price: 4000, sopaPrice: 1000 },
]

async function seedData() {
  const count = await db.plates.count()
  if (count > 0) return
  await db.plates.bulkAdd(defaultPlates.map(p => ({ name: p.name, price: p.price, active: 1, offers: p.offers || [], sopaPrice: p.sopaPrice || 0 })))
}

function App() {
  useEffect(() => { seedData() }, [])

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
    </>
  )
}

export default App
