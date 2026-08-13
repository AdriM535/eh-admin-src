import { useState } from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Panorama', icon: '📊' },
  { id: 'obras', label: 'Obras', icon: '🏗️' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'ventas', label: 'Facturas de venta', icon: '🧾' },
  { id: 'compras', label: 'Facturas de compra', icon: '🛒' },
  { id: 'abonos', label: 'Abonos y anticipos', icon: '💳' },
  { id: 'caja', label: 'Caja', icon: '💵' },
  { id: 'presupuestos', label: 'Presupuestos', icon: '📝' },
  { id: 'servicios', label: 'Catálogo de servicios', icon: '🧰' },
  { id: 'personal', label: 'Personal', icon: '👷' },
  { id: 'nominas', label: 'Nóminas', icon: '💼' },
  { id: 'incidencias', label: 'Incidencias', icon: '⚠️' },
  { id: 'importar', label: 'Importar Excel', icon: '📥', adminOnly: true },
  { id: 'usuarios', label: 'Usuarios', icon: '🔐', adminOnly: true },
  { id: 'respaldos', label: 'Respaldos', icon: '💾', adminOnly: true },
];

export default function Sidebar({ tab, setTab, data, onExport, userEmail, isAdmin, onSignOut }) {
  const items = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);
  const [navOpen, setNavOpen] = useState(false);
  const activo = NAV_ITEMS.find((it) => it.id === tab);
  const irA = (id) => { setTab(id); setNavOpen(false); };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src="/logo-icon.png" alt="" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
          <div className="mark">Estructuras Humanizadoras</div>
          <button
            className="hamburger"
            aria-label="Abrir menú"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="icon">{activo?.icon}</span> {activo?.label || 'Menú'} {navOpen ? '▲' : '▼'}
          </button>
        </div>
        <div className="sub">Gestión de obras y facturación</div>
      </div>
      <nav className={navOpen ? 'open' : ''}>
        {items.map((it) => (
          <button key={it.id} className={'navbtn' + (tab === it.id ? ' active' : '')} onClick={() => irA(it.id)}>
            <span className="icon">{it.icon}</span>{it.label}
          </button>
        ))}
        <div className="navfoot-mobile">
          <button className="btn ghost small" style={{ width: '100%' }} onClick={onExport}>⬇ Exportar a Excel</button>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '10px 0 6px' }}>{userEmail}</div>
          <button className="btn ghost small" style={{ width: '100%' }} onClick={onSignOut}>Cerrar sesión</button>
        </div>
      </nav>
      <div className="export-desktop" style={{ padding: '10px 20px 0' }}>
        <button className="btn ghost small" style={{ width: '100%' }} onClick={onExport}>⬇ Exportar a Excel</button>
      </div>
      <div className="sidebar-foot">
        {data.obras.filter((o) => o.estado === 'activa').length} obras activas · {data.clientes.length} clientes
        <br />
        {userEmail}
        <br />
        <button className="btn ghost small" style={{ marginTop: 6, width: '100%' }} onClick={onSignOut}>Cerrar sesión</button>
      </div>
    </aside>
  );
}
