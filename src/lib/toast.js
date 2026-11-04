/** Avisos breves ("toasts"). Cualquier pantalla llama a avisar() y el Toaster del armazón los muestra. */
export function avisar(texto, { tipo = 'ok', celebrar = false } = {}) {
  window.dispatchEvent(new CustomEvent('indicadores:aviso', { detail: { texto, tipo, celebrar, id: Date.now() + Math.random() } }));
}
