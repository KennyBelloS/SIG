import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Identificador de ESTA compilación. En Cloudflare Pages sale del commit; en otro lado, de la hora. Se calcula una vez por compilación.
const ID_VERSION = (process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 10) || Date.now().toString(36);

// Escribe dist/version.json con el mismo identificador: la aplicación abierta lo consulta para saber si hay una versión más nueva.
const versionJson = {
  name: 'version-json',
  apply: 'build',
  closeBundle() {
    fs.writeFileSync(path.resolve('dist', 'version.json'), JSON.stringify({ id: ID_VERSION, fecha: new Date().toISOString() }));
  },
};

// Dirección pública de la aplicación, para las etiquetas que deciden cómo se ve el enlace al
// compartirlo (Open Graph). Tienen que ser direcciones completas, no relativas.
// En Cloudflare Pages sale sola de CF_PAGES_URL; si no, se puede fijar con URL_PUBLICA.
// Sin ninguna de las dos, se usa el dominio conocido para que la vista previa nunca quede rota.
const URL_PUBLICA = (process.env.URL_PUBLICA || process.env.CF_PAGES_URL || 'https://tm-indicadores.pages.dev').replace(/\/+$/, '');

// Reemplaza %URL_PUBLICA% dentro de index.html al compilar.
const urlEnHtml = {
  name: 'url-publica-en-html',
  transformIndexHtml: html => html.replaceAll('%URL_PUBLICA%', URL_PUBLICA),
};

export default defineConfig(({ command }) => ({
  plugins: [react(), versionJson, urlEnHtml],
  define: { __BUILD_ID__: JSON.stringify(command === 'build' ? ID_VERSION : 'dev') },
  build: { outDir: 'dist' },
}));
