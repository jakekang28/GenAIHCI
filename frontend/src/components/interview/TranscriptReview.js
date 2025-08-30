import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';
import { apiService } from '../../services/apiService';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
const TranscriptReview = ({ 
  chatMessages, 
  selectedGroupQuestion, 
  selectedScenario, 
  onBack, 
  onContinue 
}) => {
  const { sessionId, members } = useSession();
  const [completionStatus, setCompletionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  useBackTrap(true)
  useEffect(() => {
    const checkCompletionStatus = async () => {
      if (!sessionId) return;
      
      try {
        setLoading(true);
        
        // Convert members to the format expected by the API
        const participants = members.map(member => ({
          userId: member.userId,
          userName: member.userName
        }));
        
        console.log('🔍 [TranscriptReview] Checking completion status with participants:', participants);
        console.log('🔍 [TranscriptReview] Total members from session:', members.length);
        
        // Use the new method that includes participants
        const status = await apiService.checkInterviewCompletionStatusWithParticipants(sessionId, participants);
        console.log('🔍 [TranscriptReview] Completion status received:', status);
        setCompletionStatus(status);
      } catch (error) {
        console.warn('Failed to check completion status:', error);
        // Fallback to the old method if the new one fails
        try {
          const status = await apiService.checkInterviewCompletionStatus(sessionId);
          console.log('🔍 [TranscriptReview] Fallback completion status:', status);
          setCompletionStatus(status);
        } catch (fallbackError) {
          console.warn('Fallback completion status check also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    checkCompletionStatus();

    // Set up periodic refresh when waiting for completion
    if (sessionId) {
      const interval = setInterval(checkCompletionStatus, 2000); // Check every 3 seconds for faster updates
      return () => clearInterval(interval);
    }
  }, [sessionId, members]);

  const getMessageType = (message, index) => {
    if (message.text === selectedGroupQuestion) return 'main-question';
    if (message.sender === 'user' && message.text !== selectedGroupQuestion) return 'follow-up';
    return 'response';
  };

  const userFollowUps = chatMessages
    .filter(msg => msg.sender === 'user' && msg.text !== selectedGroupQuestion)
    .map(msg => msg.text);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Interview Transcript</h1>

          {/* Group Progress Indicator */}
          {completionStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800">Group Progress</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700">
                  {completionStatus.completedInterviews} of {completionStatus.totalParticipants} interviews completed
                </span>
                <div className="flex space-x-2">
                  {Array.from({ length: completionStatus.totalParticipants }, (_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < completionStatus.completedInterviews 
                          ? 'bg-green-500' 
                          : 'bg-blue-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {!completionStatus.allCompleted && (
                <div className="mt-3 flex items-center text-blue-600 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Waiting for group members to complete their interviews
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 mb-8">
            {chatMessages.map((message, index) => {
              const messageType = getMessageType(message, index);
              return (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        message.sender === 'user' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {message.sender === 'user' ? 'You' : selectedScenario.persona.name}
                      </span>
                      {messageType === 'main-question' && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          Main Question
                        </span>
                      )}
                      {messageType === 'follow-up' && (
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{message.timestamp}</span>
                  </div>
                  <p className="text-gray-700 break-words overflow-hidden leading-relaxed">
                    {message.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Your Questions Analysis</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Main Question:</h4>
                <p className="text-gray-600 bg-white p-3 rounded border break-words overflow-hidden">
                  "{selectedGroupQuestion}"
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Follow-up Questions:</h4>
                <div className="space-y-2">
                  {userFollowUps.filter(q => q.trim()).map((question, index) => (
                    <p key={index} className="text-gray-600 bg-white p-3 rounded border break-words overflow-hidden">
                      {index + 1}. "{question}"
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={onContinue}
              disabled={completionStatus && !completionStatus.allCompleted}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center ${
                completionStatus && !completionStatus.allCompleted
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {completionStatus && !completionStatus.allCompleted ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Waiting for Group Members
                </>
              ) : (
                <>
                  Continue to Peer Evaluation
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptReview;
