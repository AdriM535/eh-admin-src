import { useCallback, useState } from 'react';

// Preferencia de presentación (tablas de escritorio vs. tarjetas de móvil),
// guardada por dispositivo, no por cuenta: cada persona puede usar un modo
// distinto en su ordenador y otro en su móvil sin que se pisen entre sí.
// "Recordar" -> localStorage (sobrevive a cerrar sesión/navegador).
// No recordar -> sessionStorage (solo dura esta sesión; en el siguiente
// inicio de sesión se vuelve a preguntar, tal como pide el encargo).
const KEY = 'eh_device_mode';

function leer() {
  try {
    return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function sugerirModoPorPantalla() {
  if (typeof window === 'undefined') return 'computadora';
  return window.matchMedia('(max-width: 860px)').matches ? 'movil' : 'computadora';
}

export function useDeviceMode() {
  const [modo, setModoState] = useState(leer);

  // recordar=true persiste entre sesiones; recordar=false solo para esta
  // pestaña/sesión de navegador (vuelve a preguntar al iniciar sesión otra vez).
  const elegirModo = useCallback((nuevoModo, recordar) => {
    try {
      if (recordar) {
        localStorage.setItem(KEY, nuevoModo);
        sessionStorage.removeItem(KEY);
      } else {
        sessionStorage.setItem(KEY, nuevoModo);
        localStorage.removeItem(KEY);
      }
    } catch {
      // almacenamiento no disponible (privado/bloqueado): el modo solo
      // vive en memoria para esta pantalla, no es un error fatal.
    }
    setModoState(nuevoModo);
  }, []);

  // El control del menú para cambiar de modo sobre la marcha: mantiene el
  // mismo nivel de "recordado" que ya tuviera (si no había nada guardado
  // todavía, lo recuerda a partir de ahora, ya que es un cambio explícito).
  const cambiarModo = useCallback((nuevoModo) => {
    let recordabaAntes = true;
    try { recordabaAntes = !!localStorage.getItem(KEY) || !sessionStorage.getItem(KEY); } catch { recordabaAntes = true; }
    elegirModo(nuevoModo, recordabaAntes);
  }, [elegirModo]);

  return { modo, elegirModo, cambiarModo };
}
