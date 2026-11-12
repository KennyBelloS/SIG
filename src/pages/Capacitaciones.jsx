import PageHeader from '../components/PageHeader';
import ModuloProximamente from '../components/ModuloProximamente';

/** Vista previa del módulo de Capacitaciones: todavía sin funcionalidad real.
 *  Solo para que admin y digitador se den una idea de cómo se va a ver. */
export default function Capacitaciones() {
  return (
    <>
      <PageHeader titulo="Capacitaciones" descripcion="Aquí va a vivir todo lo de formación del personal: cursos, asistencia y certificados." />
      <ModuloProximamente
        icono="fa-graduation-cap"
        ejemplos={[
          { icono: 'fa-chalkboard-user', titulo: 'Catálogo de cursos', texto: 'Temas, duración y a qué proceso aplica cada uno.' },
          { icono: 'fa-clipboard-check', titulo: 'Asistencia', texto: 'Quién tomó cada capacitación y cuándo.' },
          { icono: 'fa-certificate', titulo: 'Certificados vencidos', texto: 'Avisos de recertificación, como los de los indicadores.' },
        ]}
      />
    </>
  );
}
