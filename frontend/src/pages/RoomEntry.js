import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const API_BASE = 'http://localhost:3000';

export default function RoomEntry() {
  const navigate = useNavigate();

  // NEW: 게스트 정보 (localStorage 재사용)
  const [guestName, setGuestName] = useState(localStorage.getItem('guestName') || '');
  const [guestUserId, setGuestUserId] = useState(localStorage.getItem('guestUserId') || '');

  // Add this useEffect to monitor changes
  useEffect(() => {
    console.log('guestUserId state changed to:', guestUserId);
  }, [guestUserId]);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sessionKey, setSessionKey] = useState('');
  const [error, setError] = useState(null);


  const persistGuest = (id, name) => {
    localStorage.setItem('guestUserId', id);
    localStorage.setItem('guestName', name);
  };

  const goToRoom = (id) => {
    localStorage.setItem('sessionId', id);
    navigate(`/room/${id}`);
  };

  const createRoom = async () => {
    try {
      setError(null);
      setCreating(true);

      // Check if name is provided
      const name = guestName.trim();
      if (!name) throw new Error('Please enter your name.');
      
      console.log('Before API call - guestUserId:', guestUserId); // Debug log
      
      // Create guest user in database first
      const guestUser = await apiService.createGuestUser(name);
      
      console.log('API response - guestUser:', guestUser); // Debug log
      
      // Update the guestUserId with the one from database
      setGuestUserId(guestUser.guestUserId);
      persistGuest(guestUser.guestUserId, guestUser.guestName);
      
      console.log('After setState - new guestUserId:', guestUser.guestUserId); // Debug log

      // Use new room creation endpoint
      const res = await fetch(`${API_BASE}/sessions/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId: guestUser.guestUserId,
          roomName: `${guestUser.guestName}'s Room`
        }),
      });

      if (!res.ok) throw new Error('Room creation failed');
      const data = await res.json();
      if (!data?.sessionId || !data?.roomCode) throw new Error('No session ID or room code');

      // Store room code for sharing
      localStorage.setItem('roomCode', data.roomCode);
      console.log('Room created with code:', data.roomCode);

      goToRoom(data.sessionId);
    } catch (e) {
      setError(e.message || 'Error.');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    try {
      setError(null);
      setJoining(true);

      const roomCode = sessionKey.trim();
      if (!roomCode) throw new Error('Please enter the valid room code.');

      // Check if name is provided
      const name = guestName.trim();
      if (!name) throw new Error('Please enter your name.');
      
      // Create guest user in database first
      const guestUser = await apiService.createGuestUser(name);
      
      // Update the guestUserId with the one from database
      setGuestUserId(guestUser.guestUserId);
      persistGuest(guestUser.guestUserId, guestUser.guestName);

      // Use new room joining endpoint
      const res = await fetch(`${API_BASE}/sessions/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: roomCode, 
          userId: guestUser.guestUserId,
          displayName: guestUser.guestName
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to join room. Please check the room code.');
      }

      const roomData = await res.json();
      if (!roomData?.id) {
        throw new Error('Invalid room data received.');
      }

      console.log('Successfully joined room:', roomData.code);
      goToRoom(roomData.id);
    } catch (e) {
      setError(e.message || 'Error.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(135deg,#f0fdfa,#d1fae5)' }}>
      <div style={{ width: '100%', maxWidth: 840 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1f2937', marginBottom: 8 }}>Select Room</h1>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>Create a new room or enter existing room by using the shared room code</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* NEW: 공통 게스트 정보 입력 섹션 */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>Your Info</h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr auto' }}>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', outline: 'none' }}
            />
            <div style={{ 
              padding: '10px 12px', 
              borderRadius: 10, 
              background: '#f3f4f6', 
              border: '1px solid #e5e7eb',
              color: '#6b7280',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {guestUserId ? `ID: ${guestUserId.slice(0, 8)}...` : 'ID will be generated'}
            </div>
          </div>
          <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
            * 이름을 입력하고 방을 만들거나 입장하면 자동으로 ID가 생성됩니다.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {/* 방 만들기 */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Create Room</h2>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Receive the provided room code and share the room code with your group members.</p>
            <button
              onClick={createRoom}
              disabled={creating}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, fontWeight: 700,
                color: '#fff', background: creating ? '#86efac' : '#059669',
                cursor: creating ? 'not-allowed' : 'pointer', border: 'none'
              }}
            >
              {creating ? 'Creating…' : 'Create New Room'}
            </button>
          </div>

          {/* 방 입장 */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Enter Room</h2>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Enter the room code shared by the host.</p>
            <input
              type="text"
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              placeholder="예: ABC123"
              style={{
                width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
                padding: '10px 12px', marginBottom: 12, outline: 'none'
              }}
            />
            <button
              onClick={joinRoom}
              disabled={joining}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, fontWeight: 700,
                color: '#fff', background: joining ? '#9ca3af' : '#111827',
                cursor: joining ? 'not-allowed' : 'pointer', border: 'none'
              }}
            >
              {joining ? 'Entering…' : 'Enter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}