import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App';
import './index.css';
import './plano.css';
import './movil.css';
import './tipografia.css';
import './vida.css';
import { inicializarTema } from './lib/tema';
import { iniciarVida } from './lib/vida';
import { iniciarPreferencias } from './lib/preferencias';
import { iniciarIdioma } from './lib/idioma';

iniciarPreferencias();
iniciarIdioma();
inicializarTema();
iniciarVida();

// deja que la aplicación abra y muestre lo último visto sin internet. Solo en producción (compilada):
// en «npm run dev» no se registra, para no complicar el desarrollo con una caché de por medio.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* si falla, la app sigue funcionando normal, solo sin esta mejora */ }); });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
