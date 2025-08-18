import React, { useEffect, useMemo, useState } from 'react';
import { Play, Check } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';

/**
 * Props:
 * - roomId: string
 * - checkpointKey: string (예: "room:start")
 * - onHostContinue: () => void  (호스트가 Start 클릭 시 호출)
 * - className?: string          (optional wrapper class)
 */
export default function ConfirmButton({
  roomId,
  checkpointKey = 'room:start',
  onHostContinue,
  className = '',
}) {
  const { socket, mySocketId, members } = useSession();

  const me = useMemo(
    () => members.find((m) => m.socketId === mySocketId),
    [members, mySocketId]
  );
  const isHost = !!me?.isHost;

  
  const [readyUserIds, setReadyUserIds] = useState([]);


  const nonHostMembers = useMemo(
    () => members.filter((m) => !m.isHost),
    [members]
  );

  const requiredCount = nonHostMembers.length;
  const readyCount = readyUserIds.filter((uid) =>
    nonHostMembers.some((m) => m.userId === uid)
  ).length;

  const allNonHostsReady = requiredCount > 0 && readyCount >= requiredCount;
  const myConfirmed = !!(me && readyUserIds.includes(me.userId));

  
  useEffect(() => {
    if (!socket || !roomId || !checkpointKey) return;

    const onProgress = (data) => {
      
      if (data?.roomId !== roomId) return;
      if (data?.checkpoint !== checkpointKey) return;
      if (Array.isArray(data?.readyUserIds)) {
        setReadyUserIds(data.readyUserIds);
      }
    };

    socket.on('room:ready_progress', onProgress);

    
    socket.emit('room:ready:sync', { roomId, checkpoint: checkpointKey });

    return () => {
      socket.off('room:ready_progress', onProgress);
    };
  }, [socket, roomId, checkpointKey]);

  
  const confirm = () => {
    if (!socket || !me?.userId) return;
    socket.emit('room:ready:confirm', {
      roomId,
      checkpoint: checkpointKey,
      userId: me.userId,
    });
  };

  const revoke = () => {
    if (!socket || !me?.userId) return;
    socket.emit('room:ready:revoke', {
      roomId,
      checkpoint: checkpointKey,
      userId: me.userId,
    });
  };

  
  const handleStart = () => {
  if (!allNonHostsReady) return;
  if (socket && roomId) {
    socket.emit('room:start_session', {
      roomId,
      checkpoint: checkpointKey,
      path: `/app/${roomId}`,   
    });
  } else {
    onHostContinue?.();
  }
};
  
  return (
    <div className={className}>
      {!isHost ? (
        !myConfirmed ? (
          <button
            onClick={confirm}
            className="bg-teal-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-200 flex items-center justify-center mx-auto hover:transform hover:scale-105"
            title="Confirm you’re ready"
          >
            <Check className="w-5 h-5 mr-2" />
            Confirm
          </button>
        ) : (
          <button
            onClick={revoke}
            className="bg-gray-200 text-gray-700 py-3 px-8 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200 flex items-center justify-center mx-auto"
            title="Cancel your confirmation"
          >
            Cancel Confirm
          </button>
        )
      ) : (
        
        <button
          onClick={handleStart}
          disabled={!allNonHostsReady}
          className={`py-3 px-8 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center mx-auto hover:transform hover:scale-105 ${
            allNonHostsReady
              ? 'bg-teal-600 text-white hover:bg-teal-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          
          title={allNonHostsReady ? 'Start Learning Session' : 'Waiting for confirmations'}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Learning Session
        </button>
      )}
    </div>
  );
}