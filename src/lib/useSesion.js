import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { registrarSalida } from './accesos';

/** Sesión + rol (admin | digitador | usuario): el rol se guarda en la tabla
 * indicadores_usuarios. Si la cuenta no tiene fila ahí, se trata como
 * 'usuario' (solo ve y diligencia indicadores, sin Configuración ni Resumen). */
export function useSesion() {
  const [estado, setEstado] = useState({ cargando: true, sesion: null });

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setEstado({ cargando: false, sesion: null }); return; }
    let rol = 'usuario', nombre = null, rolNoLeido = false;
    try {
      let r = await supabase.from('indicadores_usuarios').select('rol, nombre').eq('user_id', session.user.id).single();
      // si la columna "nombre" todavía no existe (falta ejecutar el SQL de la versión nueva), se vuelve a pedir solo el rol
      if (r.error && /nombre|column|does not exist|schema cache/i.test(r.error.message || '')) r = await supabase.from('indicadores_usuarios').select('rol').eq('user_id', session.user.id).single();
      // "no hay fila" es normal (una cuenta sin rol es un usuario); cualquier otro error NO debe quitar permisos sin avisar
      if (r.error && r.error.code !== 'PGRST116') rolNoLeido = true;
      if (r.data?.rol) rol = r.data.rol;
      nombre = r.data?.nombre?.trim() || null;
    } catch { rolNoLeido = true; }
    if (!['admin', 'digitador', 'usuario'].includes(rol)) rol = 'usuario';
    setEstado({ cargando: false, sesion: {
      email: session.user.email, id: session.user.id, rol, nombre, rolNoLeido,
      nombreVisible: nombre || session.user.email,
      esAdmin: rol === 'admin',
      esDigitador: rol === 'digitador',
      puedeRegistrar: rol === 'admin' || rol === 'digitador',
    } });
  }

  useEffect(() => {
    let activo = true;
    const envoltura = async () => { if (activo) await cargar(); };
    envoltura();
    const { data: sub } = supabase.auth.onAuthStateChange(() => envoltura());
    // cuando alguien cambia su nombre, todas las pantallas lo reflejan al instante
    window.addEventListener('tm:sesion-cambio', envoltura);
    return () => { activo = false; sub.subscription.unsubscribe(); window.removeEventListener('tm:sesion-cambio', envoltura); };
  }, []);

  return estado;
}

export async function iniciarSesion(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error('Correo o contraseña incorrectos.');
}

export async function cerrarSesion() {
  await registrarSalida();
  await supabase.auth.signOut();
}
