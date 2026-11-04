import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/** Sesión + rol (admin | digitador | usuario): el rol se guarda en la tabla
 * indicadores_usuarios. Si la cuenta no tiene fila ahí, se trata como
 * 'usuario' (solo ve y diligencia indicadores, sin Configuración ni Resumen). */
export function useSesion() {
  const [estado, setEstado] = useState({ cargando: true, sesion: null });

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setEstado({ cargando: false, sesion: null }); return; }
    let rol = 'usuario';
    try {
      const { data } = await supabase.from('indicadores_usuarios').select('rol').eq('user_id', session.user.id).single();
      if (data?.rol) rol = data.rol;
    } catch { /* sin fila todavía: se queda como 'usuario' */ }
    if (!['admin', 'digitador', 'usuario'].includes(rol)) rol = 'usuario';
    setEstado({ cargando: false, sesion: {
      email: session.user.email, id: session.user.id, rol,
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
    return () => { activo = false; sub.subscription.unsubscribe(); };
  }, []);

  return estado;
}

export async function iniciarSesion(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error('Correo o contraseña incorrectos.');
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}
