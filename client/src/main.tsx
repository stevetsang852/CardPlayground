import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './atelier.css';
import './seal.css';
import './card-effects.css';
import './foil-grades.css';
import './ptcg-card.css';
import './card-tilt';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
