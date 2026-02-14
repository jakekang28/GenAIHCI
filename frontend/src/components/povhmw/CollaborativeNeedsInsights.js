import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Crown, CheckCircle, Clock } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';

const CollaborativeNeedsInsights = ({ onBack, onContinue }) => {
  const { sessionId, members, socket } = useSession();
  
  // State for needs and insights
  const [needs, setNeeds] = useState(Array(3).fill(''));
  const [insights, setInsights] = useState(Array(3).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Get current user info and check if they're the host
  const currentUser = members?.find(m => m.socketId === socket?.id);
  const isHost = currentUser?.isHost || false;
  const hostMember = members?.find(m => m.isHost);
  
  // Progress tracking
  const completedNeeds = needs.filter(need => need.trim()).length;
  const completedInsights = insights.filter(insight => insight.trim()).length;
  const totalCompleted = completedNeeds + completedInsights;
  const isComplete = completedNeeds >= 3 && completedInsights >= 3;

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleHostDecision = (data) => {
      if (data?.decision?.type === 'set_needs_insights') {
        const { needs: hostNeeds, insights: hostInsights } = data.decision.data;
        setNeeds(hostNeeds || Array(3).fill(''));
        setInsights(hostInsights || Array(3).fill(''));
        setHasSubmitted(true);
      }
    };

    const handleError = (data) => {
      console.error('Room error:', data.message);
      setIsSubmitting(false);
    };

    socket.on('room:host_decision', handleHostDecision);
    socket.on('room:error', handleError);

    return () => {
      socket.off('room:host_decision', handleHostDecision);
      socket.off('room:error', handleError);
    };
  }, [socket]);

  // Handle needs/insights submission (host only)
  const handleSubmit = async () => {
    if (!isHost || !isComplete || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      // Filter out empty values and ensure we have exactly what we need
      const filteredNeeds = needs.filter(need => need.trim()).slice(0, 3);
      const filteredInsights = insights.filter(insight => insight.trim()).slice(0, 3);
      
      // Emit the host decision to set needs and insights
      socket.emit('room:host:set_needs_insights', {
        roomId: sessionId,
        needs: filteredNeeds,
        insights: filteredInsights
      });
      
      setHasSubmitted(true);
    } catch (error) {
      console.error('Error submitting needs and insights:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (hasSubmitted && onContinue) {
      onContinue({ 
        needs: needs.filter(need => need.trim()), 
        insights: insights.filter(insight => insight.trim()) 
      });
    }
  };

  const renderHostInputs = () => (
    <div className="space-y-8">
      {/* Needs Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-green-700 flex items-center">
            <span className="mr-2">🎯</span>
            User Needs
          </h2>
          <span className="text-sm text-gray-500">{completedNeeds}/3 completed</span>
        </div>
        <p className="text-gray-600 mb-4">
          What are the core needs your users are trying to fulfill?
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
                disabled={hasSubmitted}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-blue-700 flex items-center">
            <span className="mr-2">💡</span>
            User Insights
          </h2>
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
      {/* Status Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <h3 className="text-lg font-semibold text-purple-800">
            Waiting for Host
          </h3>
        </div>
        <p className="text-center text-purple-600">
          {hasSubmitted 
            ? "The host has set the team's needs and insights!" 
            : "The host is currently defining the team's needs and insights..."}
        </p>
        <div className="flex justify-center mt-4">
          {hasSubmitted ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <Clock className="w-8 h-8 text-purple-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Display needs and insights if submitted */}
      {hasSubmitted && (
        <div className="space-y-6">
          {/* Needs Display */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              Team Needs
            </h2>
            <div className="space-y-3">
              {needs.filter(need => need.trim()).map((need, index) => (
                <div key={index} className="flex items-center space-x-3 bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <span className="text-green-800">{need}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insights Display */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Team Insights
            </h2>
            <div className="space-y-3">
              {insights.filter(insight => insight.trim()).map((insight, index) => (
                <div key={index} className="flex items-center space-x-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <span className="text-blue-800">{insight}</span>
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
          
          <h1 className="text-3xl font-bold text-gray-800 text-center">
            Define Team Needs & Insights
          </h1>
          <p className="text-center text-gray-600 mt-2">
            {isHost 
              ? "As the host, define the team's user needs and insights that will guide your POV statement"
              : "Wait for the host to define the team's user needs and insights"}
          </p>
          
          {/* Progress Bar - only show for host */}
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

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isHost ? renderHostInputs() : renderMemberView()}

          {/* Action Buttons */}
          <div className="flex justify-center mt-8">
            {isHost ? (
              !hasSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!isComplete || isSubmitting}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isComplete && !isSubmitting
                      ? 'bg-green-500 text-white hover:from-green-600 hover:to-blue-600 transform hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Setting Needs/Insights...' : 'Set Needs/Insights'}
                </button>
              ) : (
                <button
                  onClick={handleContinue}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
                >
                  Continue to POV Creation
                </button>
              )
            ) : (
              hasSubmitted && (
                <button
                  onClick={handleContinue}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
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
