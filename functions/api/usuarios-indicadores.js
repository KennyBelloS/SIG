/* Gestión de usuarios de la aplicación. SOLO para administradores.
 *
 * Crear una cuenta en Supabase exige la llave secreta (service_role), que nunca debe estar en la
 * pantalla. Por eso esto vive aquí, en el servidor: la pantalla manda la petición con la sesión de
 * quien la hace, y esta función comprueba que sea administrador ANTES de tocar nada.
 *
 * Acciones (POST, JSON):
 *   { accion: 'crear',    email, password, rol }   crea la cuenta y le asigna el rol
 *   { accion: 'clave',    user_id, password }       cambia la contraseña de una cuenta
 *   { accion: 'eliminar', user_id }                 quita el acceso y borra la cuenta
 *
 * Reglas: la contraseña no se registra ni se devuelve jamás; no se puede quitar el acceso a uno mismo;
 * si crear la cuenta funciona pero asignar el rol falla, la cuenta se borra (no quedan cuentas a medias).
 */

import { normalizarIdentificador, correoDeAcceso, generarPin } from './_acceso.js';

const ROLES = ['admin', 'digitador', 'ingeniero', 'usuario'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function conexion(env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  return url && llave ? { url, llave } : null;
}

/** Llamada a Supabase con la llave de servicio. */
async function sb(c, ruta, { metodo = 'GET', cuerpo, cabeceras = {} } = {}) {
  const r = await fetch(`${c.url}${ruta}`, {
    method: metodo,
    headers: { apikey: c.llave, Authorization: `Bearer ${c.llave}`, 'Content-Type': 'application/json', ...cabeceras },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* respuesta sin JSON */ }
  return { ok: r.ok, status: r.status, datos };
}

/** Quién es la persona que hace la petición, según su sesión. */
async function personaDeLaSesion(c, token) {
  if (!token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.llave, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? u : null;
}

function mensajeDeSupabase(r, porDefecto) {
  const m = String(r?.datos?.msg || r?.datos?.message || r?.datos?.error_description || '');
  const codigo = String(r?.datos?.error_code || r?.datos?.code || '');
  if (/weak_password|password/i.test(codigo + m) && /weak|short|least|characters/i.test(m)) return 'La contraseña es muy débil. Usa al menos 8 caracteres, con letras y números.';
  if (/rate|too many/i.test(codigo + m)) return 'Supabase está limitando las peticiones. Espera un minuto e inténtalo de nuevo.';
  return porDefecto;
}

function validarClave(password, email) {
  if (typeof password !== 'string') return 'Escribe la contraseña.';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (password.length > 72) return 'La contraseña no puede pasar de 72 caracteres.';
  if (email && password.toLowerCase() === email) return 'La contraseña no puede ser igual al correo.';
  return null;
}

/** Busca una cuenta de Supabase por correo (para cuando ya existía y solo falta darle rol). */
async function buscarCuentaPorCorreo(c, email) {
  for (let pagina = 1; pagina <= 10; pagina++) {
    const r = await sb(c, `/auth/v1/admin/users?page=${pagina}&per_page=200`);
    if (!r.ok) return null;
    const lista = r.datos?.users || [];
    const hallada = lista.find(u => String(u.email || '').toLowerCase() === email);
    if (hallada) return hallada;
    if (lista.length < 200) return null;
  }
  return null;
}

/** El servidor escribe su propio resumen en la auditoría (la base no audita lo que hace la llave de servicio). Nunca incluye contraseñas. */
async function auditar(c, quien, fila) {
  try { await sb(c, '/rest/v1/indicadores_auditoria', { metodo: 'POST', cabeceras: { Prefer: 'return=minimal' }, cuerpo: [{ user_id: quien.id, email: quien.email || null, nombre: quien.nombre || null, tipo: 'usuario', entidad: 'indicadores_usuarios', ...fila }] }); } catch { /* sin auditoría no se detiene la acción */ }
}

async function asignarRol(c, { user_id, email, rol, nombre, extra = {} }) {
  return sb(c, '/rest/v1/indicadores_usuarios?on_conflict=user_id', {
    metodo: 'POST',
    cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    cuerpo: [{ user_id, email, rol, ...(nombre ? { nombre } : {}), ...extra }],
  });
}

/** Crea a una persona que entra con CÉDULA (rol usuario) o con USUARIO (rol ingeniero). La aplicación genera el PIN; solo se devuelve aquí, una vez. */
async function crearPorIdentificador(c, cuerpo, quien, tipo) {
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
  if (nombre.length < 3 || nombre.length > 80) return json({ error: 'Escribe el nombre completo de la persona (de 3 a 80 letras).' }, 400);
  const identificador = normalizarIdentificador(tipo, cuerpo.identificador);
  if (!identificador) return json({ error: tipo === 'cedula' ? 'Escribe la cédula solo con números (de 5 a 12 dígitos).' : 'El usuario debe tener de 3 a 30 caracteres: letras sin tilde, números, punto, guion o guion bajo.' }, 400);
  const rol = tipo === 'cedula' ? 'usuario' : 'ingeniero';
  const procesos = tipo === 'usuario' && Array.isArray(cuerpo.procesos) ? [...new Set(cuerpo.procesos.map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 50) : [];
  const dup = await sb(c, `/rest/v1/indicadores_usuarios?identificador=ilike.${encodeURIComponent(identificador)}&select=user_id`);
  if (dup.ok && Array.isArray(dup.datos) && dup.datos.length) return json({ error: tipo === 'cedula' ? 'Ya hay una persona con esa cédula.' : 'Ya hay una persona con ese usuario.' }, 409);

  const email = correoDeAcceso(identificador);
  let alta = null, pin = null;
  for (let intento = 0; intento < 5; intento++) {   // si Supabase rechaza un PIN por débil, se genera otro
    pin = generarPin();
    alta = await sb(c, '/auth/v1/admin/users', { metodo: 'POST', cuerpo: { email, password: pin, email_confirm: true, user_metadata: { identificador, tipo } } });
    if (alta.ok && alta.datos?.id) break;
    if (!/weak|password/i.test(String(alta.datos?.msg || alta.datos?.message || alta.datos?.error_code || ''))) break;
  }
  if (!alta.ok || !alta.datos?.id) {
    const yaExiste = alta.status === 422 || alta.status === 409 || /already|registered|exists/i.test(String(alta.datos?.msg || alta.datos?.message || alta.datos?.error_code || ''));
    return json({ error: yaExiste ? (tipo === 'cedula' ? 'Ya existe una cuenta con esa cédula.' : 'Ya existe una cuenta con ese usuario.') : mensajeDeSupabase(alta, 'No se pudo crear el acceso. Inténtalo de nuevo.') }, yaExiste ? 409 : (alta.status >= 500 ? 502 : 400));
  }
  const id = alta.datos.id;
  const r = await asignarRol(c, { user_id: id, email, rol, nombre, extra: { identificador, tipo_acceso: tipo, procesos } });
  if (!r.ok) {
    await sb(c, `/auth/v1/admin/users/${id}`, { metodo: 'DELETE' });   // sin cuentas a medias
    return json({ error: 'No se pudo guardar a la persona, así que el acceso no se creó. ¿Ya ejecutaste el SQL del bloque 19? Inténtalo de nuevo.' }, 500);
  }
  await auditar(c, quien, { accion: 'crear', entidad_id: id, resumen: `Usuario: ${nombre} (${tipo === 'cedula' ? 'cédula' : 'usuario'} ${identificador}), con rol ${rol}`, despues: { identificador, rol, nombre, tipo_acceso: tipo, procesos } });
  return json({ ok: true, adoptado: false, usuario: { id, identificador, rol, nombre }, pin }, 201);
}

/** Un PIN nuevo para quien entra con cédula o con usuario (si lo olvidó). */
async function nuevoPin(c, cuerpo, quien) {
  if (!UUID.test(String(cuerpo.user_id || ''))) return json({ error: 'Falta indicar de quién es la cuenta.' }, 400);
  const en = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${cuerpo.user_id}&select=tipo_acceso,identificador,nombre`);
  if (!en.ok || !Array.isArray(en.datos) || !en.datos.length) return json({ error: 'Esa cuenta no está en la lista de usuarios de la aplicación.' }, 404);
  const p = en.datos[0];
  if ((p.tipo_acceso || 'correo') === 'correo') return json({ error: 'Esa persona entra con correo y contraseña: usa «Nueva contraseña».' }, 400);
  let pin = null, r = null;
  for (let intento = 0; intento < 5; intento++) {
    pin = generarPin();
    r = await sb(c, `/auth/v1/admin/users/${cuerpo.user_id}`, { metodo: 'PUT', cuerpo: { password: pin } });
    if (r.ok) break;
    if (!/weak|password/i.test(String(r.datos?.msg || r.datos?.message || r.datos?.error_code || ''))) break;
  }
  if (!r.ok) return json({ error: mensajeDeSupabase(r, 'No se pudo generar el PIN.') }, r.status >= 500 ? 502 : 400);
  await auditar(c, quien, { accion: 'editar', entidad_id: cuerpo.user_id, resumen: `PIN de ${p.nombre || p.identificador} restablecido` });
  return json({ ok: true, pin });
}

async function crear(c, cuerpo, quien) {
  if (cuerpo.tipo === 'cedula' || cuerpo.tipo === 'usuario') return crearPorIdentificador(c, cuerpo, quien, cuerpo.tipo);
  if (cuerpo.rol === 'ingeniero' || cuerpo.rol === 'usuario') {
    // por correo solo entran el administrador y el digitador; los demás roles entran por cédula o por usuario
    if (cuerpo.tipo === 'correo' || cuerpo.tipo === undefined) { /* se permite por compatibilidad: cuentas de consulta que ya entraban con correo */ }
  }
  const email = String(cuerpo.email || '').trim().toLowerCase();
  const rol = String(cuerpo.rol || '');
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
  if (nombre.length > 80) return json({ error: 'El nombre no puede pasar de 80 letras.' }, 400);
  if (!email || email.length > 254 || !CORREO.test(email)) return json({ error: 'Escribe un correo válido.' }, 400);
  if (!ROLES.includes(rol)) return json({ error: 'Elige un rol: administrador, digitador, ingeniero o usuario.' }, 400);
  const fallaClave = validarClave(cuerpo.password, email);
  if (fallaClave) return json({ error: fallaClave }, 400);

  const alta = await sb(c, '/auth/v1/admin/users', { metodo: 'POST', cuerpo: { email, password: cuerpo.password, email_confirm: true } });

  if (alta.ok && alta.datos?.id) {
    const id = alta.datos.id;
    const r = await asignarRol(c, { user_id: id, email, rol, nombre });
    if (!r.ok) {
      await sb(c, `/auth/v1/admin/users/${id}`, { metodo: 'DELETE' }); // sin cuentas a medias
      return json({ error: 'No se pudo asignar el rol, así que la cuenta no se creó. Inténtalo de nuevo.' }, 500);
    }
    await auditar(c, quien, { accion: 'crear', entidad_id: id, resumen: `Usuario: ${email}, con rol ${rol}`, despues: { email, rol, ...(nombre ? { nombre } : {}) } });
    return json({ ok: true, adoptado: false, usuario: { id, email, rol } }, 201);
  }

  const yaExiste = alta.status === 422 || alta.status === 409 || /already|registered|exists/i.test(String(alta.datos?.msg || alta.datos?.message || alta.datos?.error_code || ''));
  if (!yaExiste) return json({ error: mensajeDeSupabase(alta, 'No se pudo crear la cuenta. Revisa el correo y la contraseña.') }, alta.status >= 500 ? 502 : 400);

  // La cuenta ya existía en Supabase (por ejemplo, creada desde su panel): si no está en la lista, se adopta con el rol elegido.
  const existente = await buscarCuentaPorCorreo(c, email);
  if (!existente) return json({ error: 'Ya existe una cuenta con ese correo, pero no pude encontrarla. Revisa Supabase → Authentication → Users.' }, 409);
  const en = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${existente.id}&select=user_id`);
  if (en.ok && Array.isArray(en.datos) && en.datos.length) return json({ error: 'Esa persona ya está en la lista de usuarios. Cambia su rol desde la lista.' }, 409);
  const r = await asignarRol(c, { user_id: existente.id, email, rol, nombre });
  if (!r.ok) return json({ error: 'La cuenta ya existía pero no se pudo asignar el rol. Inténtalo de nuevo.' }, 500);
  await auditar(c, quien, { accion: 'crear', entidad_id: existente.id, resumen: `Usuario: ${email}, con rol ${rol} (la cuenta ya existía)`, despues: { email, rol } });
  return json({ ok: true, adoptado: true, usuario: { id: existente.id, email, rol } }, 200);
}

async function cambiarClave(c, cuerpo, quien) {
  if (!UUID.test(String(cuerpo.user_id || ''))) return json({ error: 'Falta indicar de quién es la cuenta.' }, 400);
  const fallaClave = validarClave(cuerpo.password);
  if (fallaClave) return json({ error: fallaClave }, 400);
  const en = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${cuerpo.user_id}&select=user_id,email`);
  if (!en.ok || !Array.isArray(en.datos) || !en.datos.length) return json({ error: 'Esa cuenta no está en la lista de usuarios de la aplicación.' }, 404);
  const r = await sb(c, `/auth/v1/admin/users/${cuerpo.user_id}`, { metodo: 'PUT', cuerpo: { password: cuerpo.password } });
  if (!r.ok) return json({ error: mensajeDeSupabase(r, 'No se pudo cambiar la contraseña.') }, r.status >= 500 ? 502 : 400);
  await auditar(c, quien, { accion: 'editar', entidad_id: cuerpo.user_id, resumen: `Contraseña de ${en.datos[0].email || cuerpo.user_id} restablecida` });
  return json({ ok: true });
}

async function eliminar(c, cuerpo, quien) {
  if (!UUID.test(String(cuerpo.user_id || ''))) return json({ error: 'Falta indicar de quién es la cuenta.' }, 400);
  if (String(cuerpo.user_id).toLowerCase() === String(quien.id).toLowerCase()) return json({ error: 'No puedes quitarte el acceso a ti mismo.' }, 400);
  const previo = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${cuerpo.user_id}&select=email,nombre,identificador,tipo_acceso`);
  const p0 = Array.isArray(previo.datos) ? previo.datos[0] : null;
  const correo = p0 ? ((p0.tipo_acceso && p0.tipo_acceso !== 'correo') ? `${p0.nombre || ''} (${p0.identificador})`.trim() : (p0.email || String(cuerpo.user_id))) : String(cuerpo.user_id);
  const fila = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${cuerpo.user_id}`, { metodo: 'DELETE', cabeceras: { Prefer: 'return=minimal' } });
  if (!fila.ok) return json({ error: 'No se pudo quitar el acceso. Inténtalo de nuevo.' }, 500);
  const cuenta = await sb(c, `/auth/v1/admin/users/${cuerpo.user_id}`, { metodo: 'DELETE' });
  if (!cuenta.ok && cuenta.status !== 404) return json({ error: 'Se quitó el rol, pero no se pudo borrar la cuenta de Supabase. Bórrala desde Authentication → Users.' }, 502);
  await auditar(c, quien, { accion: 'eliminar', entidad_id: cuerpo.user_id, resumen: `Usuario: ${correo}, acceso quitado` });
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  try {
    const c = conexion(env);
    if (!c) return json({ error: 'Falta configurar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages.' }, 500);

    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const quien = await personaDeLaSesion(c, token);
    if (!quien) return json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' }, 401);

    const fila = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${encodeURIComponent(quien.id)}&select=rol,nombre,email`);
    if (!fila.ok || !Array.isArray(fila.datos) || fila.datos[0]?.rol !== 'admin') {
      return json({ error: 'Solo un administrador puede gestionar usuarios.' }, 403);
    }

    quien.nombre = fila.datos[0].nombre || null;
    quien.email = quien.email || fila.datos[0].email || null;
    let cuerpo;
    try { cuerpo = await request.json(); } catch { return json({ error: 'La petición no es válida.' }, 400); }
    if (!cuerpo || typeof cuerpo !== 'object') return json({ error: 'La petición no es válida.' }, 400);

    switch (cuerpo.accion) {
      case 'crear': return await crear(c, cuerpo, quien);
      case 'clave': return await cambiarClave(c, cuerpo, quien);
      case 'pin': return await nuevoPin(c, cuerpo, quien);
      case 'eliminar': return await eliminar(c, cuerpo, quien);
      default: return json({ error: 'Acción desconocida.' }, 400);
    }
  } catch {
    return json({ error: 'Error inesperado del servidor.' }, 500);
  }
}

export async function onRequest({ request, env }) {
  if (request.method === 'POST') return onRequestPost({ request, env });
  return json({ error: 'Método no permitido.' }, 405);
}
