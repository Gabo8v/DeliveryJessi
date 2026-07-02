import { useState, useEffect } from 'react'
import db from '../db'
import { showToast } from '../App'
import BottomSheet from '../components/BottomSheet'

export default function Clientes() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientOrders, setClientOrders] = useState([])
  const [showDetail, setShowDetail] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '', fiado: false })

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const c = await db.clients.toArray()
    setClients(c)
  }

  const filtered = search
    ? clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
      )
    : clients

  async function showClientDetail(c) {
    setSelectedClient(c)
    const orders = await db.orders
      .where('clientId')
      .equals(c.id)
      .reverse()
      .toArray()
    setClientOrders(orders.slice(0, 20))
    setShowDetail(true)
  }

  async function addClient() {
    if (!newClient.name.trim()) {
      showToast('Ingresá un nombre')
      return
    }
    await db.clients.add({
      name: newClient.name.trim(),
      phone: newClient.phone.trim(),
      address: newClient.address.trim(),
      fiado: newClient.fiado,
      debt: 0
    })
    setShowAddModal(false)
    setNewClient({ name: '', phone: '', address: '', fiado: false })
    await loadClients()
    showToast('✅ Cliente agregado')
  }

  async function registerPayment() {
    if (!paymentAmount || !selectedClient) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      showToast('Ingresá un monto válido')
      return
    }

    await db.payments.add({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      amount,
      date: paymentDate,
      createdAt: Date.now()
    })

    const c = await db.clients.get(selectedClient.id)
    if (c) {
      await db.clients.update(selectedClient.id, {
        debt: Math.max(0, (c.debt || 0) - amount)
      })
    }

    setShowPaymentModal(false)
    setPaymentAmount('')
    await loadClients()
    if (selectedClient) showClientDetail(await db.clients.get(selectedClient.id))
    showToast('✅ Pago registrado')
  }

  return (
    <div className="page">
      <h2 className="title-lg" style={{ marginBottom: 4 }}>Clientes</h2>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="input-field"
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No hay clientes</p>
        </div>
      ) : (
        filtered.map(c => (
          <div
            key={c.id}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 12 }}
            onClick={() => showClientDetail(c)}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{c.phone || '—'}</div>
            </div>
            <div>
              {(c.debt || 0) > 0
                ? <span className="badge badge-danger">${(c.debt || 0).toLocaleString()}</span>
                : <span className="badge badge-success">Al día</span>
              }
            </div>
          </div>
        ))
      )}

      <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ marginTop: 12 }}>
        + Agregar cliente
      </button>

      {/* Client detail modal */}
      <BottomSheet show={showDetail && !!selectedClient} onClose={() => setShowDetail(false)} height="90vh">
        {selectedClient && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{selectedClient.name}</h3>
              {(selectedClient.debt || 0) > 0
                ? <span className="badge badge-danger">${(selectedClient.debt || 0).toLocaleString()} deuda</span>
                : <span className="badge badge-success">Al día</span>
              }
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              {selectedClient.phone || 'Sin teléfono'}
              {selectedClient.address ? ` · ${selectedClient.address}` : ''}
            </div>

            <div className="section-title">Historial de pedidos</div>
            {clientOrders.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--muted)', padding: '8px 0' }}>Sin pedidos</div>
            ) : (
              clientOrders.map(o => (
                <div key={o.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14
                }}>
                  <span>{o.date} {o.time} · {o.items ? o.items.map(i => `${i.plateName} x${i.qty}`).join(', ') : `${o.plateName} x${o.qty}`}</span>
                  <span style={{ fontWeight: 600 }}>${o.total.toLocaleString()}</span>
                </div>
              ))
            )}

            <div className="section-title" style={{ marginTop: 16 }}>
              Deuda total: <strong>${(selectedClient.debt || 0).toLocaleString()}</strong>
            </div>

            <button className="btn btn-primary" onClick={() => { setShowPaymentModal(true); setPaymentAmount('') }} style={{ marginTop: 12 }}>
              Registrar pago
            </button>
            <button className="btn btn-outline" onClick={() => setShowDetail(false)} style={{ marginTop: 8 }}>
              Cerrar
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet show={showAddModal} onClose={() => setShowAddModal(false)}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nuevo cliente</h3>

        <div className="input-group">
          <input className="input-field" placeholder="Nombre completo"
            value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="input-group">
          <input className="input-field" placeholder="Teléfono" type="tel"
            value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div className="input-group">
          <input className="input-field" placeholder="Dirección"
            value={newClient.address} onChange={e => setNewClient(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" style={{ width: 20, height: 20 }}
            checked={newClient.fiado} onChange={e => setNewClient(p => ({ ...p, fiado: e.target.checked }))} />
          <label style={{ fontSize: 14 }}>¿Es fiado?</label>
        </div>

        <button className="btn btn-primary" onClick={addClient}>Agregar cliente</button>
        <button className="btn btn-outline" onClick={() => setShowAddModal(false)} style={{ marginTop: 8 }}>Cancelar</button>
      </BottomSheet>

      <BottomSheet show={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Registrar pago</h3>

        <div className="input-group">
          <label className="input-label">Cliente</label>
          <div style={{ fontWeight: 600 }}>{selectedClient?.name}</div>
        </div>
        <div className="input-group">
          <label className="input-label">Monto ($)</label>
          <input className="input-field" type="number" placeholder="0"
            value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Fecha</label>
          <input className="input-field" type="date"
            value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={registerPayment}>Registrar pago</button>
        <button className="btn btn-outline" onClick={() => setShowPaymentModal(false)} style={{ marginTop: 8 }}>Cancelar</button>
      </BottomSheet>
    </div>
  )
}
