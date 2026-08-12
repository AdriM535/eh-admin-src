const NAV_ITEMS = [
  { id: 'dashboard', label: 'Panorama', n: '00' },
  { id: 'obras', label: 'Obras', n: '01' },
  { id: 'clientes', label: 'Clientes', n: '02' },
  { id: 'ventas', label: 'Facturas de venta', n: '03' },
  { id: 'compras', label: 'Facturas de compra', n: '04' },
  { id: 'abonos', label: 'Abonos y anticipos', n: '05' },
  { id: 'caja', label: 'Caja', n: '06' },
  { id: 'presupuestos', label: 'Presupuestos', n: '07' },
  { id: 'servicios', label: 'Catálogo de servicios', n: '08' },
  { id: 'personal', label: 'Personal', n: '09' },
  { id: 'nominas', label: 'Nóminas', n: '10' },
  { id: 'incidencias', label: 'Incidencias', n: '11' },
  { id: 'importar', label: 'Importar Excel', n: '12', adminOnly: true },
  { id: 'usuarios', label: 'Usuarios', n: '13', adminOnly: true },
  { id: 'respaldos', label: 'Respaldos', n: '14', adminOnly: true },
];

export default function Sidebar({ tab, setTab, data, onExport, userEmail, isAdmin, onSignOut }) {
  const items = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src="/logo-icon.png" alt="" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
          <div className="mark">Estructuras Humanizadoras</div>
        </div>
        <div className="sub">Gestión de obras y facturación</div>
      </div>
      <nav>
        {items.map((it) => (
          <button key={it.id} className={'navbtn' + (tab === it.id ? ' active' : '')} onClick={() => setTab(it.id)}>
            <span className="num">{it.n}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '10px 20px 0' }}>
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
