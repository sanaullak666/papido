import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('papido_admin_token') || localStorage.getItem('papido_user_token');
    const socketUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
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
