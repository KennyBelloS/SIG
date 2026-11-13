/** Avisos breves ("toasts"). Cualquier pantalla llama a avisar() y el Toaster del armazón los muestra.
 *  `accion` es opcional: { texto:'Deshacer', hacer: () => {...} } — le pone un botón al aviso. */
export function avisar(texto, { tipo = 'ok', celebrar = false, accion = null } = {}) {
  window.dispatchEvent(new CustomEvent('indicadores:aviso', { detail: { texto, tipo, celebrar, accion, id: Date.now() + Math.random() } }));
}
