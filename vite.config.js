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

export default defineConfig(({ command }) => ({
  plugins: [react(), versionJson],
  define: { __BUILD_ID__: JSON.stringify(command === 'build' ? ID_VERSION : 'dev') },
  build: { outDir: 'dist' },
}));
