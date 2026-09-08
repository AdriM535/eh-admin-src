import { useState } from 'react';
import { sugerirModoPorPantalla } from '../hooks/useDeviceMode.js';

export default function DeviceModeChooser({ onElegir }) {
  const sugerido = sugerirModoPorPantalla();
  const [recordar, setRecordar] = useState(true);

  return (
    <div className="modechooser">
      <div className="modechooser-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
          <img src="/logo-icon.png" alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>Estructuras Humanizadoras</div>
        </div>
        <h1>¿Cómo quieres usar la aplicación?</h1>
        <div className="desc" style={{ marginBottom: 24 }}>Puedes cambiarlo cuando quieras desde el menú.</div>

        <div className="modechooser-options">
          <button className={'modechooser-opt' + (sugerido === 'computadora' ? ' sugerido' : '')} onClick={() => onElegir('computadora', recordar)}>
            <span className="modechooser-icon">💻</span>
            <span className="modechooser-label">Computadora</span>
            <span className="modechooser-desc">Tablas, filtros y vistas amplias</span>
            {sugerido === 'computadora' && <span className="pill steel" style={{ marginTop: 8 }}>Sugerido para esta pantalla</span>}
          </button>
          <button className={'modechooser-opt' + (sugerido === 'movil' ? ' sugerido' : '')} onClick={() => onElegir('movil', recordar)}>
            <span className="modechooser-icon">📱</span>
            <span className="modechooser-label">Móvil</span>
            <span className="modechooser-desc">Tarjetas y botones grandes, pensado para consultar rápido</span>
            {sugerido === 'movil' && <span className="pill steel" style={{ marginTop: 8 }}>Sugerido para esta pantalla</span>}
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, fontSize: 13, color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
          Recordar mi elección en este dispositivo
        </label>
      </div>
    </div>
  );
}
