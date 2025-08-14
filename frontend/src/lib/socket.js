import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3000';

export const socket = io(API_BASE, {
  transports: ['websocket'],
  withCredentials: true,
  autoConnect: false, // ✅ Provider에서 명시적으로 connect 제어
});