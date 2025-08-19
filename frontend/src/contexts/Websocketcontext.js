//WEBSOCKET CONTEXT

import {createContext} from 'react';
import {io, Socket} from 'socket.io-client';
import config from '../config/config.js';

export const socket = io(config.WEBSOCKET_URL);

export const WebsocketContext = createContext();