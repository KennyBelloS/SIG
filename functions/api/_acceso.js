/* Accesos por cédula y por usuario.
 * Supabase solo sabe iniciar sesión con un correo. Para quienes entran con cédula o con usuario, la aplicación les da un correo
 * interno (nunca se les muestra ni se les escribe nada a él) y el PIN hace de contraseña. Esta misma regla vive en el navegador
 * (src/lib/acceso.js): si se cambia aquí, hay que cambiarla allá. */
export const DOMINIO_ACCESO = 'acceso.torremolinos.app';

/** Cédula: solo números (se aceptan puntos, espacios y guiones al escribirla). Usuario: letras sin tilde, números, punto, guion y guion bajo. */
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

/** PIN de 6 dígitos al azar, sin repeticiones ni secuencias obvias (111111, 123456, 654321, 121212...). */
export function generarPin(largo = 6) {
  for (let intento = 0; intento < 50; intento++) {
    const a = new Uint32Array(largo); crypto.getRandomValues(a);
    const d = Array.from(a, n => n % 10), pin = d.join('');
    const distintos = new Set(d).size;
    const sube = d.every((x, i) => i === 0 || x === d[i - 1] + 1), baja = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
    if (distintos >= 4 && !sube && !baja) return pin;
  }
  return '482915';
}
