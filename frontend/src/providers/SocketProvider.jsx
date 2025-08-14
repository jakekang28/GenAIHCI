import { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../lib/socket';

const SocketCtx = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(socket.connected);
  const [mySocketId, setMySocketId] = useState(socket.id || null);

  useEffect(() => {
    if (!socket.connected) socket.connect(); // 최초 1회 연결

    const onConnect = () => {
      setConnected(true);
      setMySocketId(socket.id);
    };
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      // 원하면 앱 종료 시에만 socket.disconnect() 호출
      // socket.disconnect();
    };
  }, []);

  return (
    <SocketCtx.Provider value={{ socket, connected, mySocketId }}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocketCtx = () => useContext(SocketCtx);