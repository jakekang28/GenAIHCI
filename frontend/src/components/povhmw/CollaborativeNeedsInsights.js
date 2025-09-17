import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Crown, CheckCircle, Clock } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';

const CollaborativeNeedsInsights = ({ onBack, onContinue }) => {
  const { sessionId, members, socket, mySocketId } = useSession();

  // Local state
  const [needs, setNeeds] = useState(Array(3).fill(''));
  const [insights, setInsights] = useState(Array(3).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Who am I?
  const currentUser =
    members?.find((m) => m.socketId === mySocketId) ||
    members?.find((m) => m.socketId === socket?.id);
  const isHost = !!currentUser?.isHost;
  const hostMember = members?.find((m) => m.isHost);

  // Progress
  const completedNeeds = needs.filter((v) => v.trim()).length;
  const completedInsights = insights.filter((v) => v.trim()).length;
  const totalCompleted = completedNeeds + completedInsights;
  const isComplete = completedNeeds >= 3 && completedInsights >= 3;

  // Prevent duplicate auto-continue
  const continuedRef = useRef(false);

  // ─────────────────────────────────────────────────────────────
  // 1) Mount 시: 이 화면의 step을 pov_setup으로 서버에 올리고, 현재 flow sync
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !sessionId) return;

    // 진입 시 현 상태를 flow에 기록 (복원/동기 목적)
    socket.emit('room:flow:update', {
      roomId: sessionId,
      step: 'pov_setup',
      payload: { needs, insights },
    });

    // 현재 flow 요청 (재접속/새 탭에서 복원)
    socket.emit('room:flow:sync', { roomId: sessionId });

    const handleFlow = (flow) => {
      if (!flow) return;

      // 동 페이지 상태 복원
      if (flow.step === 'pov_setup' && flow.payload) {
        const { needs: n, insights: i } = flow.payload || {};
        if (Array.isArray(n) && n.length && needs.join('|') !== n.join('|')) {
          setNeeds(n);
        }
        if (Array.isArray(i) && i.length && insights.join('|') !== i.join('|')) {
          setInsights(i);
        }
      }

      // 다른 멤버/호스트가 먼저 다음 단계로 넘겼을 때 자동 진행
      if (flow.step === 'pov_create' && !continuedRef.current) {
        continuedRef.current = true;
        onContinue?.({
          needs: (flow.payload?.needs || needs).filter((x) => x?.trim()),
          insights: (flow.payload?.insights || insights).filter((x) => x?.trim()),
        });
      }
    };

    const handleHostDecision = (data) => {
      if (data?.decision?.type === 'set_needs_insights') {
        const { needs: hostNeeds, insights: hostInsights } = data.decision.data || {};
        // 호스트가 확정한 값으로 덮어씌움
        setNeeds(Array.isArray(hostNeeds) ? hostNeeds : Array(3).fill(''));
        setInsights(Array.isArray(hostInsights) ? hostInsights : Array(3).fill(''));
        setHasSubmitted(true);

        // flow payload에도 반영(여전히 pov_setup 단계 유지)
        socket.emit('room:flow:update', {
          roomId: sessionId,
          step: 'pov_setup',
          payload: { needs: hostNeeds || [], insights: hostInsights || [] },
        });
      }
    };

    const handleError = (data) => {
      // 서버 에러 핸들링
      console.error('[CollaborativeNeedsInsights] room:error', data?.message);
      setIsSubmitting(false);
    };

    socket.on('room:flow', handleFlow);
    socket.on('room:host_decision', handleHostDecision);
    socket.on('room:error', handleError);

    return () => {
      socket.off('room:flow', handleFlow);
      socket.off('room:host_decision', handleHostDecision);
      socket.off('room:error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, sessionId, mySocketId, members]);
  useEffect(() => {
  if (!socket || !sessionId) return;
  const onFlow = (flow) => {
    console.log('[CNI] room:flow', flow);
  };
  socket.on('room:flow', onFlow);
  socket.emit('room:flow:sync', { roomId: sessionId });
  return () => socket.off('room:flow', onFlow);
}, [socket, sessionId]);
  // ─────────────────────────────────────────────────────────────
  // 2) 입력 변경 시: 디바운스로 flow payload 업데이트 (여전히 pov_setup)
  // ─────────────────────────────────────────────────────────────
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!socket || !sessionId) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socket.emit('room:flow:update', {
        roomId: sessionId,
        step: 'pov_setup',
        payload: { needs, insights },
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [needs, insights, socket, sessionId]);

  // ─────────────────────────────────────────────────────────────
  // 3) 호스트: Needs/Insights 확정(브로드캐스트)
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isHost || !isComplete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const filteredNeeds = needs.filter((v) => v.trim()).slice(0, 3);
      const filteredInsights = insights.filter((v) => v.trim()).slice(0, 3);

      socket.emit('room:host:set_needs_insights', {
        roomId: sessionId,
        needs: filteredNeeds,
        insights: filteredInsights,
      });

      // 로컬 표시용
      setHasSubmitted(true);

      // flow payload도 최신으로 유지
      socket.emit('room:flow:update', {
        roomId: sessionId,
        step: 'pov_setup',
        payload: { needs: filteredNeeds, insights: filteredInsights },
      });
    } catch (e) {
      console.error('Error submitting needs/insights', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4) 다음 단계로 이동: 누구든 누르면 flow를 pov_create로 올림
  // ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (!socket || !sessionId) {
      onContinue?.({
        needs: needs.filter((x) => x?.trim()),
        insights: insights.filter((x) => x?.trim()),
      });
      return;
    }
    socket.emit('room:flow:update', {
      roomId: sessionId,
      step: 'pov_create',
      payload: { needs, insights },
    });
    if (!continuedRef.current) {
      continuedRef.current = true;
      onContinue?.({
        needs: needs.filter((x) => x?.trim()),
        insights: insights.filter((x) => x?.trim()),
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────
  const renderHostInputs = () => (
    <div className="space-y-8">
      {/* Needs */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-green-700 flex items-center">
            <span className="mr-2">🎯</span>
            User Needs
          </h2>
          <span className="text-sm text-gray-500">{completedNeeds}/3 completed</span>
        </div>
        <p className="text-gray-600 mb-4">What are the core needs your users are trying to fulfill?</p>
        <div className="space-y-3">
          {needs.map((need, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">{i + 1}</span>
              </div>
              <input
                type="text"
                value={need}
                onChange={(e) => {
                  const next = [...needs];
                  next[i] = e.target.value;
                  setNeeds(next);
                }}
                placeholder={`Need ${i + 1}...`}
                className="flex-1 h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                disabled={hasSubmitted}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-blue-700 flex items-center">
            <span className="mr-2">💡</span>
            User Insights
          </h2>
        </div>
        <p className="text-gray-600 mb-4">What have you discovered about your users' behavior and motivations?</p>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">{i + 1}</span>
              </div>
              <input
                type="text"
                value={insight}
                onChange={(e) => {
                  const next = [...insights];
                  next[i] = e.target.value;
                  setInsights(next);
                }}
                placeholder={`Insight ${i + 1}...`}
                className="flex-1 h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={hasSubmitted}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMemberView = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <h3 className="text-lg font-semibold text-purple-800">Waiting for Host</h3>
        </div>
        <p className="text-center text-purple-600">
          {hasSubmitted
            ? "The host has set the team's needs and insights!"
            : 'The host is currently defining the team’s needs and insights...'}
        </p>
        <div className="flex justify-center mt-4">
          {hasSubmitted ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <Clock className="w-8 h-8 text-purple-500 animate-pulse" />
          )}
        </div>
      </div>

      {hasSubmitted && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              Team Needs
            </h2>
            <div className="space-y-3">
              {needs
                .filter((x) => x.trim())
                .map((x, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-3 bg-green-50 rounded-lg p-3 border border-green-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">{i + 1}</span>
                    </div>
                    <span className="text-green-800">{x}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Team Insights
            </h2>
            <div className="space-y-3">
              {insights
                .filter((x) => x.trim())
                .map((x, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-3 bg-blue-50 rounded-lg p-3 border border-blue-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{i + 1}</span>
                    </div>
                    <span className="text-blue-800">{x}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-600">
                <Users className="w-5 h-5 mr-2" />
                <span>{members?.length || 0} members</span>
              </div>
              {isHost && (
                <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                  <Crown className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Host</span>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 text-center">Define Team Needs & Insights</h1>
          <p className="text-center text-gray-600 mt-2">
            {isHost
              ? "As the host, define the team's user needs and insights that will guide your POV statement"
              : "Wait for the host to define the team's user needs and insights"}
          </p>

          {/* Progress (host only, not submitted) */}
          {isHost && !hasSubmitted && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{totalCompleted}/6 completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(totalCompleted / 6) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isHost ? renderHostInputs() : renderMemberView()}

          {/* Actions */}
          <div className="flex justify-center mt-8">
            {isHost ? (
              !hasSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!isComplete || isSubmitting}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isComplete && !isSubmitting
                      ? 'bg-green-500 text-white hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Setting Needs/Insights...' : 'Set Needs/Insights'}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                >
                  Continue to POV Creation
                </button>
              )
            ) : (
              hasSubmitted && (
                <button
                  onClick={goNext}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                >
                  Continue to POV Creation
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeNeedsInsights;
