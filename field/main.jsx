import React from 'react';
import ReactDOM from 'react-dom/client';
import FieldApp from '@/field/FieldApp';
import { setImageResolver } from '@/lib/resolveImage';
import { resolvePhoto } from '@/field/spAdapter';
import '@/index.css';

setImageResolver(resolvePhoto);

// Keeps the app itself on the phone so it opens with no signal.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<FieldApp />);
