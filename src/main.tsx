import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import galmuri from 'galmuri/dist/Galmuri11-Bold.woff2?url';
import App from './App';

// Pixel font for HUD numbers and damage text (SIL OFL 1.1).
try {
  const face = new FontFace('Galmuri11', `url(${galmuri})`, { weight: '400 700', display: 'swap' });
  void face.load().then((f) => document.fonts.add(f));
} catch {
  /* FontFace unsupported – fall back to system fonts */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
