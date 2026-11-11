import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

/* Que las pantallas se pongan al día solas con lo que cambian los indicadores. */
export const EVENTO_DATOS = 'tm:datos-cambiaron';
export const avisarCambioDeDatos = () => { try { window.dispatchEvent(new Event(EVENTO_DATOS)); } catch { /* nada */ } };

/** Una petición que MODIFICA algo del seguimiento (resultados, indicadores, procesos, cierres) y salió bien. */
export const esCambioDeSeguimiento = (url, metodo) => /^(POST|PATCH|PUT|DELETE)$/i.test(metodo || 'GET') && /\/rest\/v1\/(rpc\/)?indicadores(_registros|_procesos|_cierres)?(\?|$|\/)/.test(String(url)) ;

/** Vuelve a llamar a `recargar` cuando otro módulo guardó algo, cuando la pestaña vuelve a verse, y cada `cada` ms si está a la vista. */
export function useDatosVivos(recargar, { cada = 45000 } = {}) {
  const ref = useRef(recargar); ref.current = recargar;
  useEffect(() => {
    const ir = () => { if (!document.hidden) ref.current(); };
    window.addEventListener(EVENTO_DATOS, ir); window.addEventListener('focus', ir); document.addEventListener('visibilitychange', ir);
    const t = setInterval(ir, cada);
    // tiempo real: si otra persona guarda un resultado, esta pantalla se pone al día en un instante (un solo aviso aunque lleguen varios)
    let canal = null, esperando = null;
    try {
      if (typeof supabase.channel === 'function') {
        const pedir = () => { clearTimeout(esperando); esperando = setTimeout(ir, 600); };
        canal = supabase.channel('tm-datos-vivos');
        ['indicadores', 'indicadores_registros', 'indicadores_cierres', 'indicadores_procesos'].forEach(tabla => canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, pedir));
        canal.subscribe();
      }
    } catch { /* sin tiempo real: queda el aviso entre módulos, al volver a la pestaña y cada 45 s */ }
    return () => { window.removeEventListener(EVENTO_DATOS, ir); window.removeEventListener('focus', ir); document.removeEventListener('visibilitychange', ir); clearInterval(t); clearTimeout(esperando); try { if (canal && supabase.removeChannel) supabase.removeChannel(canal); } catch { /* nada */ } };
  }, [cada]);
}
