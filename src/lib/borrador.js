/* Borradores locales: si se va la luz, el navegador se cierra solo o alguien le da «atrás» por error,
 * lo que se estaba escribiendo no se pierde.
 *
 * Cada borrador se guarda con su propia llave (ej. un indicador+año+mes en concreto), así que
 * cambiar de mes con las flechas del panel lateral no mezcla ni pisa el borrador de otro mes: cada
 * uno vive aparte y espera intacto hasta que se guarde de verdad o se descarte a mano.
 */

const PREFIJO = 'tm:borrador:';

export function leerBorrador(clave) {
  try {
    const crudo = localStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const v = JSON.parse(crudo);
    return v && typeof v === 'object' ? v : null;
  } catch { return null; }
}

export function guardarBorrador(clave, datos) {
  try { localStorage.setItem(PREFIJO + clave, JSON.stringify({ datos, en: Date.now() })); } catch { /* sin almacenamiento disponible */ }
}

export function borrarBorrador(clave) {
  try { localStorage.removeItem(PREFIJO + clave); } catch { /* nada que hacer */ }
}

/** "hace 3 minutos", "hace 2 horas"… para mostrar junto al aviso de borrador. */
export function hace(marca) {
  const s = Math.max(1, Math.round((Date.now() - marca) / 1000));
  if (s < 60) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} minuto${m === 1 ? '' : 's'}`;
  const h = Math.round(m / 60);
  return `hace ${h} hora${h === 1 ? '' : 's'}`;
}
