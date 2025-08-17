import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';
import { useLocalGuest } from '../../hooks/useLocalGuest';
import { apiService } from '../../services/apiService';

const PeerTranscriptEvaluation = ({ 
  chatMessages, 
  selectedGroupQuestion, 
  selectedScenario, 
  onBack, 
  onContinue 
}) => {
  const { sessionId } = useSession();
  const { guest, ensureGuest } = useLocalGuest();
  
  // Fallback: try to reload guest data from storage if missing
  useEffect(() => {
    if (!guest) {
      // Try sessionStorage first, then localStorage
      let fallbackData = null;
      
      // Try unified JSON format first
      const sessionData = sessionStorage.getItem('guestUser');
      const localData = localStorage.getItem('guestUser');
      
      if (sessionData) {
        try {
          fallbackData = JSON.parse(sessionData);
        } catch (e) {
          console.warn('Failed to parse sessionStorage fallback');
        }
      } else if (localData) {
        try {
          fallbackData = JSON.parse(localData);
        } catch (e) {
          console.warn('Failed to parse localStorage JSON fallback');
        }
      }
      
      // Fall back to separate keys
      if (!fallbackData) {
        const fallbackUserId = localStorage.getItem('guestUserId');
        const fallbackName = localStorage.getItem('guestName');
        if (fallbackUserId && fallbackName) {
          fallbackData = { guestUserId: fallbackUserId, guestName: fallbackName };
        }
      }
      
      if (fallbackData && fallbackData.guestUserId && fallbackData.guestName) {
        ensureGuest(fallbackData.guestUserId, fallbackData.guestName);
      }
    }
  }, [guest, ensureGuest]);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [allTranscripts, setAllTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchTranscripts = async () => {
      if (!sessionId) {
        console.warn('⚠️ [PeerTranscriptEvaluation] No session ID available, showing current transcript only');
        setLoading(false);
        return;
      }

      // Wait for guest data to be available before fetching
      if (!guest) {
        console.log('⚠️ [PeerTranscriptEvaluation] Guest data not available yet, waiting...');
        setLoading(false);
        return;
      }

      try {
        
        
        const response = await apiService.getSessionTranscripts(sessionId);
        setAllTranscripts(response.transcripts || []);
      } catch (err) {
        console.warn('Failed to fetch database transcripts:', err.message);
        // Continue anyway - we'll show the current user's transcript
        setAllTranscripts([]);
      }
      
      setLoading(false);
    };

    // Add a small delay to ensure any pending saves have completed
    const timer = setTimeout(fetchTranscripts, 1000);
    return () => clearTimeout(timer);
  }, [sessionId, guest]); // Add guest as dependency



  const toggleDropdown = (transcriptId, questionType) => {
    const dropdownKey = `${transcriptId}_${questionType}`;
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownKey]: !prev[dropdownKey]
    }));
  };

  const processTranscriptData = (transcript) => {
    const messages = transcript.messages || [];
    
    // Find the main question (first user message or the selected group question)
    const mainQuestionMsg = messages.find(msg => 
      msg.sender === 'user' && (msg.text === selectedGroupQuestion || messages.indexOf(msg) === 0)
    );
    const mainQuestion = mainQuestionMsg?.text || selectedGroupQuestion;
    
    // Find the main question response (first AI message after main question)
    const mainQuestionIndex = messages.findIndex(msg => msg.text === mainQuestion);
    const mainQuestionResponse = messages.find((msg, index) => 
      msg.sender === 'ai' && index > mainQuestionIndex
    )?.text || "No response available";
    
    // Get follow-up questions (user messages that aren't the main question)
    const followUps = messages
      .filter(msg => msg.sender === 'user' && msg.text !== mainQuestion)
      .map(msg => msg.text);
    
    // Get follow-up responses (AI messages after follow-ups)
    const followUpResponses = messages
      .filter(msg => msg.sender === 'ai')
      .slice(1) // Skip the first AI response (main question response)
      .map(msg => msg.text);
    
    return {
      id: transcript.id,
      studentName: transcript.user_name,
      isYourTranscript: false, // We'll mark the current user's transcript separately
      mainQuestion,
      mainQuestionResponse,
      followUps,
      followUpResponses,
      insights: [] // Could be enhanced with AI analysis later
    };
  };

  const getProcessedTranscripts = () => {
    const transcripts = [];
    

    
    // Add all database transcripts (from other users or previous sessions)
    if (allTranscripts && allTranscripts.length > 0) {
      // Count unique users for testing info
      const uniqueUserIds = new Set(allTranscripts.map(t => t.user_id));
      
      // Deduplicate based on content similarity (in case of user ID issues)
      const uniqueTranscripts = [];
      const seenContent = new Set();
      
      for (const transcript of allTranscripts) {
        // Create a content hash based on the first few messages
        const firstMessages = transcript.messages?.slice(0, 3).map(m => m.text).join('|') || '';
        const contentHash = firstMessages.slice(0, 100); // First 100 chars as simple hash
        
        if (!seenContent.has(contentHash)) {
          seenContent.add(contentHash);
          uniqueTranscripts.push(transcript);
        }
      }
      
      const dbTranscripts = uniqueTranscripts.map((transcript, index) => {
        const processed = processTranscriptData(transcript);
        const isCurrentUser = guest && transcript.user_id === guest.guestUserId;
        
        // Create a clearer display name
        const shortUserId = transcript.user_id.slice(0, 8);
        const displayName = isCurrentUser 
          ? `You (${transcript.user_name})` 
          : `${transcript.user_name} (${shortUserId})`;
        
        return {
          ...processed,
          userId: transcript.user_id,
          studentName: displayName,
          fullUserId: transcript.user_id,
          isYourTranscript: isCurrentUser,
          source: "database",
          timestamp: transcript.created_at
        };
      });
      transcripts.push(...dbTranscripts);
    }
    

    
    // If no transcripts at all, show a sample structure
    if (transcripts.length === 0) {
      return [{
        id: 'no-data',
        studentName: "No Transcripts Available",
        userId: "none",
        isYourTranscript: false,
        mainQuestion: "No interviews completed yet",
        mainQuestionResponse: "No responses available",
        followUps: [],
        followUpResponses: [],
        insights: [],
        source: "placeholder"
      }];
    }
    
    return transcripts;
  };

  const processedTranscripts = getProcessedTranscripts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 mb-4 text-purple-500 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Interview Transcripts...</h2>
              <p className="text-gray-600">Preparing transcript view...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Transcript
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Interview Transcripts Review</h1>
          <p className="text-gray-600 mb-4">
            Review all available interview transcripts. Compare different approaches to follow-up questions 
            and note what techniques were most effective.
          </p>
          


          <div className="space-y-6">
            {processedTranscripts.map((transcript, index) => (
              <div 
                key={transcript.id}
                className={`border-2 rounded-lg p-6 ${
                  transcript.isYourTranscript 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                    <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {transcript.studentName}
                  </h3>
                      {transcript.fullUserId && transcript.source === 'database' && (
                        <p className="text-sm text-gray-500 font-mono">
                          User ID: {transcript.fullUserId}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">


                      {!transcript.isYourTranscript && transcript.source === 'database' && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          Group Member
                        </span>
                      )}
                      {transcript.source === 'placeholder' && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                          No Data
                    </span>
                  )}
                    </div>
                </div>

                <div className="space-y-6">
                  {/* Main Question Section */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Main Question:</h4>
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleDropdown(transcript.id, 'main')}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-gray-700 break-words overflow-hidden flex-1 text-sm">
                          "{transcript.mainQuestion}"
                        </span>
                        {openDropdowns[`${transcript.id}_main`] ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                        )}
                      </button>
                      
                      {openDropdowns[`${transcript.id}_main`] && (
                        <div className="border-t border-gray-200 p-4 bg-blue-50">
                          <div className="flex items-start">
                            <div className="text-2xl mr-3 flex-shrink-0">{selectedScenario.persona.image}</div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-blue-800 mb-2">{selectedScenario.persona.name}'s Response:</h5>
                              <p className="text-blue-700 text-sm break-words overflow-hidden leading-relaxed">
                                {transcript.mainQuestionResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/*Follow-up Questions Section*/}
                    {transcript.followUps && transcript.followUps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Follow-up Questions:</h4>
                    <div className="space-y-3">
                      {transcript.followUps.map((question, qIndex) => (
                        <div key={qIndex} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleDropdown(transcript.id, `followup_${qIndex}`)}
                            className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <span className="text-gray-700 break-words overflow-hidden flex-1 text-sm">
                              {qIndex + 1}. "{question}"
                            </span>
                            {openDropdowns[`${transcript.id}_followup_${qIndex}`] ? (
                              <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                            )}
                          </button>
                          
                          {openDropdowns[`${transcript.id}_followup_${qIndex}`] && (
                            <div className="border-t border-gray-200 p-4 bg-green-50">
                              <div className="flex items-start">
                                <div className="text-2xl mr-3 flex-shrink-0">{selectedScenario.persona.image}</div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-green-800 mb-2">{selectedScenario.persona.name}'s Response:</h5>
                                  <p className="text-green-700 text-sm break-words overflow-hidden leading-relaxed">
                                    {transcript.followUpResponses && transcript.followUpResponses[qIndex] 
                                      ? transcript.followUpResponses[qIndex] 
                                      : "Response not available for this follow-up question."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                    )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <button 
              onClick={onContinue}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center"
            >
              Continue to Final Evaluation
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerTranscriptEvaluation;