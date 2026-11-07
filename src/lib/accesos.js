import { supabase } from './supabaseClient';

/* Quién entra y quién sale. Nunca debe estorbar a la persona: si falla, se ignora. */
const CLAVE = 'tm:ingreso-registrado';

/** El ingreso se anota una sola vez por pestaña (aunque la sesión ya estuviera abierta de antes). */
export async function registrarIngresoUnaVez() {
  try {
    if (sessionStorage.getItem(CLAVE)) return;
    sessionStorage.setItem(CLAVE, '1');
    await supabase.rpc('indicadores_registrar_sesion', { p_evento: 'ingreso' });
  } catch { /* no se bloquea nada por esto */ }
}

export async function registrarSalida() {
  try { sessionStorage.removeItem(CLAVE); await supabase.rpc('indicadores_registrar_sesion', { p_evento: 'salida' }); } catch { /* idem */ }
}

/** Marca que la persona sigue en la aplicación y en qué pantalla está. */
export async function latido(pantalla) {
  try { await supabase.rpc('indicadores_latido', { p_pantalla: pantalla }); } catch { /* idem */ }
}
