/* Service worker: hace que la aplicación ABRA sin internet (con lo último que se vio) y guarda las
 * respuestas de Supabase que se van pidiendo, para poder mostrarlas de nuevo sin conexión.
 *
 * Sube este número (v2, v3…) solo si alguna vez hace falta forzar que todo el mundo borre su caché vieja. */
const CACHE = 'tm-cache-v1';

const esNavegacion = req => req.mode === 'navigate';
const esMismoOrigen = url => url.origin === self.location.origin;
const esSupabaseGet = (req, url) => req.method === 'GET' && /\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith('/rest/v1/');
const esEstatico = (req, url) => req.method === 'GET' && esMismoOrigen(url) && (url.pathname.startsWith('/assets/') || /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/.test(url.pathname));

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const { request } = e; const url = new URL(request.url);

  // nunca se cachea: así el aviso de «hay una versión nueva» siempre sabe la verdad
  if (url.pathname === '/version.json') return;

  // la página misma (recargar, entrar directo a una ruta): red primero, y si no hay, lo último guardado
  if (esNavegacion(request)) {
    e.respondWith((async () => {
      try {
        const resp = await fetch(request);
        const cache = await caches.open(CACHE); cache.put('/index.html', resp.clone());
        return resp;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match('/index.html')) || (await cache.match('/')) || new Response('Sin conexión y sin una copia guardada todavía.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // archivos de la aplicación (JS, CSS, íconos, fuentes): ya vistos una vez, se sirven de la copia guardada
  if (esEstatico(request, url)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(request);
      if (guardado) return guardado;
      const resp = await fetch(request);
      if (resp.ok) cache.put(request, resp.clone());
      return resp;
    })());
    return;
  }

  // datos de Supabase (lecturas): red primero (para tener lo último), y si falla, lo último que se guardó
  if (esSupabaseGet(request, url)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const resp = await fetch(request);
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      } catch {
        const guardado = await cache.match(request);
        if (guardado) return guardado;
        throw new Error('sin-conexion-y-sin-copia');
      }
    })());
  }
  // todo lo demás (escrituras, otras peticiones): pasa de largo, tal cual, sin que el service worker se meta
});
