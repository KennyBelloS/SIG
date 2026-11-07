import { supabase } from './supabaseClient';

/** Manda al servidor lo que la vista previa dejó confirmado. Solo administradores. */
export async function importarLibroEnServidor(carga) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión.');
  const resp = await fetch('/api/importar-libro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(carga),
  });
  if (resp.status === 404) throw new Error('El servicio de importación no está disponible aquí. Las funciones de Cloudflare no corren con "npm run dev": usa "npm run preview:api", o despliega la app en Cloudflare Pages.');
  const texto = await resp.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { /* sin JSON */ }
  if (!resp.ok) throw new Error(cuerpo?.error || `No se pudo importar (código ${resp.status}).`);
  return cuerpo || {};
}
