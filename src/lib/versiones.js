/** Identificador de la compilación que está corriendo (lo inyecta Vite). En desarrollo vale "dev". */
export const VERSION = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

/** Lo que se le cuenta a la gente cuando el sistema se actualiza. Se edita a mano antes de cada publicación importante. */
export const NOVEDADES = {
  titulo: 'El sistema se actualizó',
  items: [
    ['fa-lock', 'Cada mes se cierra solo después del día 15 de ese mismo mes.', 'Hoy solo están abiertos el mes en curso y los que vienen; los meses que ya pasaron están cerrados. Solo un administrador puede reabrirlos.'],
    ['fa-table', 'El cuadro de edición de un indicador se parece al Excel.', 'Con la tabla de metas mes a mes y una vista previa que muestra al instante qué meses cumplirían.'],
    ['fa-book-open', 'La Auditoría ahora se llama Bitácora.', 'Quién cambió qué, quién entra y sale, y cuánto espacio queda.'],
    ['fa-wand-magic-sparkles', 'Entrada animada y actualizaciones automáticas.', 'Cuando haya una versión nueva, el sistema te avisa y se actualiza solo.'],
  ],
};
