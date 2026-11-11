import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { registrarSalida } from './accesos';
import { resolverAcceso, etiquetaDeCorreo } from './acceso';

/** Sesión + rol (admin | digitador | usuario): el rol se guarda en la tabla
 * indicadores_usuarios. Si la cuenta no tiene fila ahí, se trata como
 * 'usuario' (solo ve y diligencia indicadores, sin Configuración ni Resumen). */
export function useSesion() {
  const [estado, setEstado] = useState({ cargando: true, sesion: null, recuperando: false });
  // se abrió el enlace de «olvidé mi contraseña»: hay que pedir una nueva antes de entrar.
  // No basta con esperar el aviso PASSWORD_RECOVERY de Supabase: a veces llega antes de que esta app
  // esté lista para escucharlo y se pierde. Por eso, además, se revisa la propia dirección del enlace
  // (Supabase la deja con «type=recovery», ya sea en el pedazo después del # o en los parámetros ?).
  const esEnlaceDeRecuperacion = () => /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);
  const recup = useRef(esEnlaceDeRecuperacion());

  async function cargar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { recup.current = false; setEstado({ cargando: false, sesion: null, recuperando: false }); return; }
    let rol = 'usuario', nombre = null, rolNoLeido = false, identificador = null, tipoAcceso = 'correo', procesos = [];
    try {
      // si todavía no se ejecutó el SQL del bloque 19, esas columnas no existen: se vuelve a pedir con menos columnas
      let r = null;
      for (const cols of ['rol, nombre, identificador, tipo_acceso, procesos', 'rol, nombre', 'rol']) {
        r = await supabase.from('indicadores_usuarios').select(cols).eq('user_id', session.user.id).single();
        if (!(r.error && /nombre|identificador|tipo_acceso|procesos|column|does not exist|schema cache/i.test(r.error.message || ''))) break;
      }
      // "no hay fila" es normal (una cuenta sin rol es un usuario); cualquier otro error NO debe quitar permisos sin avisar
      if (r.error && r.error.code !== 'PGRST116') rolNoLeido = true;
      if (r.data?.rol) rol = r.data.rol;
      nombre = r.data?.nombre?.trim() || null;
      identificador = r.data?.identificador || null;
      tipoAcceso = r.data?.tipo_acceso || 'correo';
      procesos = Array.isArray(r.data?.procesos) ? r.data.procesos : [];
    } catch { rolNoLeido = true; }
    if (!['admin', 'digitador', 'ingeniero', 'usuario'].includes(rol)) rol = 'usuario';
    // quien entra con cédula o con usuario nunca ve el correo interno: en su lugar, «Cédula 123…» o «Usuario carlos…»
    const etiqueta = etiquetaDeCorreo(session.user.email, tipoAcceso, identificador);
    setEstado({ cargando: false, recuperando: recup.current, sesion: {
      email: etiqueta, correoReal: session.user.email, id: session.user.id, rol, nombre, rolNoLeido, identificador, tipoAcceso, procesos,
      nombreVisible: nombre || etiqueta,
      esAdmin: rol === 'admin',
      esDigitador: rol === 'digitador',
      esIngeniero: rol === 'ingeniero',
      puedeRegistrar: rol === 'admin' || rol === 'digitador',
    } });
  }

  useEffect(() => {
    let activo = true;
    const envoltura = async () => { if (activo) await cargar(); };
    envoltura();
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => { if (evento === 'PASSWORD_RECOVERY') recup.current = true; envoltura(); });
    const finRecup = () => { recup.current = false; envoltura(); };
    const abrirRecup = () => { recup.current = true; envoltura(); };   // (también lo usan las pruebas)
    window.addEventListener('tm:recuperacion-fin', finRecup); window.addEventListener('tm:recuperacion', abrirRecup);
    // cuando alguien cambia su nombre, todas las pantallas lo reflejan al instante
    window.addEventListener('tm:sesion-cambio', envoltura);
    return () => { activo = false; sub.subscription.unsubscribe(); window.removeEventListener('tm:sesion-cambio', envoltura); window.removeEventListener('tm:recuperacion-fin', finRecup); window.removeEventListener('tm:recuperacion', abrirRecup); };
  }, []);

  return estado;
}

/** Entra con correo y contraseña (administrador, digitador) o con cédula / usuario y PIN (usuario, ingeniero). */
export async function iniciarSesion(identificador, secreto) {
  const acceso = resolverAcceso(identificador);
  const mensaje = !acceso || acceso.tipo === 'correo' ? 'Correo o contraseña incorrectos.' : 'La cédula, el usuario o el PIN no son correctos.';
  if (!acceso) throw new Error(mensaje);
  const { error } = await supabase.auth.signInWithPassword({ email: acceso.email, password: secreto });
  if (error) throw new Error(/rate|too many|limit/i.test(error.message || '') ? 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.' : mensaje);
}

export async function cerrarSesion() {
  await registrarSalida();
  await supabase.auth.signOut();
}
