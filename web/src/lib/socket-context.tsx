'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: { name: string; data: any; timestamp: number } | null;
  subscribeToOperations: () => void;
  subscribeToOrder: (orderId: string) => void;
  subscribeToUser: (userId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  lastEvent: null,
  subscribeToOperations: () => {},
  subscribeToOrder: () => {},
  subscribeToUser: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ name: string; data: any; timestamp: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const apiHost = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(
      /\/api\/v1\/?$/,
      '',
    );

    const socket = io(apiHost, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 [WebSocket] Connected to Print Bazzar Live Real-Time Gateway:', socket.id);
      setIsConnected(true);
      socket.emit('join:operations');
      socket.emit('join:orders');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 [WebSocket] Disconnected from Gateway:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [WebSocket] Connection warning:', error.message);
      setIsConnected(false);
    });

    // Global operational listeners
    const handleEvent = (name: string) => (data: any) => {
      console.log(`⚡ [WebSocket] Event Received: ${name}`, data);
      setLastEvent({ name, data, timestamp: Date.now() });
    };

    socket.on('order:created', handleEvent('order:created'));
    socket.on('order:updated', handleEvent('order:updated'));
    socket.on('order:assigned', handleEvent('order:assigned'));
    socket.on('operations:refresh', handleEvent('operations:refresh'));
    socket.on('qc:updated', handleEvent('qc:updated'));
    socket.on('assignment:received', handleEvent('assignment:received'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribeToOperations = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:operations');
    }
  }, []);

  const subscribeToOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected && orderId) {
      socketRef.current.emit('join:order', { orderId });
    }
  }, []);

  const subscribeToUser = useCallback((userId: string) => {
    if (socketRef.current?.connected && userId) {
      socketRef.current.emit('join:user', { userId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        lastEvent,
        subscribeToOperations,
        subscribeToOrder,
        subscribeToUser,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
