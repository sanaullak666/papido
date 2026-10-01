import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = getSocketUrl();
    if (!socketUrl) {
      console.log('[Socket] Serverless deployment detected without external WebSocket URL. Operating via fast HTTP polling.');
      return;
    }

    const token = localStorage.getItem('papido_admin_token') || localStorage.getItem('papido_user_token');
    console.log('[Socket] Connecting to backend server:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to Papido backend with ID:', newSocket.id);
      setIsConnected(true);
      // Join room with verified identity
      const adminToken = localStorage.getItem('papido_admin_token');
      const savedUser = localStorage.getItem('papido_user');
      let userData = null;
      try {
        userData = savedUser ? JSON.parse(savedUser) : null;
      } catch (_) {}

      if (adminToken) {
        newSocket.emit('identify', { id: 1, role: 'ADMIN', name: 'Admin Dashboard', token: adminToken });
      } else if (userData && token) {
        newSocket.emit('identify', { id: userData.id, role: userData.role, name: userData.name, token });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected from Papido backend');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection notice:', err.message);
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
