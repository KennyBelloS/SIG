/* Idioma de la aplicación.
 *
 * El diccionario va del español (lo que ya está escrito en el código) al inglés. Así no hubo que
 * reescribir cada pantalla con códigos tipo «nav.home»: se envuelve el texto con t() y listo, y si
 * una frase todavía no está traducida se ve en español en vez de romperse o quedar en blanco.
 *
 * Para añadir un idioma: una entrada más en IDIOMAS y su diccionario en TRADUCCIONES.
 * Para traducir algo que quedó en español: una línea más en el diccionario.
 */

export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español', nativo: 'Español', bandera: '🇨🇴' },
  { codigo: 'en', nombre: 'Inglés', nativo: 'English', bandera: '🇺🇸' },
];

const EN = {
  // --- navegación ---
  'Inicio': 'Home',
  'Dashboard': 'Dashboard',
  'Matriz': 'Matrix',
  'Indicadores': 'Indicators',
  'Informe mensual': 'Monthly report',
  'Informe': 'Report',
  'Importar Excel': 'Import Excel',
  'Importar': 'Import',
  'Novedades': 'What’s new',
  'Configuración': 'Settings',
  'Ajustes': 'Settings',
  'Bitácora': 'Activity log',
  'Capacitaciones': 'Training',
  'Auditoría y control': 'Audit & control',
  'Cómo se usa': 'How it works',
  'Ayuda': 'Help',
  'Próximamente': 'Coming soon',
  'Pronto': 'Soon',
  'Seguimiento': 'Tracking',
  'Datos': 'Data',
  'Administración': 'Administration',
  'Acciones': 'Actions',
  'Secciones': 'Sections',
  'Más': 'More',
  'Módulos': 'Modules',

  // --- cuenta y sesión ---
  'Administrador': 'Administrator',
  'Digitador': 'Data entry',
  'Usuario': 'User',
  'Ingeniero': 'Engineer',
  'Mi cuenta': 'My account',
  'Cambiar mi nombre': 'Change my name',
  'Cambiar mi contraseña': 'Change my password',
  'Cerrar sesión': 'Sign out',
  'Inicio de sesión': 'Sign in',
  'Correo': 'Email',
  'Contraseña': 'Password',
  'Cédula o usuario': 'ID or username',
  'Entrar': 'Sign in',
  'Recordar mi correo': 'Remember my email',
  '¿Olvidaste tu contraseña?': 'Forgot your password?',
  'Buenos días': 'Good morning',
  'Buenas tardes': 'Good afternoon',
  'Buenas noches': 'Good evening',
  'Bienvenido': 'Welcome',

  // --- acciones comunes ---
  'Guardar': 'Save',
  'Cancelar': 'Cancel',
  'Eliminar': 'Delete',
  'Eliminar todo': 'Delete all',
  'Editar': 'Edit',
  'Crear': 'Create',
  'Buscar': 'Search',
  'Cerrar': 'Close',
  'Volver': 'Back',
  'Descargar': 'Download',
  'Exportar': 'Export',
  'Exportar a Excel': 'Export to Excel',
  'Imprimir': 'Print',
  'Enviar': 'Send',
  'Actualizar': 'Refresh',
  'Reintentar': 'Try again',
  'Ver todo': 'See all',
  'Aceptar': 'OK',
  'Sí': 'Yes',
  'No': 'No',

  // --- indicadores y meses ---
  'Proceso': 'Process',
  'Procesos': 'Processes',
  'Meta': 'Target',
  'Valor': 'Value',
  'Estado': 'Status',
  'Responsable': 'Owner',
  'Mes': 'Month',
  'Año': 'Year',
  'Cumple': 'On target',
  'No cumple': 'Off target',
  'Casi': 'Close',
  'Sin registrar': 'Not recorded',
  'Plan de acción': 'Action plan',
  'Análisis': 'Analysis',
  'Causa': 'Root cause',
  'Pendientes': 'Pending',
  'Cumplimiento': 'Compliance',
  'enero': 'January', 'febrero': 'February', 'marzo': 'March', 'abril': 'April',
  'mayo': 'May', 'junio': 'June', 'julio': 'July', 'agosto': 'August',
  'septiembre': 'September', 'octubre': 'October', 'noviembre': 'November', 'diciembre': 'December',

  // --- estados y avisos ---
  'Cargando…': 'Loading…',
  'Guardando…': 'Saving…',
  'No hay datos todavía': 'No data yet',
  'Sin conexión': 'Offline',
  'Atajos de teclado': 'Keyboard shortcuts',
  'Moverse': 'Navigate',
  'En esta pantalla': 'On this screen',
  'Seguir donde ibas': 'Pick up where you left off',
  'Ir a': 'Go to',
  'Idioma': 'Language',
  'Elige el idioma': 'Choose your language',
  'Tema': 'Theme',
  'Buscar cualquier sección, indicador o acción': 'Search any section, indicator or action',
  'Lo mismo, más rápido': 'The same, but faster',
  'Recorrer los resultados': 'Move through the results',
  'Abrir el resultado marcado': 'Open the highlighted result',
  'Abrir y cerrar esta ayuda': 'Open and close this help',
  'Cerrar lo que esté abierto': 'Close whatever is open',
  'Matriz de indicadores': 'Indicator matrix',
  'Ficha del indicador': 'Indicator details',
  'Importar desde Excel': 'Import from Excel',
  'Preferencias': 'Preferences',
  'Claro': 'Light',
  'Oscuro': 'Dark',
};

const TRADUCCIONES = { es: {}, en: EN };
const CLAVE = 'tm:idioma';
let actual = 'es';

try { const g = localStorage.getItem(CLAVE); if (g && IDIOMAS.some(i => i.codigo === g)) actual = g; } catch { /* sin almacenamiento */ }

export function getIdioma() { return actual; }

export function setIdioma(codigo) {
  if (!IDIOMAS.some(i => i.codigo === codigo)) return;
  actual = codigo;
  try { localStorage.setItem(CLAVE, codigo); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = codigo;
  window.dispatchEvent(new Event('tm:idioma'));
}

/** Traduce un texto. Si no está en el diccionario, devuelve el original (español). */
export function t(texto) {
  if (actual === 'es' || texto == null) return texto;
  return TRADUCCIONES[actual]?.[texto] ?? texto;
}

export function iniciarIdioma() { document.documentElement.lang = actual; }
