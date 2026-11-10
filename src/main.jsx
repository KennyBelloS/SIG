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

iniciarPreferencias();
inicializarTema();
iniciarVida();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
