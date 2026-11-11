/* Cómo entra cada quien. Administradores y digitadores: correo y contraseña. Usuarios: cédula y PIN. Ingenieros: usuario y PIN.
 * Supabase solo conoce correos, así que a quien entra con cédula o usuario se le arma un correo interno (la persona nunca lo ve).
 * Esta regla es la MISMA de functions/api/_acceso.js: si se cambia una, hay que cambiar la otra. */
export const DOMINIO_ACCESO = 'acceso.torremolinos.app';

export function normalizarIdentificador(tipo, valor) {
  const v = String(valor ?? '').trim();
  if (tipo === 'cedula') { const d = v.replace(/[.\s,-]/g, ''); return /^\d{5,12}$/.test(d) ? d : null; }
  if (tipo === 'usuario') {
    const u = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
    return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(u) ? u : null;
  }
  return null;
}
export const correoDeAcceso = identificador => `${identificador}@${DOMINIO_ACCESO}`;

/** Lo que la persona escribió en «correo, cédula o usuario»: ¿qué correo de Supabase le corresponde? */
export function resolverAcceso(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  if (t.includes('@')) return { tipo: 'correo', email: t.toLowerCase() };
  const c = normalizarIdentificador('cedula', t); if (c) return { tipo: 'cedula', email: correoDeAcceso(c), identificador: c };
  const u = normalizarIdentificador('usuario', t); if (u) return { tipo: 'usuario', email: correoDeAcceso(u), identificador: u };
  return null;
}

/** Cómo se muestra a una persona en pantalla: su correo, o «Cédula 123…» / «Usuario carlos…» (nunca el correo interno). */
export function etiquetaDeCorreo(email, tipo, identificador) {
  const e = String(email || '');
  const suf = `@${DOMINIO_ACCESO}`;
  if (e.endsWith(suf) || (tipo && tipo !== 'correo')) {
    const id = identificador || e.slice(0, e.length - suf.length);
    return `${tipo === 'usuario' || (!tipo && !/^\d+$/.test(id)) ? 'Usuario' : 'Cédula'} ${id}`;
  }
  return e;
}

/** El ingeniero es de solo consulta: la ayuda, el recorrido y las guías que ve son las del rol «usuario». */
export const rolDeAyuda = rol => (rol === 'ingeniero' || !rol ? 'usuario' : rol);
