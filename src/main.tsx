import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Silence benign Vite HMR websocket connection errors and unhandled rejections inside sandboxed previews
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason || '');
    if (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('websocket') ||
      errorMsg.includes('WebSocket closed') ||
      errorMsg.includes('failed to connect') ||
      errorMsg.includes('ws://') ||
      errorMsg.includes('wss://')
    ) {
      event.preventDefault();
      console.debug('ℹ️ [Vite Custom Handler] Prevented benign WebSocket HMR unhandled rejection:', errorMsg);
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    if (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('websocket') ||
      errorMsg.includes('WebSocket closed') ||
      errorMsg.includes('failed to connect') ||
      errorMsg.includes('ws://') ||
      errorMsg.includes('wss://')
    ) {
      event.preventDefault();
      console.debug('ℹ️ [Vite Custom Handler] Prevented benign WebSocket HMR error event:', errorMsg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

