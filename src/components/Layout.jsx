import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', icon: '🏠', label: 'Inicio' },
  { path: '/pedidos', icon: '📋', label: 'Pedidos' },
  { path: '/clientes', icon: '👥', label: 'Clientes' },
  { path: '/reportes', icon: '📊', label: 'Reportes' },
  { path: '/ajustes', icon: '⚙️', label: 'Ajustes' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>

      {location.pathname === '/' && (
        <button
          onClick={() => navigate('/nuevo-pedido')}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            borderRadius: 28,
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(232, 137, 95, 0.4)',
            zIndex: 100,
            border: 'none',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
          Anotar Pedido
        </button>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        padding: '6px 0 env(safe-area-inset-bottom, 6px) 0',
      }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 0',
                fontSize: 11,
                color: isActive ? 'var(--primary)' : 'var(--muted)',
                background: 'none',
                border: 'none',
                transition: 'color 0.2s',
              }}
            >
              <span style={{
                fontSize: 22,
                lineHeight: 1,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s',
              }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
