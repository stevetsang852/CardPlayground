import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './card-effects.css';
// Side-effect: attaches tilt + holo spring loop to all card elements via MutationObserver
import './card-tilt';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
