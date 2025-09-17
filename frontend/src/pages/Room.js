import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../providers/SessionProvider';
import { Users, Share2, Play, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import ConfirmButton from '../components/shared/ConfirmButton';
import HelpButton from '../components/shared/HelpButton';

export default function Room() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Get the room code for display (short code for sharing)
  const roomCode = localStorage.getItem('roomCode') || sessionId;

  const {
    connected, mySocketId,
    members,
    ensureJoined,
    socket
  } = useSession();

  // 🔹 현재 flow 단계 로컬 보관해서 Confirm 버튼 노출 제어
  const [flowStep, setFlowStep] = useState('home');

  // ✅ 1) 방 조인
  useEffect(() => {
    if (!sessionId) return;

    // Use sessionStorage-first approach (consistent with useLocalGuest)
    let guestData = null;

    const sessionData = sessionStorage.getItem('guestUser');
    const localData = localStorage.getItem('guestUser');

    if (sessionData) {
      try {
        guestData = JSON.parse(sessionData);
      } catch (e) {
        console.warn('Failed to parse sessionStorage guest data');
      }
    } else if (localData) {
      try {
        guestData = JSON.parse(localData);
      } catch (e) {
        console.warn('Failed to parse localStorage JSON guest data');
      }
    }

    if (!guestData) {
      const guestUserId = localStorage.getItem('guestUserId');
      const guestName = localStorage.getItem('guestName');
      if (guestUserId && guestName) {
        guestData = { guestUserId, guestName };
      }
    }

    if (!guestData || !guestData.guestUserId) {
      console.error('No guestUserId found in storage');
      return;
    }

    ensureJoined(sessionId, {
      userId: guestData.guestUserId,
      userName: guestData.guestName || 'Guest',
      role: 'member'
    });
  }, [sessionId, ensureJoined]);

  // ✅ 2) (기존) 세션 시작 이벤트 수신 → /app으로 이동
  useEffect(() => {
    if (!socket) return;
    const handleStarted = (data) => {
      if (!data || data.roomId !== sessionId) return;
      const to = data.path || `/app/${sessionId}`;
      navigate(to, { replace: true });
    };
    socket.on('room:session_started', handleStarted);
    return () => socket.off('room:session_started', handleStarted);
  }, [socket, sessionId, navigate]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    const handleFlow = (flow) => {
      // flow: { step, payload, updatedAt, updatedBy }
      if (!flow || !flow.step) return;
      setFlowStep(flow.step);
      const isWaiting =
        flow.step === 'home' ||
        flow.step === 'room_wait' ||
        flow.step === 'lobby';


      if (!isWaiting) {
        navigate(`/app/${sessionId}`, { replace: true, state: { from: 'room' } });
      }
    };

    socket.on('room:flow', handleFlow);

    socket.emit('room:flow:sync', { roomId: sessionId });

    return () => {
      socket.off('room:flow', handleFlow);
    };
  }, [socket, sessionId, navigate]);
  useEffect(() => {
  if (!socket || !sessionId) return;

  const onJoined = (data) => {
    console.log('[ROOM] room:joined', data);
  };
  const onStage = (data) => {
    console.log('[ROOM] room:stage', data);
  };
  const onFlow = (flow) => {
    console.log('[ROOM] room:flow RECEIVED =>', flow);
    if (!flow || !flow.step) return;
    const step = flow.step;
    const isWaiting =
      step === 'home' || step === 'room_wait' || step === 'lobby';
    console.log('[ROOM] decide navigation -> step:', step, 'isWaiting:', isWaiting);
  };

  socket.on('room:joined', onJoined);
  socket.on('room:stage', onStage);
  socket.on('room:flow', onFlow);

  console.log('[ROOM] emitting room:flow:sync', { roomId: sessionId });
  socket.emit('room:flow:sync', { roomId: sessionId });

  return () => {
    socket.off('room:joined', onJoined);
    socket.off('room:stage', onStage);
    socket.off('room:flow', onFlow);
  };
}, [socket, sessionId]);
  const helpContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">Room Session Help</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-2">What you can see here:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li><strong>Room Code:</strong> Share this code with team members who haven't joined yet</li>
            <li><strong>Current Members:</strong> See who has joined your session</li>
            <li><strong>Connection Status:</strong> Green means connected, red means disconnected</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Next Steps:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Wait for all team members to join (3-4 students recommended)</li>
            <li>Once ready, particpants should click "Confirm"</li>
            <li>After all participants press "Confirm", the group leader can begin the session</li>
          </ol>
        </div>
      </div>
    </div>
  );

  // “대기 단계”에서만 Confirm 버튼을 노출
  const showConfirm =
    flowStep === 'home' ||
    flowStep === 'room_wait' ||
    flowStep === 'lobby' ||
    !flowStep;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <HelpButton content={helpContent} title="Room Session Help" />
      <div className="max-w-4xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Room Entry
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Room Session</h1>
            <p className="text-lg text-gray-600">
              Welcome to your collaborative learning session
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Room Code Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Share2 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Room Code</h2>
              </div>
              <div className="flex items-center space-x-2">
                {connected ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Disconnected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center flex-grow flex flex-col justify-center">
              <p className="text-gray-700 mb-3 text-sm">
                💡 Share this room code with others to let them join:
              </p>
              <div className="bg-white border border-blue-300 rounded-lg px-4 py-3 inline-block">
                <code className="text-xl font-mono font-bold text-blue-600 tracking-wider">
                  {roomCode}
                </code>
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Current Members</h2>
              </div>
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>

            <div className="flex-grow">
              {members.length === 0 ? (
                <div className="text-center py-6 flex flex-col justify-center h-full">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No members have joined yet</p>
                  <p className="text-gray-400 text-xs">Share the room code to invite others</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {members.map((m) => (
                    <div
                      key={m.socketId}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                        m.socketId === mySocketId
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center mr-2 ${
                            m.socketId === mySocketId ? 'bg-blue-100' : 'bg-gray-100'
                          }`}
                        >
                          <span
                            className={`text-xs font-medium ${
                              m.socketId === mySocketId ? 'text-blue-600' : 'text-gray-600'
                            }`}
                          >
                            {m.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              m.socketId === mySocketId ? 'text-blue-800' : 'text-gray-800'
                            }`}
                          >
                            {m.userName}
                          </span>
                          {m.socketId === mySocketId && (
                            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {m.userId.slice(0, 8)}...
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Ready to Start?</h2>
            <p className="text-gray-600 mb-6">
              Begin your collaborative learning session with your team members
            </p>
            {showConfirm && (
              <ConfirmButton
                roomId={sessionId}
                checkpointKey="room:start"
                onHostContinue={() =>
                  navigate(`/app/${sessionId}`, { replace: true, state: { from: 'room' } })
                }
                className="flex justify-center"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
