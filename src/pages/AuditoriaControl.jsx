import PageHeader from '../components/PageHeader';
import ModuloProximamente from '../components/ModuloProximamente';

/** Vista previa del módulo de Auditoría y control: todavía sin funcionalidad real.
 *  No confundir con «Bitácora» (quién cambió qué en la app): esto es auditoría de procesos/calidad. */
export default function AuditoriaControl() {
  return (
    <>
      <PageHeader titulo="Auditoría y control" descripcion="Auditorías de proceso y hallazgos: algo distinto de la Bitácora, que es el historial de la aplicación." />
      <ModuloProximamente
        icono="fa-magnifying-glass-chart"
        ejemplos={[
          { icono: 'fa-list-check', titulo: 'Listas de chequeo', texto: 'Auditorías por proceso, con puntaje y evidencias.' },
          { icono: 'fa-triangle-exclamation', titulo: 'Hallazgos y planes de acción', texto: 'Qué se encontró, quién lo corrige y para cuándo.' },
          { icono: 'fa-chart-line', titulo: 'Tendencia de cumplimiento', texto: 'Cómo va mejorando (o no) cada proceso auditoría tras auditoría.' },
        ]}
      />
    </>
  );
}
