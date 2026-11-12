import { useEffect, useState } from 'react';
import { menosMovimiento } from '../lib/preferencias';

const INICIAL = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// patrón fijo (no al azar: así no titila distinto cada vez) de cómo cerró cada mes ya pasado
const TONO = [0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0];
const COLOR = ['#3FAE62', '#E0A830', '#C2425C'];

const R = 94, CEN = 130, C = 2 * Math.PI * R, SEG = C / 12 - 7;

/** La entrada al sistema, justo después de iniciar sesión.
 *
 *  El año de una finca es un CICLO, no una fila: por eso los doce meses forman un dial alrededor del
 *  logo, y un barrido los va encendiendo uno a uno —como un instrumento al arrancar— hasta que la
 *  aguja se clava en el mes de hoy. Es el único golpe de efecto de la pantalla; todo lo demás se
 *  mantiene callado a propósito. Dura unos 3,4 s y se salta con un clic o con Escape. */
export default function EntradaAnimada({ nombre }) {
  const [fase, setFase] = useState('entra');
  useEffect(() => {
    if (menosMovimiento()) { setFase('fin'); return undefined; }
    const abre = setTimeout(() => setFase('abre'), 3400), fin = setTimeout(() => setFase('fin'), 4250);
    const tecla = e => { if (e.key === 'Escape') setFase('fin'); };
    window.addEventListener('keydown', tecla);
    return () => { clearTimeout(abre); clearTimeout(fin); window.removeEventListener('keydown', tecla); };
  }, []);

  if (fase === 'fin') return null;
  const primero = nombre ? String(nombre).split(/\s+/)[0] : null;
  const hoy = new Date(), mesHoy = hoy.getMonth(), anio = hoy.getFullYear();
  const cerrados = TONO.slice(0, mesHoy + 1);
  const cumplidos = cerrados.filter(t => t === 0).length;

  return (
    <div className={`entrada-anim ${fase}`} role="status" aria-live="polite"
      onClick={() => setFase(f => (f === 'entra' ? 'abre' : f))}>
      <div className="ea-trama" aria-hidden="true" />

      <div className="ea-dial" aria-hidden="true">
        <svg viewBox="0 0 260 260">
          <circle cx={CEN} cy={CEN} r={R} className="ea-pista" strokeWidth="13" fill="none" />
          {INICIAL.map((m, i) => (
            <circle key={m + i} cx={CEN} cy={CEN} r={R} fill="none" strokeWidth="13"
              className={`ea-mes ${i === mesHoy ? 'ea-mes-hoy' : ''}`}
              stroke={i <= mesHoy ? COLOR[TONO[i]] : 'rgba(255,255,255,.13)'}
              strokeDasharray={`${SEG} ${C - SEG}`}
              transform={`rotate(${-90 + i * 30} ${CEN} ${CEN})`}
              style={{ '--i': i }} />
          ))}
          {INICIAL.map((m, i) => {
            const a = ((i * 30 + 15) - 90) * Math.PI / 180;
            return (
              <text key={`t${i}`} className={`ea-letra ${i === mesHoy ? 'ea-letra-hoy' : ''}`} style={{ '--i': i }}
                x={CEN + 118 * Math.cos(a)} y={CEN + 118 * Math.sin(a)}
                textAnchor="middle" dominantBaseline="central">{m}</text>
            );
          })}
          <g className="ea-barrido"><path d={`M ${CEN} ${CEN} L ${CEN} ${CEN - R - 14}`} /></g>
          <g className="ea-aguja" style={{ '--ang': `${mesHoy * 30 + 15}deg` }}>
            <path d={`M ${CEN} ${CEN - R + 19} l -6 -11 l 12 0 z`} />
          </g>
        </svg>
        <span className="ea-nucleo"><img src="/logo-icon.png" alt="" /></span>
      </div>

      <div className="ea-texto">
        <p className="ea-hola">{primero ? `Bienvenido, ${primero}` : 'Bienvenido'}</p>
        <h2 className="ea-titulo">Sistema de Gestión</h2>
        <p className="ea-pie">{MES[mesHoy]} de {anio} — {cumplidos} de {cerrados.length} meses en meta</p>
      </div>
    </div>
  );
}
