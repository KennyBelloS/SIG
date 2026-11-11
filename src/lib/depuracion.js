/* La actividad y los accesos de la Bitácora se eliminan solos el PRIMER MARTES de cada mes.
   Se avisa 5 días antes y hay 2 días de plazo para cancelarlo (el despertador solo borra si el aviso tiene 2 días o más). */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Día del mes del primer martes (mes 0-11; acepta 12 = enero del año siguiente). */
export function primerMartes(anio, mes) { const dow = new Date(anio, mes, 1).getDay(); return 1 + ((2 - dow + 7) % 7); }

/** El próximo primer martes (hoy cuenta si es martes y primer martes), cuántos días faltan y cómo se escribe. */
export function proximaDepuracion(hoy = new Date()) {
  const a = hoy.getFullYear(), m = hoy.getMonth(), d = hoy.getDate();
  let fecha = new Date(a, m, primerMartes(a, m));
  if (d > fecha.getDate()) fecha = new Date(a, m + 1, primerMartes(a, m + 1));
  const faltan = Math.round((fecha - new Date(a, m, d)) / 86400000);
  const iso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  return { fecha, iso, faltan, texto: `martes ${fecha.getDate()} de ${MESES[fecha.getMonth()]}` };
}
