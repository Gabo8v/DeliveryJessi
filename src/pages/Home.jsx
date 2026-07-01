import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import db from '../db'
import { showToast } from '../App'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function formatDate() {
  const d = new Date()
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export default function Home() {
  const [menuPlates, setMenuPlates] = useState([])
  const [hasMenu, setHasMenu] = useState(false)
  const [showCierre, setShowCierre] = useState(false)
  const [showConfirmCierre, setShowConfirmCierre] = useState(false)
  const [cierreData, setCierreData] = useState(null)
  const [observacion, setObservacion] = useState('')
  const [todayClosed, setTodayClosed] = useState(false)
  const [allActivePlates, setAllActivePlates] = useState([])
  const [menuSelected, setMenuSelected] = useState([])
  const [menuSearch, setMenuSearch] = useState('')
  const [dismissClosedMsg, setDismissClosedMsg] = useState(() => localStorage.getItem('cm_dismiss_closed') === todayStr())
  const [showMenuModal, setShowMenuModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
    checkClosed()
  }, [])

  useEffect(() => {
    if (hasMenu || todayClosed) setMenuSelected([])
  }, [hasMenu, todayClosed])

  async function loadData() {
    const plates = await db.plates.where('active').equals(1).toArray()
    setAllActivePlates(plates)
    const date = todayStr()
    const menu = await db.menuOfDay.get(date)
    if (menu && menu.plateIds && menu.plateIds.length > 0) {
      const activeIds = menu.plateIds.filter(id => plates.some(p => p.id === id))
      const found = plates.filter(p => activeIds.includes(p.id))
      setMenuPlates(found)
      setHasMenu(found.length > 0)
    } else {
      setHasMenu(false)
      setMenuPlates([])
    }
  }

  async function checkClosed() {
    const c = await db.dailyCloses.get(todayStr())
    setTodayClosed(!!c)
  }

  function toggleMenuPlate(plateId) {
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
    await db.menuOfDay.put({ date: todayStr(), plateIds: menuSelected })
    setShowMenuModal(false)
    showToast('✅ Menú guardado')
    loadData()
  }

  async function openCierre() {
    const orders = await db.orders.where('date').equals(todayStr()).toArray()
    const totalViandas = orders.reduce((s, o) => {
      if (o.items) return s + o.items.reduce((si, i) => si + i.qty, 0)
      return s + (o.qty || 0)
    }, 0)
    const totalPlata = orders.reduce((s, o) => s + o.total, 0)
    const cobrado = orders.filter(o => o.status === 'pagado').reduce((s, o) => s + o.total, 0)
    const pendiente = orders.filter(o => o.status !== 'pagado').reduce((s, o) => s + o.total, 0)
    const fiado = orders.filter(o => o.payment === 'fiado').reduce((s, o) => s + o.total, 0)
    const cantPedidos = orders.length

    const plateSummary = {}
    orders.forEach(o => {
      if (o.items) {
        o.items.forEach(i => {
          plateSummary[i.plateName] = (plateSummary[i.plateName] || 0) + i.qty
        })
      } else {
        plateSummary[o.plateName] = (plateSummary[o.plateName] || 0) + (o.qty || 0)
      }
    })

    setCierreData({
      totalViandas, totalPlata, cobrado, pendiente, fiado, cantPedidos, plateSummary
    })
    setObservacion('')
    setShowCierre(true)
  }

  async function confirmarCierre() {
    const orders = await db.orders.where('date').equals(todayStr()).toArray()
    const totalViandas = orders.reduce((s, o) => {
      if (o.items) return s + o.items.reduce((si, i) => si + i.qty, 0)
      return s + (o.qty || 0)
    }, 0)
    const totalPlata = orders.reduce((s, o) => s + o.total, 0)
    const cobrado = orders.filter(o => o.status === 'pagado').reduce((s, o) => s + o.total, 0)
    const pendiente = orders.filter(o => o.status !== 'pagado').reduce((s, o) => s + o.total, 0)

    const plateSummary = {}
    orders.forEach(o => {
      if (o.items) {
        o.items.forEach(i => {
          plateSummary[i.plateName] = (plateSummary[i.plateName] || 0) + i.qty
        })
      } else {
        plateSummary[o.plateName] = (plateSummary[o.plateName] || 0) + (o.qty || 0)
      }
    })

    await db.dailyCloses.put({
      date: todayStr(),
      totalViandas,
      totalPlata,
      cobrado,
      pendiente,
      cantPedidos: orders.length,
      plateSummary,
      observacion: observacion.trim(),
      createdAt: Date.now()
    })

    await db.menuOfDay.delete(todayStr())

    setShowCierre(false)
    setShowConfirmCierre(false)
    setTodayClosed(true)
    loadData()
    showToast('Turno cerrado con éxito, resumen guardado en reportes')
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          ¡Hola Leonor! ☀️
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>
          {formatDate()}
        </div>
      </div>

      {todayClosed && !dismissClosedMsg && (
        <div className="alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>📌 Turno de hoy ya cerrado. Podés ver el resumen en Reportes.</span>
          <button onClick={() => { setDismissClosedMsg(true); localStorage.setItem('cm_dismiss_closed', todayStr()) }} style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap'
          }}>Aceptar</button>
        </div>
      )}

      {hasMenu ? (
        <>
          <div className="section-title">Menú de hoy</div>
          {menuPlates.map(plate => (
            <div
              key={plate.id}
              className="card menu-card"
              style={{ marginBottom: 12, cursor: 'pointer' }}
              onClick={() => navigate(`/nuevo-pedido?plate=${plate.id}`)}
            >
              <div style={{ fontSize: 17, fontWeight: 600 }}>{plate.name}</div>
              <div style={{ fontSize: 15, color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>
                ${plate.price.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Con envío: ${(plate.price + 1000).toLocaleString()}
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" onClick={openCierre} style={{ marginTop: 24 }}>
            🔒 Cerrar turno
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 24 }}>
          <div className="section-title">Menú del día</div>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16, textAlign: 'center' }}>
            Todavía no cargaste el menú de hoy
          </p>
          <button className="btn btn-primary" onClick={() => { setMenuSearch(''); setShowMenuModal(true) }}>
            📋 Cargar menú
          </button>
        </div>
      )}

      {showMenuModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(61, 44, 46, 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMenuModal(false) }}
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
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>📋 Cargar menú del día</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              Seleccioná hasta 5 platos para hoy
            </p>
            <div className="search-wrap" style={{ marginBottom: 12 }}>
              <span className="search-icon">🔍</span>
              <input className="input-field" placeholder="Buscar plato..."
                value={menuSearch} onChange={e => setMenuSearch(e.target.value)} />
            </div>
            <div className="chip-group">
              {allActivePlates
                .filter(p => !menuSearch || p.name.toLowerCase().includes(menuSearch.toLowerCase()))
                .map(p => (
                <button key={p.id} type="button"
                  className={`chip ${menuSelected.includes(p.id) ? 'selected' : ''}`}
                  onClick={() => toggleMenuPlate(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={saveMenuOfDay} style={{ flex: 1 }}>
                Guardar menú ({menuSelected.length}/5)
              </button>
              <button className="btn btn-outline" onClick={() => setShowMenuModal(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCierre && cierreData && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(61, 44, 46, 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCierre(false) }}
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
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🔒 Cerrar turno</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              Resumen del día {formatDate()}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{cierreData.totalViandas}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>🥗 Viandas</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>${cierreData.totalPlata.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>💰 Total</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>
                  ${cierreData.cobrado.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>✅ Cobrado</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
                  ${cierreData.pendiente.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>⏳ Pendiente</div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Observación (opcional)</label>
              <textarea className="input-field" placeholder="Alguna nota sobre el turno..."
                value={observacion} onChange={e => setObservacion(e.target.value)}
                style={{ minHeight: 60, resize: 'none' }} />
            </div>

            <button className="btn btn-primary" onClick={() => { setShowCierre(false); setShowConfirmCierre(true) }} style={{ marginTop: 8 }}>
              🔒 Confirmar cierre
            </button>
            <button className="btn btn-outline" onClick={() => setShowCierre(false)} style={{ marginTop: 8 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showConfirmCierre && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(61, 44, 46, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: 24,
            width: '85%', maxWidth: 320,
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              ¿Seguro que deseas cerrar el turno de hoy?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
              El menú del día se borrará y el resumen quedará guardado en Reportes.
            </p>
            <button className="btn btn-primary" onClick={confirmarCierre} style={{ marginBottom: 8 }}>
              🔒 Cerrar turno
            </button>
            <button className="btn btn-outline" onClick={() => setShowConfirmCierre(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
