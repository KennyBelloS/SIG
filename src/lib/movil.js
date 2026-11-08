import { useEffect, useState } from 'react';

const CONSULTA = '(max-width: 900px)';

/** ¿Estamos en un teléfono? (pantalla angosta). Cambia solo si se gira el equipo o se cambia el tamaño. */
export function useMovil() {
  const [movil, setMovil] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(CONSULTA).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(CONSULTA);
    const alCambiar = () => setMovil(m.matches);
    alCambiar();
    m.addEventListener ? m.addEventListener('change', alCambiar) : m.addListener(alCambiar);
    return () => (m.removeEventListener ? m.removeEventListener('change', alCambiar) : m.removeListener(alCambiar));
  }, []);
  return movil;
}

export const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const esAndroid = () => /Android/i.test(navigator.userAgent);
/** ¿Ya está instalada como aplicación (abierta desde la pantalla de inicio)? */
export const estaInstalada = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

// Chrome en Android avisa una sola vez que se puede instalar: se guarda el aviso para ofrecer «Instalar ahora» cuando toque.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__tmInstalar = e; window.dispatchEvent(new Event('tm:puede-instalar')); });
  window.addEventListener('appinstalled', () => { window.__tmInstalar = null; });
}
