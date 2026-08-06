import { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useData } from './hooks/useData.js';
import { useDocuments } from './hooks/useDocuments.js';
import { computeAll } from './lib/computations.js';
import { exportToExcel } from './lib/excelExport.js';

import Login from './components/Auth/Login.jsx';
import Sidebar from './components/Sidebar.jsx';

import Dashboard from './components/tabs/Dashboard.jsx';
import Obras from './components/tabs/Obras.jsx';
import Clientes from './components/tabs/Clientes.jsx';
import FacturasVenta from './components/tabs/FacturasVenta.jsx';
import FacturasCompra from './components/tabs/FacturasCompra.jsx';
import Abonos from './components/tabs/Abonos.jsx';
import Presupuestos from './components/tabs/Presupuestos.jsx';
import Personal from './components/tabs/Personal.jsx';
import Nominas from './components/tabs/Nominas.jsx';
import Incidencias from './components/tabs/Incidencias.jsx';
import Importar from './components/tabs/Importar.jsx';

import ObraForm from './components/forms/ObraForm.jsx';
import ClienteForm from './components/forms/ClienteForm.jsx';
import FacturaVentaForm from './components/forms/FacturaVentaForm.jsx';
import FacturaCompraForm from './components/forms/FacturaCompraForm.jsx';
import AbonoForm from './components/forms/AbonoForm.jsx';
import PresupuestoForm from './components/forms/PresupuestoForm.jsx';
import PersonalForm from './components/forms/PersonalForm.jsx';
import NominaForm from './components/forms/NominaForm.jsx';
import IncidenciaForm from './components/forms/IncidenciaForm.jsx';

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();

  return authLoading ? (
    <div className="loading">Cargando…</div>
  ) : !user ? (
    <Login signIn={signIn} signUp={signUp} />
  ) : (
    <Operacion user={user} onSignOut={signOut} />
  );
}

function Operacion({ user, onSignOut }) {
  const { data, loading, error, actions } = useData(user.id);
  const docs = useDocuments();
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(null);

  if (loading) return <div className="loading">Cargando obras y facturas…</div>;

  const calc = computeAll(data);

  const wrap = (fn) => async (...args) => {
    await fn(...args);
    setModal(null);
  };

  const tabProps = { data, actions, calc, setModal, setTab, docs };

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} data={data} onExport={() => exportToExcel(data, calc)} userEmail={user.email} onSignOut={onSignOut} />

      <main>
        {error && <div className="alertrow crit" style={{ marginBottom: 16 }}><span className="tag">ERROR</span>{error}</div>}
        {tab === 'dashboard' && <Dashboard {...tabProps} />}
        {tab === 'obras' && <Obras {...tabProps} />}
        {tab === 'clientes' && <Clientes {...tabProps} />}
        {tab === 'ventas' && <FacturasVenta {...tabProps} />}
        {tab === 'compras' && <FacturasCompra {...tabProps} />}
        {tab === 'abonos' && <Abonos {...tabProps} />}
        {tab === 'presupuestos' && <Presupuestos {...tabProps} />}
        {tab === 'personal' && <Personal {...tabProps} />}
        {tab === 'nominas' && <Nominas {...tabProps} />}
        {tab === 'incidencias' && <Incidencias {...tabProps} />}
        {tab === 'importar' && <Importar {...tabProps} />}
      </main>

      {modal?.type === 'obra' && <ObraForm initial={modal.initial} clientes={data.clientes} onSave={wrap(actions.saveObra)} onClose={() => setModal(null)} />}
      {modal?.type === 'cliente' && <ClienteForm initial={modal.initial} onSave={wrap(actions.saveCliente)} onClose={() => setModal(null)} />}
      {modal?.type === 'facturaVenta' && (
        <FacturaVentaForm initial={modal.initial} obras={data.obras} clientes={data.clientes} docs={docs} onSave={wrap(actions.saveFacturaVenta)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'facturaCompra' && (
        <FacturaCompraForm initial={modal.initial} obras={data.obras} personal={data.personal} docs={docs} onSave={wrap(actions.saveFacturaCompra)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'abono' && <AbonoForm initial={modal.initial} obras={data.obras} clientes={data.clientes} onSave={wrap(actions.saveAbono)} onClose={() => setModal(null)} />}
      {modal?.type === 'presupuesto' && (
        <PresupuestoForm initial={modal.initial} obras={data.obras} clientes={data.clientes} presupuestoLineas={data.presupuestoLineas} onSave={wrap(actions.savePresupuesto)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'personal' && <PersonalForm initial={modal.initial} onSave={wrap(actions.savePersonal)} onClose={() => setModal(null)} />}
      {modal?.type === 'nomina' && <NominaForm initial={modal.initial} personal={data.personal} onSave={wrap(actions.saveNomina)} onClose={() => setModal(null)} />}
      {modal?.type === 'incidencia' && <IncidenciaForm initial={modal.initial} obras={data.obras} personal={data.personal} onSave={wrap(actions.saveIncidencia)} onClose={() => setModal(null)} />}
    </div>
  );
}
