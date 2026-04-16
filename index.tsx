import { Buffer } from 'buffer';
window.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const log = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

log('Mounting HashNHedge App...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Could not find root element to mount to!');
  throw new Error('Could not find root element to mount to');
}

log('Root element found, creating React root...');
const root = ReactDOM.createRoot(rootElement);
log('Rendering App...');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
log('Render call completed.');