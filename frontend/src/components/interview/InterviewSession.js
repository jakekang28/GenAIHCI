import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';
import { useLocalGuest } from '../../hooks/useLocalGuest';
import { apiService } from '../../services/apiService';

const InterviewSession = ({ 
  selectedScenario, 
  selectedGroupQuestion, 
  onBack, 
  onContinue,
  generateAIResponse,
  onUpdateQaHistory 
}) => {
  const { sessionId } = useSession();
  const { guest } = useLocalGuest();
  const [chatMessages, setChatMessages] = useState([]);


  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasAskedPreplanned, setHasAskedPreplanned] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
  const [qaHistory, setQaHistory] = useState([]);

  //Chat Function
  const addMessageToChat = (message, sender) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      sender: sender,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const sendPreplannedQuestion = async () => {
    if (selectedGroupQuestion.trim() && !hasAskedPreplanned) {
      addMessageToChat(selectedGroupQuestion, 'user');
      setIsTyping(true);
      
      try {
        const newAnswer = await generateAIResponse(selectedGroupQuestion);
        addMessageToChat(newAnswer, 'ai');
        
        const newQA = { question: selectedGroupQuestion, answer: newAnswer };
        setQaHistory(prev => {
          const updated = [...prev, newQA];
          return updated;
        });
        
        // Update parent QA history separately to avoid setState in render warning
        setTimeout(() => {
          onUpdateQaHistory([...qaHistory, newQA]);
        }, 0);
      } catch (error) {
        console.error('Error generating AI response:', error);
      } finally {
        setIsTyping(false);
      }
      
      setHasAskedPreplanned(true);
    }
  };

  const sendFollowUpQuestion = async () => {
    const q = followUpQuestion.trim();
    if (!q || currentFollowUpIndex >= 3) return;
    
    addMessageToChat(q, 'user');
    setIsTyping(true);
    
    try {
      const aiAnswer = await generateAIResponse(q);
      addMessageToChat(aiAnswer, 'ai');
      
      const newQA = { question: q, answer: aiAnswer };
      setQaHistory(prev => {
        const updated = [...prev, newQA];
        return updated;
      });
      
      // Update parent QA history separately to avoid setState in render warning
      setTimeout(() => {
        onUpdateQaHistory([...qaHistory, newQA]);
      }, 0);
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsTyping(false);
    }
    
    setCurrentFollowUpIndex(i => {
      const newIndex = i + 1;
              if (newIndex >= 3) {
          setInterviewCompleted(true);
        }
      return newIndex;
    });
    setFollowUpQuestion('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!hasAskedPreplanned) {
        sendPreplannedQuestion();
      } else {
        sendFollowUpQuestion();
      }
    }
  };

  const handleContinue = async () => {
    // Force re-read storage to get latest guest data (prefer sessionStorage for tab isolation)
    let freshGuest = null;
    
    // Try sessionStorage first (tab-isolated), then localStorage
    const sessionData = sessionStorage.getItem('guestUser');
    const localData = localStorage.getItem('guestUser');
    
    if (sessionData) {
      try {
        freshGuest = JSON.parse(sessionData);
      } catch (e) {
        console.warn('Failed to parse sessionStorage guest data');
      }
    } else if (localData) {
      try {
        freshGuest = JSON.parse(localData);
      } catch (e) {
        console.warn('Failed to parse localStorage JSON guest data');
      }
    }
    
    // Fall back to separate keys if needed
    if (!freshGuest) {
      const freshGuestUserId = localStorage.getItem('guestUserId');
      const freshGuestName = localStorage.getItem('guestName');
      if (freshGuestUserId && freshGuestName) {
        freshGuest = { guestUserId: freshGuestUserId, guestName: freshGuestName };
      }
    }
    
    try {
      // Use fresh guest data from storage to ensure accuracy
      const finalGuest = (freshGuest && freshGuest.guestUserId && freshGuest.guestName) ? freshGuest : guest;
      
      // Save transcript to database before continuing
      if (sessionId && finalGuest && finalGuest.guestUserId && chatMessages.length > 0) {
        await apiService.saveTranscript(
          sessionId,
          finalGuest.guestUserId,
          finalGuest.guestName,
          chatMessages,
          selectedScenario
        );
      } else {
        console.warn('Cannot save transcript, missing data');
      }
    } catch (error) {
      console.error('❌ [InterviewSession] Failed to save transcript:', error);
      // Continue anyway - don't block the flow
    }
    
    onContinue(chatMessages);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Interview Session</h1>
          </div>
          <div className="flex items-center mb-6">
            <div className="text-4xl mr-4">{selectedScenario.persona.image}</div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{selectedScenario.persona.name}</h3>
              <p className="text-teal-600">● Online</p>
              <p className="text-sm text-gray-500 break-words overflow-hidden">{selectedScenario.persona.description}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6 h-96 overflow-y-auto custom-scrollbar">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start the interview by asking your pre-planned question below.</p>
              </div>
            )}
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words overflow-hidden ${
                    message.sender === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border shadow-sm'
                  }`}>
                    <p className="text-sm break-words overflow-hidden">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border shadow-sm px-4 py-3 rounded-lg max-w-xs">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-600 font-medium">{selectedScenario.persona.name} is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!hasAskedPreplanned && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Selected Question:</h3>
              <div className="grid gap-3">
                <button
                  onClick={sendPreplannedQuestion}
                  disabled={isTyping}
                  className="text-left p-4 rounded-lg border transition-all break-words overflow-hidden bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300"
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 bg-teal-500 text-white">
                      1
                    </div>
                    <span className="break-words overflow-hidden">
                      {selectedGroupQuestion}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {hasAskedPreplanned && !interviewCompleted && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Ask Follow-up Question ({currentFollowUpIndex + 1}/3):
              </h3>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Type your follow-up question ${currentFollowUpIndex + 1} here...`}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={isTyping}
                />
                <button
                  onClick={sendFollowUpQuestion}
                  disabled={!followUpQuestion.trim() || isTyping}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center ${
                    followUpQuestion.trim() && !isTyping
                      ? 'bg-teal-600 text-white hover:bg-teal-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Progress:</span>
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((index) => (
                      <div 
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          index < currentFollowUpIndex 
                            ? 'bg-teal-500' 
                            : index === currentFollowUpIndex 
                            ? 'bg-teal-300' 
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {interviewCompleted && (
            <div className="text-center mt-8 pt-6 border-t">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-green-800 mb-2">Interview Completed!</h3>
                <p className="text-green-700">
                  You've successfully completed the interview with {selectedScenario.persona.name}. 
                </p>
              </div>
              <button 
                onClick={() => {
          
                  handleContinue();
                }}
                className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center mx-auto"
              >
                Review Interview Transcript
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
