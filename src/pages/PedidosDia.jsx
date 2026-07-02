import { useState, useEffect } from 'react'
import db from '../db'
import { showToast } from '../App'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function dayStr(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function dayLabel(offset) {
  if (offset === 0) return 'Hoy'
  if (offset === -1) return 'Ayer'
  if (offset === 1) return 'Mañana'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
}

function orderQty(o) {
  if (o.items) return o.items.reduce((s, i) => s + i.qty, 0)
  return o.qty || 0
}

function orderItemsLabel(o) {
  if (o.items) return o.items.map(i => `${i.plateName} x${i.qty}`).join(', ')
  return `${o.plateName} x${o.qty}`
}

export default function PedidosDia() {
  const [dayOffset, setDayOffset] = useState(0)
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ count: 0, paid: 0, pending: 0 })

  useEffect(() => { loadOrders() }, [dayOffset])

  useEffect(() => {
    const id = setInterval(() => {
      if (dayOffset !== 0) return
      loadOrders()
    }, 30000)
    return () => clearInterval(id)
  }, [dayOffset])

  async function loadOrders() {
    const date = dayStr(dayOffset)
    const all = await db.orders
      .where('date')
      .equals(date)
      .reverse()
      .toArray()

    setOrders(all.sort((a, b) => {
      const aPending = a.status !== 'pagado' ? 1 : 0
      const bPending = b.status !== 'pagado' ? 1 : 0
      return bPending - aPending || b.createdAt - a.createdAt
    }))

    const total = all.reduce((s, o) => s + o.total, 0)
    const paid = all.filter(o => o.status === 'pagado').reduce((s, o) => s + o.total, 0)
    setSummary({
      count: all.reduce((s, o) => s + orderQty(o), 0),
      paid,
      pending: total - paid
    })
  }

  async function togglePaid(order) {
    const wasPaid = order.status === 'pagado'
    const newStatus = wasPaid ? 'pendiente' : 'pagado'
    await db.orders.update(order.id, { status: newStatus })

    const c = await db.clients.get(order.clientId)
    if (c) {
      const debtAdjust = wasPaid ? order.total : -order.total
      await db.clients.update(order.clientId, {
        debt: Math.max(0, (c.debt || 0) + debtAdjust)
      })
    }

    loadOrders()
  }

  async function cancelOrder(order) {
    if (!confirm(`¿Anular pedido de ${order.clientName} por $${order.total.toLocaleString()}?`)) return

    if (order.status === 'pendiente') {
      const c = await db.clients.get(order.clientId)
      if (c) {
        await db.clients.update(order.clientId, {
          debt: Math.max(0, (c.debt || 0) - order.total)
        })
      }
    }

    await db.orders.delete(order.id)
    showToast('✕ Pedido anulado')
    loadOrders()
  }

  const payIcons = { efectivo: '💵', transferencia: '💳', fiado: '📋' }

  return (
    <div className="page">
      <h2 className="title-lg" style={{ marginBottom: 4 }}>Pedidos del día</h2>

      <div className="day-selector">
        <button onClick={() => setDayOffset(d => d - 1)} style={{ fontSize: 20, padding: 8, background: 'none', border: 'none' }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{dayLabel(dayOffset)}</span>
        <button onClick={() => setDayOffset(d => d + 1)} disabled={dayOffset >= 0} style={{ fontSize: 20, padding: 8, background: 'none', border: 'none', opacity: dayOffset >= 0 ? 0.3 : 1 }}>›</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="card stat-card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.count}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>🥗 Viandas</div>
        </div>
        <div className="card stat-card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>${summary.paid.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>💰 Cobrados</div>
        </div>
        <div className="card stat-card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>${summary.pending.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>⏳ Pendientes</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No hay pedidos para este día</p>
        </div>
      ) : (
        orders.map(o => {
          const isPaid = o.status === 'pagado'
          return (
            <div key={o.id} className="card" style={{
              opacity: isPaid ? 0.5 : 1,
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isPaid && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--success)', border: '2px solid var(--success)',
                    display: 'grid', placeItems: 'center', fontSize: 16, color: '#fff', flexShrink: 0,
                  }}>✓</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{o.clientName}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {o.time} · {orderItemsLabel(o)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 999, background: 'var(--bg)' }}>
                      {payIcons[o.payment] || '💵'} {o.payment}
                    </span>
                    <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 999, background: 'var(--bg)' }}>
                      {o.delivery === 'domicilio' ? '🏠' : '🚶'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>por {o.operator || '—'}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                  ${o.total.toLocaleString()}
                </div>
              </div>
              {!isPaid && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => togglePaid(o)}
                    style={{ flex: 1 }}
                  >
                    ✅ Confirmar pago
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => cancelOrder(o)}
                    style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  >
                    ✕ Anular
                  </button>
                </div>
              )}
              {isPaid && (
                <div style={{ marginTop: 8 }}>
                  <span className="badge badge-success">Pagado ✓</span>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
