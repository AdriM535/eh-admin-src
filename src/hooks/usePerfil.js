import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { rowToCamel } from '../lib/utils.js';

// Perfil (rol) de la cuenta actual. Si la tabla perfiles todavía no existe
// (falta ejecutar la migración 005) o no hay fila propia, se asume "admin"
// para no bloquear el acceso ya existente — el acceso real a los datos
// siempre lo decide RLS en la base de datos, esto solo controla qué
// pestañas se muestran en la interfaz.
export function usePerfil(userId) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(async () => {
    if (!userId) {
      setPerfil(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).maybeSingle();
    if (error || !data) {
      setPerfil({ role: 'admin', personalId: null });
    } else {
      setPerfil(rowToCamel(data));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('eh-perfil-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles', filter: `id=eq.${userId}` }, fetchPerfil)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId, fetchPerfil]);

  return { perfil, loading };
}
