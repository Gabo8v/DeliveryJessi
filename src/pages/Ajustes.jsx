import { useState, useEffect } from 'react'
import db from '../db'
import { showToast } from '../App'

const APP_VERSION = 'v1.2.4'
const REPO = 'Gabo8v/DeliveryJessi'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

export default function Ajustes() {
  const [plates, setPlates] = useState([])
  const [menuDate, setMenuDate] = useState(todayStr())
  const [menuSelected, setMenuSelected] = useState([])
  const [priceBase, setPriceBase] = useState(4000)
  const [priceDelivery, setPriceDelivery] = useState(1000)
  const [bizName, setBizName] = useState('Comida Mecha')
  const [bizPhone, setBizPhone] = useState('')
  const [showAddPlate, setShowAddPlate] = useState(false)
  const [newPlateName, setNewPlateName] = useState('')
  const [newPlatePrice, setNewPlatePrice] = useState(4000)
  const [newPlateSopa, setNewPlateSopa] = useState(0)
  const [menuSearch, setMenuSearch] = useState('')
  const [editPlate, setEditPlate] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState(4000)
  const [editSopaPrice, setEditSopaPrice] = useState(0)
  const [editOffers, setEditOffers] = useState([])
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateData, setUpdateData] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const pl = await db.plates.toArray()
    setPlates(pl)

    const menu = await db.menuOfDay.get(todayStr())
    if (menu) setMenuSelected(menu.plateIds || [])

    const prices = localStorage.getItem('cm_prices')
    if (prices) {
      const p = JSON.parse(prices)
      setPriceBase(p.base || 4000)
      setPriceDelivery(p.delivery || 1000)
    }

    const biz = localStorage.getItem('cm_biz')
    if (biz) {
      const b = JSON.parse(biz)
      setBizName(b.name || 'Comida Mecha')
      setBizPhone(b.phone || '')
    }
  }

  async function togglePlateActive(id) {
    const p = plates.find(x => x.id === id)
    if (!p) return
    await db.plates.update(id, { active: p.active ? 0 : 1 })
    await loadData()
  }

  function openEditPlate(p) {
    setEditPlate(p)
    setEditName(p.name)
    setEditPrice(p.price)
    setEditSopaPrice(p.sopaPrice || 0)
    setEditOffers((p.offers || []).map(o => ({ ...o })))
  }

  async function saveEditPlate() {
    if (!editName.trim()) return
    await db.plates.update(editPlate.id, {
      name: editName.trim(),
      price: editPrice || 4000,
      sopaPrice: editSopaPrice || 0,
      offers: editOffers
    })
    setEditPlate(null)
    await loadData()
    showToast('✅ Plato actualizado')
  }

  function addOfferRow() {
    setEditOffers(prev => [...prev, { label: '', qty: 2, totalPrice: 0 }])
  }

  function removeOfferRow(idx) {
    setEditOffers(prev => prev.filter((_, i) => i !== idx))
  }

  function updateOfferRow(idx, field, val) {
    setEditOffers(prev => {
      const copy = prev.map(o => ({ ...o }))
      copy[idx][field] = val
      if (field === 'qty' || field === 'totalPrice') {
        const o = copy[idx]
        if (o.qty && o.totalPrice) {
          copy[idx].label = `${o.qty}x$${o.totalPrice.toLocaleString()}`
        }
      }
      return copy
    })
  }

  async function addPlate() {
    if (!newPlateName.trim()) return
    await db.plates.add({
      name: newPlateName.trim(),
      price: newPlatePrice || 4000,
      sopaPrice: newPlateSopa || 0,
      active: 1,
      offers: []
    })
    setShowAddPlate(false)
    setNewPlateName('')
    setNewPlatePrice(4000)
    setNewPlateSopa(0)
    await loadData()
    showToast('✅ Plato agregado')
  }

  async function toggleMenuPlate(plateId) {
    const next = menuSelected.includes(plateId)
      ? menuSelected.filter(id => id !== plateId)
      : menuSelected.length < 5
        ? [...menuSelected, plateId]
        : menuSelected
    setMenuSelected(next)
  }

  async function saveMenuOfDay() {
    if (menuSelected.length === 0) {
      showToast('Seleccioná al menos un plato')
      return
    }
    await db.menuOfDay.put({ date: menuDate, plateIds: menuSelected })
    showToast('✅ Menú guardado')
  }

  function savePrices() {
    localStorage.setItem('cm_prices', JSON.stringify({ base: priceBase, delivery: priceDelivery }))
    showToast('✅ Precios guardados')
  }

  function saveBizInfo() {
    localStorage.setItem('cm_biz', JSON.stringify({ name: bizName, phone: bizPhone }))
    showToast('✅ Info guardada')
  }

  async function checkForUpdates() {
    setCheckingUpdate(true)
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      if (!res.ok) throw new Error('No se pudo conectar')
      const data = await res.json()
      if (data.tag_name !== APP_VERSION) {
        const asset = data.assets?.find(a => a.name.endsWith('.apk'))
        if (asset) {
          setUpdateData({ version: data.tag_name, url: asset.browser_download_url, body: data.body })
          setShowUpdateModal(true)
        } else {
          showToast('⚠️ Release sin APK')
        }
      } else {
        showToast('✅ Ya tenés la última versión')
      }
    } catch (err) {
      showToast('⚠️ ' + (err.message || 'Error de conexión'))
    } finally {
      setCheckingUpdate(false)
    }
  }

  function downloadUpdate() {
    if (!updateData) return
    window.open(updateData.url, '_blank')
    setShowUpdateModal(false)
  }

  return (
    <div className="page">
      <h2 className="title-lg" style={{ marginBottom: 16 }}>Ajustes</h2>

      <div className="setting-section">
        <div className="section-title">Platos</div>
        {plates.map(p => (
          <div key={p.id} className="setting-item" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openEditPlate(p)}>
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <small style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12, display: 'block' }}>
                ${p.price.toLocaleString()}{p.sopaPrice ? ` + sopa $${p.sopaPrice.toLocaleString()}` : ''}{p.offers?.length > 0 ? ` · ${p.offers.length} oferta${p.offers.length > 1 ? 's' : ''}` : ''}
              </small>
            </div>
            <button onClick={() => togglePlateActive(p.id)} style={{
              fontSize: 13, fontWeight: 500,
              color: p.active ? 'var(--danger)' : 'var(--success)',
              background: 'none', border: 'none', marginLeft: 8
            }}>
              {p.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" onClick={() => setShowAddPlate(true)} style={{ marginTop: 8, width: 'auto' }}>
          + Agregar plato
        </button>
      </div>

      <div className="setting-section">
        <div className="section-title">Menú del día</div>
        <div className="input-group">
          <label className="input-label">Fecha</label>
          <input className="input-field" type="date" value={menuDate}
            onChange={e => setMenuDate(e.target.value)} />
        </div>
        <div className="input-group">
            <label className="input-label">Platos del menú (5)</label>
          <div className="search-wrap" style={{ marginBottom: 8 }}>
            <span className="search-icon">🔍</span>
            <input className="input-field" placeholder="Buscar plato..."
              value={menuSearch} onChange={e => setMenuSearch(e.target.value)} />
          </div>
          <div className="chip-group">
            {plates
              .filter(p => p.active)
              .filter(p => !menuSearch || p.name.toLowerCase().includes(menuSearch.toLowerCase()))
              .map(p => (
              <button
                key={p.id}
                type="button"
                className={`chip ${menuSelected.includes(p.id) ? 'selected' : ''}`}
                onClick={() => toggleMenuPlate(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveMenuOfDay} style={{ width: 'auto' }}>
          Guardar menú
        </button>
      </div>

      <div className="setting-section">
        <div className="section-title">Precios</div>
        <div className="input-group">
          <label className="input-label">Precio base</label>
          <input className="input-field" type="number" value={priceBase}
            onChange={e => setPriceBase(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="input-group">
          <label className="input-label">Recargo a domicilio</label>
          <input className="input-field" type="number" value={priceDelivery}
            onChange={e => setPriceDelivery(parseFloat(e.target.value) || 0)} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={savePrices} style={{ width: 'auto' }}>
          Guardar precios
        </button>
      </div>

      <div className="setting-section">
        <div className="section-title">Info del negocio</div>
        <div className="input-group">
          <label className="input-label">Nombre</label>
          <input className="input-field" value={bizName}
            onChange={e => setBizName(e.target.value)} placeholder="Comida Mecha" />
        </div>
        <div className="input-group">
          <label className="input-label">Teléfono</label>
          <input className="input-field" value={bizPhone}
            onChange={e => setBizPhone(e.target.value)} placeholder="+54 11 ..." />
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveBizInfo} style={{ width: 'auto' }}>
          Guardar
        </button>
      </div>

      <div className="setting-section">
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Actualizaciones</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>{APP_VERSION}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Las nuevas versiones se publican en GitHub. Buscá actualizaciones para descargar el último APK.
        </p>
        <button className="btn btn-outline btn-sm" onClick={checkForUpdates} disabled={checkingUpdate} style={{ width: 'auto' }}>
          {checkingUpdate ? 'Buscando...' : '🔍 Buscar actualización'}
        </button>
      </div>

      {/* Update modal */}
      {showUpdateModal && updateData && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(61, 44, 46, 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpdateModal(false) }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: '24px 24px 0 0',
            width: '100%', padding: '24px 16px calc(16px + env(safe-area-inset-bottom, 16px))',
          }}>
            <div style={{
              width: 36, height: 4, background: 'var(--border)',
              borderRadius: 4, margin: '0 auto 16px',
            }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📥 Nueva versión disponible</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>
              {updateData.version} → Instalá el nuevo APK para actualizar.
            </p>
            {updateData.body && (
              <div style={{
                fontSize: 13, color: 'var(--text)', marginBottom: 16,
                padding: 10, background: 'var(--bg)', borderRadius: 10,
                whiteSpace: 'pre-line', maxHeight: 120, overflowY: 'auto'
              }}>
                {updateData.body}
              </div>
            )}
            <button className="btn btn-primary" onClick={downloadUpdate}>
              Descargar APK
            </button>
            <button className="btn btn-outline" onClick={() => setShowUpdateModal(false)} style={{ marginTop: 8 }}>
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* Add plate modal */}
      {showAddPlate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(61, 44, 46, 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddPlate(false) }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: '24px 24px 0 0',
            width: '100%', padding: '24px 16px calc(16px + env(safe-area-inset-bottom, 16px))',
          }}>
            <div style={{
              width: 36, height: 4, background: 'var(--border)',
              borderRadius: 4, margin: '0 auto 16px',
            }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nuevo plato</h3>
            <div className="input-group">
              <input className="input-field" placeholder="Nombre del plato"
                value={newPlateName} onChange={e => setNewPlateName(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Precio ($)</label>
              <input className="input-field" type="number" value={newPlatePrice}
                onChange={e => setNewPlatePrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="input-group">
              <label className="input-label">Agregar sopa (+$)</label>
              <input className="input-field" type="number" value={newPlateSopa}
                onChange={e => setNewPlateSopa(parseFloat(e.target.value) || 0)} />
            </div>
            <button className="btn btn-primary" onClick={addPlate}>Agregar plato</button>
            <button className="btn btn-outline" onClick={() => setShowAddPlate(false)} style={{ marginTop: 8 }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Edit plate modal */}
      {editPlate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(61, 44, 46, 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditPlate(null) }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: '24px 24px 0 0',
            width: '100%', maxHeight: '85vh', overflowY: 'auto',
            padding: '24px 16px calc(16px + env(safe-area-inset-bottom, 16px))',
          }}>
            <div style={{
              width: 36, height: 4, background: 'var(--border)',
              borderRadius: 4, margin: '0 auto 16px',
            }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Editar plato</h3>
            <div className="input-group">
              <label className="input-label">Nombre</label>
              <input className="input-field" placeholder="Nombre del plato"
                value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Precio ($)</label>
              <input className="input-field" type="number" value={editPrice}
                onChange={e => setEditPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="input-group">
              <label className="input-label">Agregar sopa (+$)</label>
              <input className="input-field" type="number" value={editSopaPrice}
                onChange={e => setEditSopaPrice(parseFloat(e.target.value) || 0)} />
            </div>

            <div className="input-group">
              <label className="input-label">Ofertas</label>
              {editOffers.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  Sin ofertas. Agregá promociones como "2x$5000" o "3x$10000".
                </p>
              )}
              {editOffers.map((offer, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 8, padding: 10, borderRadius: 'var(--radius-input)',
                  background: 'var(--bg)'
                }}>
                  <input type="number" min="2" placeholder="Cant."
                    value={offer.qty} onChange={e => updateOfferRow(idx, 'qty', parseInt(e.target.value) || 2)}
                    style={{ width: 60, padding: 8, border: '1px solid var(--border)', borderRadius: 6, textAlign: 'center' }} />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>x</span>
                  <span style={{ fontSize: 13 }}>$</span>
                  <input type="number" placeholder="Precio total"
                    value={offer.totalPrice} onChange={e => updateOfferRow(idx, 'totalPrice', parseInt(e.target.value) || 0)}
                    style={{ flex: 1, minWidth: 80, padding: 8, border: '1px solid var(--border)', borderRadius: 6 }} />
                  <button onClick={() => removeOfferRow(idx)} style={{
                    fontSize: 18, color: 'var(--danger)', background: 'none', border: 'none', padding: 4
                  }}>×</button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={addOfferRow} style={{ width: 'auto' }}>
                + Agregar oferta
              </button>
            </div>

            <button className="btn btn-primary" onClick={saveEditPlate} style={{ marginTop: 4 }}>
              Guardar cambios
            </button>
            <button className="btn btn-outline" onClick={() => setEditPlate(null)} style={{ marginTop: 8 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
