import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import InterviewHMW from './InterviewHMW'
import RoomEntry from './RoomEntry';
import Room from './Room'
import {SessionProvider} from '../providers/SessionProvider'
import { SocketProvider } from '../providers/SocketProvider';
export default function App() {
  return (
    <SocketProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoomEntry />} />
            <Route path="/room/:sessionId" element={<Room />} />
            <Route path="/app/:sessionId" element={<InterviewHMW/>} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </SocketProvider>
    
  );
}