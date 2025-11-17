"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { isAuthenticated } = useAuth(); // Get auth state

  useEffect(() => {
    if (isAuthenticated) {
      const newSocket = io('http://localhost:3001');

      // FIX: Only set the socket in state AFTER it connects
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setSocket(newSocket);
      });

      // Also set state to null if it disconnects
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setSocket(null);
      });

      // Disconnect on logout or component unmount
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