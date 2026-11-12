/* Lo último que abriste, guardado en tu propio equipo.
   Sirve para que el buscador (Ctrl+K) te ofrezca de entrada los indicadores en los que venías
   trabajando, en vez de una lista vacía: con 47 indicadores y creciendo, volver al de ayer no
   debería costar escribir su nombre completo. */

const CLAVE = 'tm:recientes';
const TOPE = 8;

export function leerRecientes() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

/** Anota que se abrió un indicador. Lo más nuevo queda de primero y no se repite. */
export function anotarReciente({ id, nombre, proceso }) {
  if (!id || !nombre) return;
  try {
    const lista = leerRecientes().filter(r => String(r.id) !== String(id));
    lista.unshift({ id, nombre, proceso: proceso || '', visto: Date.now() });
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, TOPE)));
  } catch { /* sin almacenamiento disponible: la aplicación sigue igual, solo sin memoria */ }
}

export function olvidarRecientes() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada que hacer */ }
}
