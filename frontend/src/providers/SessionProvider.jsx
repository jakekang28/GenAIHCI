import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSocketCtx } from './SocketProvider';

const SessionCtx = createContext(null);

export function SessionProvider({ children }) {
  const { socket, connected, mySocketId } = useSocketCtx();

  // 전역 세션 상태
  const [sessionId, setSessionId] = useState(null);
  const [me, setMe] = useState({ userId: '', userName: '', role: 'member' });

  const [members, setMembers] = useState([]);     // [{socketId,userId,userName}]
  const [stage, setStage] = useState('solo');     // 'solo' | 'peer'
  const [questions, setQuestions] = useState([]); // [{socketId,userId,userName,text}]

  // 최신 값 참조를 위한 ref (재연결 시 사용)
  const sessionIdRef = useRef(sessionId);
  const meRef        = useRef(me);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { meRef.current        = me;        }, [me]);

  // ✅ 액션을 useCallback으로 고정
  const joinSession = useCallback((sid, user) => {
    setSessionId(sid);
    setMe(user);
    if (socket.connected) {
      socket.emit('session:join', { sessionId: sid, userId: user.userId, userName: user.userName });
    }
  }, [socket]);

  const ensureJoined = useCallback((sid, user) => {
    // 이미 같은 세션이면 아무 것도 안 함
    if (sessionIdRef.current === sid) return;
    joinSession(sid, user);
  }, [joinSession]);

  const leaveSession = useCallback(() => {
    if (sessionIdRef.current && socket.connected) {
      socket.emit('session:leave', { sessionId: sessionIdRef.current });
    }
    setSessionId(null);
    setMembers([]);
    setQuestions([]);
    setStage('solo');
  }, [socket]);

  const updateQuestion = useCallback((text) => {
    if (!sessionIdRef.current || !socket.connected) return;
    socket.emit('interview:question:update', { sessionId: sessionIdRef.current, text });
  }, [socket]);

  const publishForPeers = useCallback(() => {
    if (!sessionIdRef.current || !socket.connected) return;
    socket.emit('interview:publish', { sessionId: sessionIdRef.current });
  }, [socket]);

  const resetToSolo = useCallback((clearQuestions = false) => {
    if (!sessionIdRef.current || !socket.connected) return;
    socket.emit('interview:reset', { sessionId: sessionIdRef.current, clearQuestions });
  }, [socket]);

  // 🔒 소켓 리스너는 앱 생애주기에서 "한 번만" 등록
  useEffect(() => {
    const onMembers = (payload) => {
      const list = Array.isArray(payload) ? payload : payload?.members;
      setMembers(Array.isArray(list) ? list : []);
    };
    const onStage = (payload) => {
      setStage(payload?.stage || 'solo');
    };
    const onQuestions = (payload) => {
      const list = Array.isArray(payload) ? payload : payload?.questions;
      setQuestions(Array.isArray(list) ? list : []);
    };

    const onConnect = () => {
      // 재연결 시 자동 재참가
      const sid  = sessionIdRef.current;
      const user = meRef.current;
      if (sid && user?.userId) {
        socket.emit('session:join', { sessionId: sid, userId: user.userId, userName: user.userName });
      }
    };

    socket.on('session:members', onMembers);
    socket.on('session:stage', onStage);
    socket.on('interview:questions', onQuestions);
    socket.on('connect', onConnect);

    return () => {
      socket.off('session:members', onMembers);
      socket.off('session:stage', onStage);
      socket.off('interview:questions', onQuestions);
      socket.off('connect', onConnect);
    };
    // ⛔ 의존성 없음: 리스너를 여러 번 달지 않기 위함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // value는 메서드/상태 바뀔 때만 갱신
  const value = useMemo(() => ({
    // connection
    connected, mySocketId, socket,

    // session state
    sessionId, me, members, stage, questions,

    // actions (useCallback으로 고정됨)
    joinSession, ensureJoined, leaveSession,
    updateQuestion, publishForPeers, resetToSolo,
  }), [
    connected, mySocketId, socket,
    sessionId, me, members, stage, questions,
    joinSession, ensureJoined, leaveSession, updateQuestion, publishForPeers, resetToSolo,
  ]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);