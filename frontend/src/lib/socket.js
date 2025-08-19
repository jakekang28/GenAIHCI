import { io } from 'socket.io-client';
import config from '../config/config.js';

const API_BASE = config.WEBSOCKET_URL;

export const socket = io(API_BASE, {
  transports: ['websocket'],
  withCredentials: true,
  autoConnect: false, // ✅ Provider에서 명시적으로 connect 제어
});