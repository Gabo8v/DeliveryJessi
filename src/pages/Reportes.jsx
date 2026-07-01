import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import db from '../db'
import { showToast } from '../App'

export default function Reportes() {
  const [period, setPeriod] = useState('day')
  const [data, setData] = useState(null)
  const [chartData, setChartData] = useState([])
  const [cierreTab, setCierreTab] = useState(false)
  const [closes, setCloses] = useState([])

  useEffect(() => {
    if (cierreTab) loadCloses()
    else loadReports()
  }, [period, cierreTab])

  async function loadReports() {
    const allOrders = await db.orders.toArray()
    const now = new Date()

    let filtered = []
    if (period === 'day') {
      const today = now.toISOString().split('T')[0]
      filtered = allOrders.filter(o => o.date === today)
    } else if (period === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const since = weekAgo.getTime()
      filtered = allOrders.filter(o => o.createdAt >= since)
    } else {
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      const since = monthAgo.getTime()
      filtered = allOrders.filter(o => o.createdAt >= since)
    }

    const totalViandas = filtered.reduce((s, o) => {
      if (o.items) return s + o.items.reduce((si, i) => si + i.qty, 0)
      return s + (o.qty || 0)
    }, 0)
    const totalPlata = filtered.reduce((s, o) => s + o.total, 0)

    const plateCount = {}
    filtered.forEach(o => {
      if (o.items) {
        o.items.forEach(i => {
          plateCount[i.plateName] = (plateCount[i.plateName] || 0) + i.qty
        })
      } else {
        plateCount[o.plateName] = (plateCount[o.plateName] || 0) + (o.qty || 0)
      }
    })
    const topPlate = Object.entries(plateCount).sort((a, b) => b[1] - a[1])[0]

    const opCount = {}
    filtered.forEach(o => {
      const op = o.operator || '—'
      opCount[op] = (opCount[op] || 0) + 1
    })
    const topOp = Object.entries(opCount).sort((a, b) => b[1] - a[1])[0]

    const clientsWithDebt = await db.clients
      .filter(c => (c.debt || 0) > 0)
      .toArray()
    const totalDeuda = clientsWithDebt.reduce((s, c) => s + (c.debt || 0), 0)

    setData({
      totalViandas,
      totalPlata,
      topPlate: topPlate || ['—', 0],
      topOp: topOp || ['—', 0],
      totalDeuda
    })

    loadChart(filtered)
  }

  async function loadChart(filtered) {
    if (!filtered) {
      filtered = await db.orders.toArray()
    }
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dayOrders = filtered.filter(o => o.date === ds)
      const total = dayOrders.reduce((s, o) => s + o.total, 0)
      days.push({ label: d.toLocaleDateString('es-ES', { weekday: 'short' }), total })
    }
    setChartData(days)
  }

  async function loadCloses() {
    const all = await db.dailyCloses
      .orderBy('date')
      .reverse()
      .toArray()
    setCloses(all)
  }

  async function exportExcel() {
    let rows = []
    let filename = ''

    if (cierreTab) {
      filename = 'ComidaMecha_historial_cierres.xlsx'
      rows = closes.map(c => ({
        Fecha: c.date,
        Viandas: c.totalViandas,
        'Total ($)': c.totalPlata,
        Cobrado: c.cobrado,
        Pendiente: c.pendiente,
        Pedidos: c.cantPedidos,
        Observacion: c.observacion || ''
      }))
    } else {
      const dateStr = new Date().toISOString().split('T')[0]
      const periodName = period === 'day' ? 'dia' : period === 'week' ? 'semana' : 'mes'
      filename = `ComidaMecha_reportes_${periodName}_${dateStr}.xlsx`

      const allOrders = data ? await loadOrdersForExport() : []
      rows = []
      allOrders.forEach(o => {
        if (o.items) {
          o.items.forEach(i => {
            rows.push({
              Fecha: o.date,
              Hora: o.time,
              Cliente: o.clientName,
              Plato: i.plateName,
              Cantidad: i.qty,
              'Precio Unit.': i.unitPrice,
              Subtotal: i.subtotal,
              Envio: o.deliveryCost || 0,
              Total: o.total,
              'Tipo Entrega': o.delivery === 'domicilio' ? 'Domicilio' : 'Retira',
              'Metodo Pago': o.payment,
              Estado: o.status === 'pagado' ? 'Pagado' : 'Pendiente',
              'Tomado por': o.operator || '—'
            })
          })
        } else {
          rows.push({
            Fecha: o.date,
            Hora: o.time,
            Cliente: o.clientName,
            Plato: o.plateName,
            Cantidad: o.qty,
            'Precio Unit.': o.unitPrice,
            Subtotal: (o.unitPrice || 0) * (o.qty || 0),
            Envio: o.deliveryCost || 0,
            Total: o.total,
            'Tipo Entrega': o.delivery === 'domicilio' ? 'Domicilio' : 'Retira',
            'Metodo Pago': o.payment,
            Estado: o.status === 'pagado' ? 'Pagado' : 'Pendiente',
            'Tomado por': o.operator || '—'
          })
        }
      })
    }

    if (rows.length === 0) {
      showToast('No hay datos para exportar')
      return
    }

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')
    XLSX.writeFile(wb, filename)
    showToast('✅ Archivo descargado')
  }

  async function loadOrdersForExport() {
    const allOrders = await db.orders.toArray()
    const now = new Date()
    let filtered = []
    if (period === 'day') {
      const today = now.toISOString().split('T')[0]
      filtered = allOrders.filter(o => o.date === today)
    } else if (period === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const since = weekAgo.getTime()
      filtered = allOrders.filter(o => o.createdAt >= since)
    } else {
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      const since = monthAgo.getTime()
      filtered = allOrders.filter(o => o.createdAt >= since)
    }
    return filtered.sort((a, b) => b.createdAt - a.createdAt)
  }

  const maxChart = Math.max(...chartData.map(d => d.total), 1)

  return (
    <div className="page">
      <h2 className="title-lg" style={{ marginBottom: 4 }}>Reportes</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['day', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => { setCierreTab(false); setPeriod(p) }}
            style={{
              flex: 1, textAlign: 'center', padding: 10,
              borderRadius: 'var(--radius-input)',
              fontSize: 14, fontWeight: 500,
              color: !cierreTab && period === p ? '#fff' : 'var(--muted)',
              background: !cierreTab && period === p ? 'var(--primary)' : 'transparent',
              border: 'none',
            }}
          >
            {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
        <button
          onClick={() => setCierreTab(true)}
          style={{
            flex: 1, textAlign: 'center', padding: 10,
            borderRadius: 'var(--radius-input)',
            fontSize: 14, fontWeight: 500,
            color: cierreTab ? '#fff' : 'var(--muted)',
            background: cierreTab ? 'var(--secondary)' : 'transparent',
            border: 'none',
          }}
        >
          🔒 Cierres
        </button>
      </div>

      {cierreTab ? (
        <>
          {closes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No hay cierres guardados</p>
              <p style={{ fontSize: 13 }}>Cerá el turno desde la pantalla de inicio</p>
            </div>
          ) : (
            closes.map(c => (
              <div key={c.date} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {new Date(c.date + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'short'
                    })}
                  </span>
                  <span style={{ fontWeight: 700 }}>${c.totalPlata?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
                  <span>🥗 {c.totalViandas} viandas</span>
                  <span style={{ color: 'var(--success)' }}>✅ ${c.cobrado?.toLocaleString()}</span>
                  {c.pendiente > 0 && (
                    <span style={{ color: 'var(--danger)' }}>⏳ ${c.pendiente?.toLocaleString()}</span>
                  )}
                </div>
                {c.observacion && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
                    {c.observacion}
                  </div>
                )}
              </div>
            ))
          )}

          {closes.length > 0 && (
            <button className="btn btn-primary" onClick={exportExcel} style={{ marginTop: 8 }}>
              📥 Descargar Excel
            </button>
          )}
        </>
      ) : (
        <>
          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.totalViandas}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>🥗 Viandas</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>${data.totalPlata.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>💰 Total</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{data.topPlate[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>🥇 Plato ({data.topPlate[1]})</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{data.topOp[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>👤 Operador ({data.topOp[1]})</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>
                  ${data.totalDeuda.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>💵 Deuda fiados</div>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Últimos 7 días</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '0 4px' }}>
              {chartData.map((d, i) => (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', height: '100%', justifyContent: 'flex-end'
                }}>
                  <div style={{
                    width: '100%', maxWidth: 32,
                    borderRadius: '6px 6px 2px 2px',
                    background: 'var(--primary)',
                    minHeight: 4,
                    height: `${Math.max(4, (d.total / maxChart) * 100)}%`,
                    transition: 'height 0.4s ease',
                  }} />
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-secondary" onClick={() => {
            const text = data
              ? `📊 Comida Mecha - Resumen ${period === 'day' ? 'del día' : period === 'week' ? 'semanal' : 'mensual'}\n\n🥗 Viandas: ${data.totalViandas}\n💰 Total: $${data.totalPlata.toLocaleString()}\n🥇 Plato top: ${data.topPlate[0]} (${data.topPlate[1]})\n👤 Operador top: ${data.topOp[0]} (${data.topOp[1]} pedidos)\n💵 Deuda fiados: $${data.totalDeuda.toLocaleString()}`
              : ''
            navigator.clipboard.writeText(text).then(() => showToast('📋 Resumen copiado')).catch(() => {})
          }} style={{ marginTop: 8 }}>
            Compartir resumen
          </button>

          <button className="btn btn-primary" onClick={exportExcel} style={{ marginTop: 8 }}>
            📥 Descargar Excel
          </button>
        </>
      )}
    </div>
  )
}
