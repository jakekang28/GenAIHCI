import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../providers/SessionProvider';

export default function Room() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Get the room code for display (short code for sharing)
  const roomCode = localStorage.getItem('roomCode') || sessionId;

  const {
    connected, mySocketId,
    members,
    ensureJoined, 
  } = useSession();

  useEffect(() => {
    if (!sessionId) return;
    
    // Fix: Use localStorage instead of sessionStorage, and don't generate new IDs
    const guestUserId = localStorage.getItem('guestUserId');
    const guestName = localStorage.getItem('guestName') || 'Guest';
    
    if (!guestUserId) {
      console.error('No guestUserId found in localStorage');
      return;
    }

    // ✅ 이미 같은 세션이면 아무 것도 안 하도록 보장
    ensureJoined(sessionId, { userId: guestUserId, userName: guestName, role: 'member' });
  }, [sessionId, ensureJoined]);

  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Room Code: {roomCode}</h1>
      <p style={{ color: '#6b7280', marginBottom: 4 }}>
        Socket {connected ? 'Connected ✅' : 'Disconnected ❌'}
      </p>
      <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        💡 Share this room code with others to let them join: <span style={{ background: '#f0f9ff', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>{roomCode}</span>
      </p>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>현재 멤버</h2>
        {members.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No members entered yet.</p>
        ) : (
          <ul>
            {members.map((m) => (
              <li key={m.socketId}>
                {m.userName} <span style={{ color: '#9ca3af' }}>({m.userId})</span>
                {/* ✅ 내 소켓과 일치하면 Me 표시 */}
                {m.socketId === mySocketId && <strong> ← Me</strong>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() =>navigate(`/app/${sessionId}`)}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
        >
          Start Learning
        </button>
      </div>
    </div>
  );
}