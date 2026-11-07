/* Cómo se calcula cada indicador. No todos se digitan: unos salen de dos números del mes.
 *
 *   directo    el resultado se escribe tal cual
 *   ejecucion  ejecutadas ÷ planeadas                       (cumplimiento de un programa)
 *   razon      numerador ÷ denominador                      (una proporción)
 *   reduccion  (año anterior − año actual) ÷ año anterior   (cuánto se redujo; positivo = bajó, que es lo que se busca)
 *
 * Sin dependencias, para poder usarlo igual en la pantalla, en el lector del libro y en las pruebas. */
export const CALCULOS = {
  directo: { nombre: 'Resultado digitado', etiquetas: null, formula: 'Se escribe el resultado', f: null },
  ejecucion: { nombre: 'Ejecutadas ÷ planeadas', etiquetas: { a: 'Planeadas', b: 'Ejecutadas' }, formula: 'Ejecutadas ÷ Planeadas', f: (a, b) => (a > 0 ? b / a : null) },
  razon: { nombre: 'Numerador ÷ denominador', etiquetas: { a: 'Numerador', b: 'Denominador' }, formula: 'Numerador ÷ Denominador', f: (a, b) => (b > 0 ? a / b : null) },
  reduccion: { nombre: 'Reducción frente al año anterior', etiquetas: { a: 'Año anterior', b: 'Año actual' }, formula: '(Año anterior − Año actual) ÷ Año anterior', f: (a, b) => (a > 0 ? (a - b) / a : null) },
};

export const usaComponentes = ind => !!ind && ind.calculo && ind.calculo !== 'directo' && !!CALCULOS[ind.calculo];

/** Nombres de los dos números de un indicador: los que tenga definidos, o los de su forma de cálculo. */
export function etiquetasDe(ind) {
  const base = CALCULOS[ind?.calculo]?.etiquetas || { a: 'Número 1', b: 'Número 2' };
  return { a: ind?.componentes?.a || base.a, b: ind?.componentes?.b || base.b };
}

const num = v => (v === '' || v == null ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

/** Resultado que sale de los dos números del mes, o null si falta alguno o no se puede dividir. */
export function calcularValor(ind, comp) {
  const c = CALCULOS[ind?.calculo];
  if (!c || !c.f || !comp) return null;
  const a = num(comp.a), b = num(comp.b);
  if (a == null || b == null) return null;
  const v = c.f(a, b);
  return v != null && Number.isFinite(v) ? v : null;
}

/** Por qué no se pudo calcular (para decírselo a la persona en vez de dejar el resultado en blanco). */
export function motivoSinCalculo(ind, comp) {
  const a = num(comp?.a), b = num(comp?.b);
  if (a == null || b == null) return null;           // todavía está escribiendo
  const e = etiquetasDe(ind);
  if (ind.calculo === 'ejecucion' && !(a > 0)) return `${e.a} debe ser mayor que cero para poder dividir.`;
  if (ind.calculo === 'razon' && !(b > 0)) return `${e.b} debe ser mayor que cero para poder dividir.`;
  if (ind.calculo === 'reduccion' && !(a > 0)) return `${e.a} debe ser mayor que cero: sin una base no hay con qué comparar. Si es cero, escribe el resultado directo.`;
  return null;
}
