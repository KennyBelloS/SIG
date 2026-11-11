import { createClient } from '@supabase/supabase-js';
import { avisarCambioDeDatos, esCambioDeSeguimiento } from './actualizacion';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[Supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env.local y coloca las credenciales de tu proyecto de Supabase ' +
    '(ver MANUAL de instalación).'
  );
}

// cada vez que algo del seguimiento se guarda bien, las pantallas abiertas (la Matriz, el Inicio…) se enteran y se ponen al día
const fetchAvisando = async (entrada, opciones) => {
  const respuesta = await fetch(entrada, opciones);
  try { if (respuesta.ok && esCambioDeSeguimiento(typeof entrada === 'string' ? entrada : entrada.url, opciones?.method || entrada.method)) avisarCambioDeDatos(); } catch { /* nunca estorba */ }
  return respuesta;
};
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', { global: { fetch: fetchAvisando } });
export const supabaseConfigurado = Boolean(url && anonKey);
