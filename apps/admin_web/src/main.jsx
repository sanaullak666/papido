import React from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Ensure global Leaflet instance is available everywhere
if (typeof window !== 'undefined') {
  window.L = L;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
