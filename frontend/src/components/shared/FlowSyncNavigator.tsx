import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../providers/SessionProvider';

export default function FlowSyncNavigator() {
  const { sessionId } = useParams();
  const { socket } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lastStepRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleFlow = (flow: any) => {
      const step = flow?.step;
      if (!step) return;

      // 동일 step 반복 네비 방지
      if (lastStepRef.current === step) return;
      lastStepRef.current = step;

      // 쿼리 파라미터만 바꿔서 라우트 동기화 (분기 테이블 필요 없음)
      // 예: /app/abcd?step=pov_setup
      navigate(`/app/${sessionId}?step=${encodeURIComponent(step)}`, { replace: true });
      // console.log('[FlowSyncNavigator] step ->', step);
    };

    socket.on('room:flow', handleFlow);
    socket.emit('room:flow:sync', { roomId: sessionId }); // 재접속 즉시 동기화

    return () => {
      socket.off('room:flow', handleFlow);
    };
  }, [socket, sessionId, navigate]);

  return null;
}
