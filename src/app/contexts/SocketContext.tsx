"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      
      const newSocket = io(SOCKET_URL, { 
        transports: ['websocket', 'polling'], 
      });

      newSocket.on('connect', () => {
        console.log('🚀 FRONTEND SOCKET CONNECTED SUCCESSFULLY:', newSocket.id);
        setSocket(newSocket);
      });

      newSocket.on('connect_error', (err) => {
        console.error('⚠️ SOCKET CONNECTION ERROR:', err.message);
      });

      newSocket.on('disconnect', () => {
        console.log('🔴 Socket disconnected');
        setSocket(null);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};