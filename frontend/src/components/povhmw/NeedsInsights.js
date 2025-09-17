import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider'; // [ADD]

const NeedsInsights = ({ onBack, onContinue }) => {
  const [needs, setNeeds] = useState(Array(3).fill(''));
  const [insights, setInsights] = useState(Array(3).fill(''));

  const { sessionId, socket, mySocketId, members } = useSession(); // [ADD]
  const me = members?.find(m => m.socketId === mySocketId);
  const isHost = !!me?.isHost;

  const completedNeeds = needs.filter(need => need.trim()).length;
  const completedInsights = insights.filter(insight => insight.trim()).length;
  const totalCompleted = completedNeeds + completedInsights;
  const isComplete = completedNeeds >= 3 && completedInsights >= 3;

  // ─────────────────────────────────────────────────────────────
  // 1) 마운트 시: flow를 'pov_setup'으로 올리고, 서버의 현재 flow를 sync 요청
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !sessionId) {
      console.warn('[NeedsInsights] mount: socket or sessionId is missing', { hasSocket: !!socket, sessionId });
      return;
    }

    console.groupCollapsed('%c[NeedsInsights] MOUNT & INITIAL SYNC', 'color:#0ea5e9');
    console.log('sessionId:', sessionId);
    console.log('me:', me);
    console.log('isHost:', isHost);
    console.log('initial needs:', needs);
    console.log('initial insights:', insights);

    // 현재 화면 진입 시, 서버 flow를 pov_setup으로 고정(복원용 payload 싱크 목적)
    console.log('➡️ emit room:flow:update → step = pov_setup (mount time)');
    socket.emit('room:flow:update', {
      roomId: sessionId,
      step: 'pov_setup',
      payload: { needs, insights },
    });

    // 서버에 현재 flow 요청 (재접속/새 탭 진입 시 복원)
    console.log('➡️ emit room:flow:sync');
    socket.emit('room:flow:sync', { roomId: sessionId });

    // room:flow 수신 핸들러
    const onFlow = (flow) => {
      console.groupCollapsed('%c[NeedsInsights] room:flow RECEIVED', 'color:#22c55e');
      console.log('flow:', flow);
      if (!flow) {
        console.log('⚠️ flow is empty');
        console.groupEnd();
        return;
      }

      // 이 화면 단계인지 확인
      if (flow.step === 'pov_setup') {
        console.log('✅ flow.step === pov_setup');
        if (flow.payload) {
          const { needs: n, insights: i } = flow.payload || {};
          console.log('payload.needs:', n);
          console.log('payload.insights:', i);

          // 로컬 상태가 다르면 갱신
          if (Array.isArray(n) && n.length && needs.join('|') !== n.join('|')) {
            console.log('↩︎ update local needs from flow payload');
            setNeeds(n);
          }
          if (Array.isArray(i) && i.length && insights.join('|') !== i.join('|')) {
            console.log('↩︎ update local insights from flow payload');
            setInsights(i);
          }
        } else {
          console.log('ℹ️ flow.payload is empty on pov_setup');
        }
      } else {
        console.log('ℹ️ flow.step is not pov_setup (ignore here):', flow.step);
      }
      console.groupEnd();
    };

    socket.on('room:flow', onFlow);
    console.groupEnd();

    return () => {
      socket.off('room:flow', onFlow);
      console.log('[NeedsInsights] cleanup: remove room:flow listener');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, sessionId]); // needs/insights는 아래 디바운스 훅에서 처리

  // ─────────────────────────────────────────────────────────────
  // 2) 입력 변경 시: 디바운스로 flow payload 업데이트
  // ─────────────────────────────────────────────────────────────
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!socket || !sessionId) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      console.groupCollapsed('%c[NeedsInsights] DEBOUNCED flow:update', 'color:#a855f7');
      console.log('step:', 'pov_setup');
      console.log('payload.needs:', needs);
      console.log('payload.insights:', insights);
      console.log('➡️ emit room:flow:update (debounced)');
      socket.emit('room:flow:update', {
        roomId: sessionId,
        step: 'pov_setup',
        payload: { needs, insights },
      });
      console.groupEnd();
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [needs, insights, socket, sessionId]);

  // ─────────────────────────────────────────────────────────────
  // 3) Continue: 완료 시 다음 단계로 전환 (pov_create) + (호스트) canonical 저장
  // ─────────────────────────────────────────────────────────────
  const handleContinue = () => {
    console.groupCollapsed('%c[NeedsInsights] CONTINUE CLICK', 'color:#ef4444');
    console.log('isComplete:', isComplete);
    if (!isComplete) {
      console.log('⛔ Not complete. Abort.');
      console.groupEnd();
      return;
    }

    if (!socket || !sessionId) {
      console.log('⛔ Missing socket/sessionId. Abort.');
      console.groupEnd();
      onContinue?.({ needs, insights }); // 그래도 기존 화면 전환 유지
      return;
    }

    // 3-1) 다음 단계로 진행: 서버 flow에 'pov_create'로 저장
    console.log('➡️ emit room:flow:update → step = pov_create');
    socket.emit('room:flow:update', {
      roomId: sessionId,
      step: 'pov_create',
      payload: { needs, insights },
    });

    // 3-2) (호스트만) canonical needs/insights도 서버에 저장
    if (isHost) {
      const n = needs.filter(Boolean);
      const i = insights.filter(Boolean);
      console.log('👑 host canonical save:', { n, i });
      console.log('➡️ emit room:host:set_needs_insights');
      socket.emit('room:host:set_needs_insights', {
        roomId: sessionId,
        needs: n,
        insights: i,
      });
    } else {
      console.log('👥 member: skip canonical save');
    }

    console.groupEnd();

    // 기존 페이지 전환 로직 유지
    onContinue({ needs, insights });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        {/* <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
        </div> */}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Input Needs and Insights</h1>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">👤</div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">User Research</h3>
                <p className="text-gray-600">Design Challenge Analysis</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Based on your research and understanding of your users, identify their needs and insights about their behavior.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{totalCompleted}/6 completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(totalCompleted / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-green-700">User Needs</h2>
                <span className="text-sm text-gray-500">{completedNeeds}/3 completed</span>
              </div>
              <p className="text-gray-600 mb-4">
                What are the specific needs your users require to accomplish their goals?
              </p>
              <div className="space-y-3">
                {needs.map((need, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={need}
                      onChange={(e) => {
                        const newNeeds = [...needs];
                        newNeeds[index] = e.target.value;
                        setNeeds(newNeeds);
                      }}
                      placeholder={`Need ${index + 1}...`}
                      className="flex-1 h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-700">User Insights</h2>
                <span className="text-sm text-gray-500">{completedInsights}/3 completed</span>
              </div>
              <p className="text-gray-600 mb-4">
                What have you discovered about your users' behavior and motivations?
              </p>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={insight}
                      onChange={(e) => {
                        const newInsights = [...insights];
                        newInsights[index] = e.target.value;
                        setInsights(newInsights);
                      }}
                      placeholder={`Insight ${index + 1}...`}
                      className="flex-1 h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={handleContinue}
              disabled={!isComplete}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center hover:transform hover:scale-105 ${
                isComplete 
                  ? 'bg-teal-600 text-white hover:bg-teal-700 smooth-hover' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to POV Creation
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeedsInsights;
