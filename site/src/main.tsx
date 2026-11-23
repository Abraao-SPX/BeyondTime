import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './landing.css';
import './wave2.css';

const rootElement = document.getElementById('root');

if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
