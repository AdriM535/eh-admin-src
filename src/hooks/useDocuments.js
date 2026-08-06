import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB por adjunto

// Adjunto único por registro (facturas de venta/compra): sube el archivo al
// bucket "documentos" y devuelve { adjuntoPath, adjuntoNombre } para guardar
// directamente en la fila de la tabla correspondiente.
export function useDocuments() {
  const [busy, setBusy] = useState(false);

  const uploadDocument = async (file, folder) => {
    if (file.size > MAX_BYTES) {
      window.alert(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El límite es de 20 MB.`);
      return null;
    }
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${folder || 'general'}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      return { adjuntoPath: path, adjuntoNombre: file.name };
    } catch (err) {
      window.alert('No se pudo subir el archivo: ' + err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const viewDocument = async (path) => {
    const { data, error: err } = await supabase.storage.from('documentos').createSignedUrl(path, 60);
    if (err || !data) {
      window.alert('No se pudo recuperar el archivo.');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const deleteDocument = async (path) => {
    if (!path) return;
    await supabase.storage.from('documentos').remove([path]);
  };

  return { busy, uploadDocument, viewDocument, deleteDocument };
}
