import { supabase } from './supabaseClient';
import { traducirError } from './indicadores';

/** Genera una contraseña temporal fácil de dictar: sin letras confundibles (0/O, 1/l/I) y con letras y números. */
export function generarClave(largo = 12) {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', numeros = '23456789', todo = letras + numeros;
  const azar = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  let c = '';
  while (c.length < largo) c += todo[azar(todo.length)];
  // garantiza al menos una letra y un número
  if (!/[a-zA-Z]/.test(c) || !/\d/.test(c)) return generarClave(largo);
  return c;
}

async function llamar(accion, datos) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión.');
  const resp = await fetch('/api/usuarios-indicadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ accion, ...datos }),
  });
  if (resp.status === 404) throw new Error('El servicio de usuarios no está disponible aquí. Las funciones de Cloudflare no corren con "npm run dev": usa "npm run preview:api", o despliega la app en Cloudflare Pages.');
  const texto = await resp.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { /* sin JSON */ }
  if (!resp.ok) throw new Error(cuerpo?.error || `No se pudo completar la acción (código ${resp.status}).`);
  return cuerpo || {};
}

export const crearUsuario = ({ email, password, rol, nombre }) => llamar('crear', { email, password, rol, nombre });
export const cambiarClaveDeUsuario = ({ user_id, password }) => llamar('clave', { user_id, password });
export const quitarUsuario = ({ user_id }) => llamar('eliminar', { user_id });

/** Cambia la contraseña de la persona que tiene la sesión abierta. */
export async function cambiarMiClave(nueva) {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw new Error(traducirError(error));
}

/** Cada persona cambia SOLO su propio nombre (la base lo garantiza). Vacío = volver a mostrar el correo. */
export async function cambiarMiNombre(nombre) {
  const { error } = await supabase.rpc('indicadores_cambiar_mi_nombre', { p_nombre: nombre });
  if (error) throw new Error(traducirError(error));
  window.dispatchEvent(new Event('tm:sesion-cambio'));
}
