import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getCierresDelAnio, getConfiguracionNotificaciones, estaCerrado, mesReporteActual, MESES, MESES_CORTO } from '../lib/indicadores';

/** La franja del plazo: una regla con los 12 meses del año y la cuenta regresiva del mes que hoy se está reportando.
 *  Es lo primero que se ve en cualquier pantalla porque es lo que más importa: cada mes se cierra. */
export default function FranjaPlazo() {
  const { pathname } = useLocation();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vivo = true;
    const { anioReporte } = mesReporteActual();
    const anios = [...new Set([new Date().getFullYear(), anioReporte])];
    Promise.all([getConfiguracionNotificaciones().catch(() => null), ...anios.map(a => getCierresDelAnio(a).catch(() => []))])
      .then(([cfg, ...cs]) => { if (vivo) setDatos({ dia: cfg?.dia_cierre ?? 15, cierres: cs.flat() }); });
    return () => { vivo = false; };
  }, [pathname]);

  if (!datos) return <div className="franja franja-carga" aria-hidden="true" />;

  const hoy = new Date();
  const anioHoy = hoy.getFullYear(), mesHoy = hoy.getMonth() + 1;
  const { anioReporte, mesReporte } = mesReporteActual();
  const cierreRep = datos.cierres.find(c => c.anio === anioReporte && c.mes === mesReporte);
  const cerrado = estaCerrado(anioReporte, mesReporte, datos.cierres, datos.dia);
  const reabierto = !!cierreRep && cierreRep.cerrado === false && hoy.getDate() > datos.dia;
  const restan = datos.dia - hoy.getDate();
  const urgente = !cerrado && !reabierto && restan <= 2;

  let titulo, detalle, tono;
  if (reabierto) {
    titulo = `${MESES[mesReporte - 1]} fue reabierto por un administrador`;
    detalle = 'Se puede registrar hasta que vuelva a cerrarse.'; tono = 'abierto';
  } else if (cerrado) {
    titulo = `${MESES[mesReporte - 1]} está cerrado desde el ${datos.dia + 1} de ${MESES[mesHoy - 1].toLowerCase()}`;
    detalle = 'Solo un administrador puede reabrirlo.'; tono = 'cerrado';
  } else {
    titulo = `${MESES[mesReporte - 1]} se puede registrar hasta el ${datos.dia} de ${MESES[mesHoy - 1].toLowerCase()}`;
    detalle = restan === 0 ? 'Hoy es el último día.' : restan === 1 ? 'Queda 1 día.' : `Quedan ${restan} días.`; tono = urgente ? 'urgente' : 'plazo';
  }
  const avance = cerrado ? 1 : Math.min(1, hoy.getDate() / datos.dia);

  const estadoDe = m => {
    if (m > mesHoy) return 'futuro';
    // los meses pasados están cerrados (salvo que un administrador los reabra); el mes en curso es el del plazo
    return estaCerrado(anioHoy, m, datos.cierres, datos.dia) ? 'cerrado' : (m === mesHoy ? 'plazo' : 'abierto');
  };
  const TEXTO = { futuro: 'por venir', curso: 'mes en curso', plazo: 'abierto para registrar', abierto: 'abierto', cerrado: 'cerrado' };

  return (
    <div className={`franja franja-${tono}`}>
      <p className="franja-texto" aria-live="polite"><strong>{titulo}.</strong> <span>{detalle}</span></p>
      <ol className="regla" aria-label={`Estado de los meses de ${anioHoy}`}>
        {MESES_CORTO.map((nombre, i) => {
          const m = i + 1, e = estadoDe(m);
          return (
            <li key={m} className={`regla-mes e-${e}`} title={`${MESES[i]}: ${TEXTO[e]}`}>
              <span className="regla-barra">{e === 'plazo' && <u style={{ width: `${avance * 100}%` }} />}</span>
              <span className="regla-nombre">{nombre}<span className="sr-only">, {TEXTO[e]}</span></span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
