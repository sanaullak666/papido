import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('papido_admin_token') || localStorage.getItem('papido_user_token');
    const getSocketUrl = () => {
      if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
      }
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
      }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname)) {
        return `http://${window.location.hostname}:5000`;
      }
      return window.location.origin;
    };

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to Papido backend with ID:', newSocket.id);
      setIsConnected(true);
      // Join admin room
      newSocket.emit('identify', { id: 1, role: 'ADMIN', name: 'Admin Dashboard' });
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected from Papido backend');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
