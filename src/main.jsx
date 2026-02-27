import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

console.log('=== main.jsx loaded ===');
console.log('Environment:', import.meta.env.MODE);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

if (!rootElement) {
  console.error('FATAL: Root element not found!');
  document.body.innerHTML = '<div style="padding:40px;background:#fee;color:#c00;"><h1>Root element not found</h1></div>';
} else {
  console.log('Attempting to import App...');

  import('./App').then(({ default: App }) => {
    console.log('App imported successfully, mounting...');
    try {
      createRoot(rootElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('✓ React app mounted successfully');
    } catch (error) {
      console.error('✗ Failed to mount React app:', error);
      rootElement.innerHTML = '<div style="padding:40px;background:#fee;color:#c00;font-family:monospace;"><h1>Failed to Mount App</h1><pre>' + error.stack + '</pre></div>';
    }
  }).catch(error => {
    console.error('✗ Failed to import App:', error);
    rootElement.innerHTML = '<div style="padding:40px;background:#fee;color:#c00;font-family:monospace;"><h1>Failed to Import App</h1><pre>' + error.stack + '</pre></div>';
  });
}
