import React, { useState, useEffect } from 'react';
import { MessageCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
import { useSession } from '../../providers/SessionProvider';

const Home = ({ onStartInterview, onStartHMW }) => {
  useBackTrap(true);

  const { sessionId, socket, mySocketId, members } = useSession();
  const [isResetting, setIsResetting] = useState(false);

  const me = members?.find((m) => m.socketId === mySocketId);
  const isHost = !!me?.isHost;

  const waitResetAck = (type, timeout = 200) =>
    new Promise((resolve) => {
      if (!socket) return resolve();
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          socket.off('room:type_reset', onAck);
          resolve();
        }
      }, timeout);

      const onAck = (payload) => {
        if (done) return;
        if (payload?.roomId === sessionId && payload?.type === type) {
          clearTimeout(timer);
          done = true;
          socket.off('room:type_reset', onAck);
          resolve();
        }
      };
      socket.on('room:type_reset', onAck);
    });

  const emitReset = async (type) => {
    if (!socket || !sessionId) return;
    socket.emit('room:reset_type', { roomId: sessionId, type });
    await waitResetAck(type); 
  };

  const handleStartInterview = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {

      if (isHost && socket) {

        await emitReset('scenario_selection');
        await emitReset('interview_question');
      }
    } finally {
      setIsResetting(false);
      onStartInterview && onStartInterview();
    }
  };

  const handleStartHMW = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      if (isHost && socket) {

        await emitReset('pov_statement');
        await emitReset('hmw_question');
      }
    } finally {
      setIsResetting(false);
      onStartHMW && onStartHMW();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="text-center mb-12 fade-in">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Design Thinking Learning System</h1>
          <p className="text-xl text-gray-600">
            Choose your learning session to improve your design research skills
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Interview System */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 slide-in-left">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mr-4">
                <MessageCircle className="w-6 h-6 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Interview System</h2>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              Practice conducting user interviews with AI personas. Create questions, get group feedback,
              receive AI guidance, and conduct simulated interviews with follow-up questions.
            </p>

            <button
              onClick={handleStartInterview}
              disabled={isResetting}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center hover:transform hover:scale-105 smooth-hover ${
                isResetting ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {isResetting ? 'Preparing…' : 'Start Interview Training'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>

          {/* HMW System */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 slide-in-right">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">POV & HMW System</h2>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              Learn to create Point of View statements and generate How Might We questions.
              Practice synthesizing research into actionable design challenges with AI feedback.
            </p>

            <button
              onClick={handleStartHMW}
              disabled={isResetting}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center hover:transform hover:scale-105 smooth-hover ${
                isResetting ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isResetting ? 'Preparing…' : 'Start POV & HMW Training'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;