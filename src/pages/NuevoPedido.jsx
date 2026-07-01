import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import db from '../db'
import { showToast } from '../App'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function loadPrices() {
  const p = localStorage.getItem('cm_prices')
  if (!p) return { base: 4000, delivery: 1000 }
  return JSON.parse(p)
}

export default function NuevoPedido() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prices = loadPrices()
  const [plates, setPlates] = useState([])
  const [quantities, setQuantities] = useState({})
  const [activeOffers, setActiveOffers] = useState({})
  const [plateSearch, setPlateSearch] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [clientSuggestions, setClientSuggestions] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '', fiado: false })
  const [delivery, setDelivery] = useState('retira')
  const [chargeDelivery, setChargeDelivery] = useState(true)
  const [payment, setPayment] = useState('efectivo')
  const [status, setStatus] = useState('pendiente')
  const [clients, setClients] = useState([])
  const [takenBy, setTakenBy] = useState('')
  const [clientFocused, setClientFocused] = useState(false)
  const deliveryFee = prices.delivery

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const allPlates = await db.plates.where('active').equals(1).toArray()
    const allClients = await db.clients.toArray()
    setClients(allClients)

    const date = todayStr()
    const menu = await db.menuOfDay.get(date)
    let displayPlates = []
    if (menu && menu.plateIds && menu.plateIds.length > 0) {
      displayPlates = allPlates.filter(p => menu.plateIds.includes(p.id))
    }
    setPlates(displayPlates)

    const qty = {}
    const preselectedId = searchParams.get('plate')
    if (preselectedId) {
      const plate = displayPlates.find(p => String(p.id) === preselectedId)
      if (plate) qty[plate.id] = 1
    }
    setQuantities(qty)
  }

  useEffect(() => {
    if (payment === 'fiado') setStatus('pendiente')
  }, [payment])

  function togglePlate(plateId) {
    setQuantities(prev => {
      if (prev[plateId]) {
        const copy = { ...prev }
        delete copy[plateId]
        return copy
      }
      return { ...prev, [plateId]: 1 }
    })
    setActiveOffers(prev => {
      const copy = { ...prev }
      delete copy[plateId]
      return copy
    })
  }

  function applyOffer(plateId, offer) {
    setQuantities(prev => ({ ...prev, [plateId]: offer.qty }))
    setActiveOffers(prev => ({ ...prev, [plateId]: offer }))
  }

  function adjustQty(plateId, delta) {
    setActiveOffers(prev => {
      const copy = { ...prev }
      delete copy[plateId]
      return copy
    })
    setQuantities(prev => {
      const current = prev[plateId] || 0
      const next = current + delta
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[plateId]
        return copy
      }
      return { ...prev, [plateId]: Math.min(next, 99) }
    })
  }

  function handleClientSearch(val) {
    setClientQuery(val)
    if (!val.trim()) {
      if (clientFocused) {
        setClientSuggestions(clients)
      } else {
        setClientSuggestions([])
      }
      setShowNewClient(false)
      setSelectedClient(null)
      return
    }
    const match = clients.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    )
    if (match.length > 0) {
      setClientSuggestions(match)
      setShowNewClient(false)
    } else {
      setClientSuggestions([])
      setShowNewClient(true)
      setNewClient(prev => ({ ...prev, name: val }))
      setSelectedClient(null)
    }
  }

  function handleClientFocus() {
    setClientFocused(true)
    if (!clientQuery.trim()) {
      setClientSuggestions(clients)
    }
  }

  function handleClientBlur() {
    setTimeout(() => {
      setClientFocused(false)
      if (!clientQuery.trim()) setClientSuggestions([])
    }, 200)
  }

  function selectClient(c) {
    setSelectedClient(c)
    setClientQuery(c.name)
    setClientSuggestions([])
    setShowNewClient(false)
  }

  function openNewClient() {
    setShowNewClient(true)
    setClientSuggestions([])
    setSelectedClient(null)
  }

  function getItems() {
    return Object.entries(quantities)
      .map(([plateId, qty]) => {
        const plate = plates.find(p => p.id === Number(plateId))
        if (!plate) return null
        const offer = activeOffers[plateId]
        if (offer) {
          return {
            plateId: plate.id,
            plateName: plate.name,
            qty: offer.qty,
            unitPrice: Math.round(offer.totalPrice / offer.qty),
            subtotal: offer.totalPrice,
            offerLabel: offer.label
          }
        }
        return {
          plateId: plate.id,
          plateName: plate.name,
          qty,
          unitPrice: plate.price,
          subtotal: plate.price * qty
        }
      })
      .filter(Boolean)
  }

  function getTotal() {
    const itemsTotal = getItems().reduce((s, i) => s + i.subtotal, 0)
    return itemsTotal + (delivery === 'domicilio' && chargeDelivery ? deliveryFee : 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const items = getItems()
    if (items.length === 0) {
      showToast('Agregá al menos un plato')
      return
    }

    let client = selectedClient

    if (!client && showNewClient && newClient.name.trim()) {
      const id = await db.clients.add({
        name: newClient.name.trim(),
        phone: newClient.phone.trim(),
        address: newClient.address.trim(),
        fiado: newClient.fiado,
        debt: 0
      })
      client = { id, ...newClient, debt: 0 }
      setClients(prev => [...prev, client])
    }

    if (!client) {
      showToast('Seleccioná o creá un cliente')
      return
    }

    const total = getTotal()

    const order = {
      date: todayStr(),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      operator: takenBy || '—',
      clientId: client.id,
      clientName: client.name,
      items,
      delivery,
      payment,
      status,
      deliveryCost: delivery === 'domicilio' && chargeDelivery ? deliveryFee : 0,
      total,
      createdAt: Date.now()
    }

    await db.orders.add(order)

    if (payment === 'fiado' && status === 'pendiente') {
      const c = await db.clients.get(client.id)
      if (c) {
        await db.clients.update(client.id, { debt: (c.debt || 0) + total })
      }
    }

    showToast('✅ Pedido guardado')
    navigate('/pedidos')
  }

  const selectedItems = getItems()
  const total = getTotal()
  const showFiadoWarning = selectedClient?.fiado || newClient.fiado

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={{ fontSize: 24, background: 'none', border: 'none' }}>
          ‹
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Nuevo Pedido</h2>
      </div>

      <div className="input-group">
        <label className="input-label">Anotado por</label>
        <input className="input-field" placeholder="Nombre de quien toma el pedido"
          value={takenBy} onChange={e => setTakenBy(e.target.value)} />
      </div>

      <form onSubmit={handleSubmit}>
        {plates.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: 16 }}>
            <div className="empty-icon">📋</div>
            <p>No hay menú cargado para hoy</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
              Ir a Inicio
            </button>
          </div>
        ) : (
          <div className="input-group">
            <label className="input-label">Platos del menú</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plates.map(p => {
                const isSelected = quantities[p.id] != null
                const activeOffer = activeOffers[p.id]
                return (
                  <div key={p.id}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      padding: '10px 12px', borderRadius: 'var(--radius-input)',
                      background: isSelected ? 'var(--bg)' : 'transparent',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }} onClick={() => togglePlate(p.id)}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          ${p.price.toLocaleString()} c/u
                          {activeOffer ? ` · Oferta: ${activeOffer.label}` : ''}
                        </div>
                      </div>
                      {isSelected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="qty-control" style={{ margin: 0 }}>
                            <button type="button" onClick={() => adjustQty(p.id, -1)}>−</button>
                            <span className="qty-value">{quantities[p.id]}</span>
                            <button type="button" onClick={() => adjustQty(p.id, 1)}>+</button>
                          </div>
                          <button type="button" onClick={() => togglePlate(p.id)}
                            style={{
                              fontSize: 12, color: 'var(--danger)', fontWeight: 500,
                              background: 'none', border: 'none', padding: '4px 8px',
                            }}>
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="btn btn-primary btn-sm"
                          onClick={() => togglePlate(p.id)}
                          style={{ width: 'auto', padding: '4px 12px', fontSize: 13 }}>
                          Agregar
                        </button>
                      )}
                    </div>
                    {p.offers && p.offers.length > 0 && !isSelected && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {p.offers.map((offer, idx) => (
                          <button key={idx} type="button"
                            onClick={() => applyOffer(p.id, offer)}
                            style={{
                              fontSize: 12, fontWeight: 500,
                              padding: '3px 10px', borderRadius: 12,
                              border: '1px dashed var(--primary)',
                              background: 'transparent', color: 'var(--primary)',
                              cursor: 'pointer'
                            }}>
                            {offer.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="card" style={{ padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Resumen</div>
            {selectedItems.map(item => (
              <div key={item.plateId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{item.plateName} x{item.qty}{item.offerLabel ? ` (${item.offerLabel})` : ''}</span>
                <span style={{ fontWeight: 500 }}>${item.subtotal.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Cliente</label>
          <input
            className="input-field"
            placeholder="Buscar cliente..."
            value={clientQuery}
            onChange={e => handleClientSearch(e.target.value)}
            onFocus={handleClientFocus}
            onBlur={handleClientBlur}
            autoComplete="off"
          />

          {clientSuggestions.length > 0 && !showNewClient && (
            <div style={{ marginTop: 4 }}>
              {clientSuggestions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  style={{ display: 'block', width: '100%', marginBottom: 4, textAlign: 'left' }}
                  onClick={() => selectClient(c)}
                >
                  {c.name} {c.phone ? `· ${c.phone}` : ''}
                </button>
              ))}
              {clientQuery.trim() && !clients.some(c =>
                c.name.toLowerCase().includes(clientQuery.toLowerCase())
              ) && (
                <button
                  type="button"
                  className="chip"
                  style={{
                    display: 'block', width: '100%', marginTop: 4, textAlign: 'left',
                    color: 'var(--primary)', fontWeight: 600, borderStyle: 'dashed'
                  }}
                  onClick={openNewClient}
                >
                  + Registrar "{clientQuery}"
                </button>
              )}
            </div>
          )}

          {showNewClient && (
            <div style={{ marginTop: 12 }}>
              <div className="input-group">
                <input
                  className="input-field"
                  placeholder="Nombre completo"
                  value={newClient.name}
                  onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <input
                  className="input-field"
                  placeholder="Teléfono"
                  type="tel"
                  value={newClient.phone}
                  onChange={e => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <input
                  className="input-field"
                  placeholder="Dirección"
                  value={newClient.address}
                  onChange={e => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="new-client-fiado"
                  style={{ width: 20, height: 20 }}
                  checked={newClient.fiado}
                  onChange={e => setNewClient(prev => ({ ...prev, fiado: e.target.checked }))}
                />
                <label htmlFor="new-client-fiado" style={{ fontSize: 14 }}>¿Es fiado?</label>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowNewClient(false)}
                style={{ marginTop: 4 }}>
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Tipo de entrega</label>
          <div className="chip-group">
            <button
              type="button"
              className={`chip ${delivery === 'retira' ? 'selected' : ''}`}
              onClick={() => setDelivery('retira')}
            >
              Retira
            </button>
            <button
              type="button"
              className={`chip ${delivery === 'domicilio' ? 'selected' : ''}`}
              onClick={() => { setDelivery('domicilio'); setChargeDelivery(true) }}
            >
              A domicilio
            </button>
          </div>
          {delivery === 'domicilio' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <input
                type="checkbox"
                id="charge-delivery"
                style={{ width: 20, height: 20 }}
                checked={chargeDelivery}
                onChange={e => setChargeDelivery(e.target.checked)}
              />
              <label htmlFor="charge-delivery" style={{ fontSize: 14 }}>
                Cobrar envío (+${deliveryFee.toLocaleString()})
              </label>
            </div>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Método de pago</label>
          <div className="chip-group">
            {[
              { value: 'efectivo', label: '💵 Efectivo' },
              { value: 'transferencia', label: '💳 Transferencia' },
              { value: 'mp', label: '📱 MP' },
              { value: 'fiado', label: '📋 Fiado' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`chip ${payment === opt.value ? 'selected' : ''}`}
                onClick={() => setPayment(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Estado {payment === 'fiado' ? '(fijo: Pendiente)' : ''}</label>
          <div className="toggle-group" style={{ opacity: payment === 'fiado' ? 0.5 : 1 }}>
            <button
              type="button"
              className={`toggle-opt ${status === 'pendiente' ? 'selected' : ''}`}
              onClick={() => !(payment === 'fiado') && setStatus('pendiente')}
              style={{ cursor: payment === 'fiado' ? 'not-allowed' : 'pointer' }}
            >
              Pendiente
            </button>
            <button
              type="button"
              className={`toggle-opt ${status === 'pagado' ? 'selected' : ''}`}
              onClick={() => !(payment === 'fiado') && setStatus('pagado')}
              style={{ cursor: payment === 'fiado' ? 'not-allowed' : 'pointer' }}
            >
              Pagado
            </button>
          </div>
        </div>

        {showFiadoWarning && (
          <div className="alert-warning">
            <span>📌</span>
            <span>Recordá: este cliente paga cuando cobra</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
          Guardar pedido (${total.toLocaleString()})
        </button>
      </form>
    </div>
  )
}
