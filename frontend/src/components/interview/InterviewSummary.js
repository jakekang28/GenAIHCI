import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Copy, CheckCircle, Star, FileText, User, MessageCircle, Brain, Calendar } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';
import { useLocalGuest } from '../../hooks/useLocalGuest';
import { apiService } from '../../services/apiService';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
import LoadingPage from '../LoadingPage';
import HelpButton from '../shared/HelpButton';

const InterviewSummary = ({ 
  onBack, 
  onComplete 
}) => {
  useBackTrap(true);
  const { sessionId } = useSession();
  const { guest, ensureGuest } = useLocalGuest();
  
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fallback: try to reload guest data from storage if missing
  useEffect(() => {
    if (!guest) {
      console.log('🔍 [InterviewSummary] Guest data missing, trying fallback...');
      // Try sessionStorage first, then localStorage
      let fallbackData = null;
      
      // Try unified JSON format first
      const sessionData = sessionStorage.getItem('guestUser');
      const localData = localStorage.getItem('guestUser');
      
      if (sessionData) {
        try {
          fallbackData = JSON.parse(sessionData);
          console.log('🔍 [InterviewSummary] Found guest data in sessionStorage:', fallbackData);
        } catch (e) {
          console.warn('Failed to parse sessionStorage fallback');
        }
      } else if (localData) {
        try {
          fallbackData = JSON.parse(localData);
          console.log('🔍 [InterviewSummary] Found guest data in localStorage:', fallbackData);
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
          console.log('🔍 [InterviewSummary] Found guest data in separate keys:', fallbackData);
        }
      }
      
      if (fallbackData && fallbackData.guestUserId && fallbackData.guestName) {
        console.log('🔍 [InterviewSummary] Calling ensureGuest with fallback data');
        ensureGuest(fallbackData.guestUserId, fallbackData.guestName);
      } else {
        console.warn('🔍 [InterviewSummary] No guest data found in storage');
      }
    }
  }, [guest, ensureGuest]);

  // Add timeout to show error if guest data never loads
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!guest?.guestUserId && loading) {
        console.error('🔍 [InterviewSummary] Timeout: Guest data never loaded');
        setError('Unable to load user information. Please try refreshing the page.');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [guest?.guestUserId, loading]);

  useEffect(() => {
    const fetchSummaryData = async () => {
      console.log('🔍 [InterviewSummary] fetchSummaryData called with:', { 
        sessionId, 
        guestUserId: guest?.guestUserId, 
        guestName: guest?.guestName,
        hasGuest: !!guest 
      });

      // Wait for guest data to be available
      if (!sessionId) {
        console.error('🔍 [InterviewSummary] Missing sessionId');
        setError('Missing session information');
        setLoading(false);
        return;
      }

      if (!guest?.guestUserId) {
        // Don't show error immediately, let the fallback effect try to load guest data
        console.log('🔍 [InterviewSummary] Guest data not available yet, waiting...');
        return;
      }

      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        console.log('🔍 [InterviewSummary] Fetching summary data...');
        const response = await apiService.getInterviewSummary(sessionId, guest.guestUserId);
        console.log('🔍 [InterviewSummary] Summary data received:', response);
        console.log('🔍 [InterviewSummary] AI Question Feedback structure:', response.aiQuestionFeedback);
        console.log('🔍 [InterviewSummary] Processed scores:', response.aiQuestionFeedback?.processed_scores);
        setSummaryData(response);

        // Automatically save the summary text to the database
        try {
          const summaryText = generateSummaryTextFromData(response);
          const transcriptLength = response.interviewTranscript?.messages?.length || 0;
          
          await apiService.saveInterviewSummaryText(
            sessionId, 
            guest.guestUserId, 
            guest.guestName, 
            summaryText,
            {
              sessionName: response.sessionDetails?.session_name,
              personaTag: response.chosenPersona,
              questionCount: transcriptLength
            }
          );
          console.log('✅ [InterviewSummary] Summary text saved to database');
        } catch (saveError) {
          console.warn('⚠️ [InterviewSummary] Failed to save summary text:', saveError);
          // Don't block the UI, just log the warning
        }
      } catch (err) {
        console.error('🔍 [InterviewSummary] Failed to fetch interview summary:', err);
        setError('Failed to load interview summary. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [sessionId, guest?.guestUserId]);

  const formatTranscript = (messages) => {
    if (!messages || !Array.isArray(messages)) return 'No transcript available';
    
    return messages
      .map(msg => {
        const role = msg.sender === 'user' ? 'Interviewer' : 'Interviewee';
        return `${role}: ${msg.text}`;
      })
      .join('\n\n');
  };

  const formatAIFeedback = (feedback) => {
    if (!feedback || !feedback.processed_scores) return 'No feedback available';
    
    // Handle pre-evaluation format: {mistakes, response}
    if (typeof feedback.processed_scores.mistakes !== 'undefined' && feedback.processed_scores.response) {
      const issuesText = feedback.processed_scores.mistakes || 'No Issues Found';
      return `Question Quality: ${issuesText}\n\nFeedback: ${feedback.processed_scores.response}`;
    }
    
    // Handle post-evaluation format: [{standard, score, response}]
    if (Array.isArray(feedback.processed_scores)) {
      return feedback.processed_scores
        .map(rubric => `${rubric.standard}: ${rubric.score}/5 - ${rubric.response}`)
        .join('\n\n');
    }
    
    // Fallback: try to display raw response safely
    if (typeof feedback.ai_response === 'string') {
      return feedback.ai_response;
    } else if (feedback.ai_response?.content && typeof feedback.ai_response.content === 'string') {
      return feedback.ai_response.content;
    } else {
      return 'Feedback data in unexpected format';
    }
  };

  const formatPersona = (personaTag, scenarioData) => {
    if (!personaTag) return 'No persona information available';
    
    // If we have scenario data with persona info, use it
    if (scenarioData?.persona) {
      return `${scenarioData.persona.name || 'Unknown'} - ${scenarioData.persona.description || scenarioData.persona.role || 'No description available'}`;
    }
    
    // Fallback to persona tag mapping
    const personaMap = {
      'A': 'Sofia Nguyen - Single Parent & Part-Time Evening Student',
      'B': 'Roberto Alvarez - Independent Coffee Shop Owner',
      'C': 'Fatima Hassan - Community Health Outreach Worker',
      'D': 'Ethan Walker - Junior Remote Software Developer'
    };
    
    return personaMap[personaTag] || `Persona ${personaTag}`;
  };

  const generateSummaryTextFromData = (data) => {
    const sections = [
      '=== INTERVIEW SESSION SUMMARY ===',
      '',
      `Session: ${data.sessionDetails?.session_name || 'Unnamed Session'}`,
      `Date: ${data.sessionDetails?.created_at ? new Date(data.sessionDetails.created_at).toLocaleDateString() : 'Unknown'}`,
      `Participant: ${guest?.guestName || 'Unknown'}`,
      '',
      '1. CHOSEN PERSONA:',
      formatPersona(data.chosenPersona, data.sessionDetails?.scenario_data),
      '',
      '2. WRITTEN QUESTION:',
      data.writtenQuestion || 'No question written by this user',
      '',
      '3. SELECTED QUESTION:',
      data.selectedQuestion || 'No question was selected for the interview',
      '',
      '4. AI FEEDBACK ON SELECTED QUESTION:',
      data.aiQuestionFeedback ? formatAIFeedback(data.aiQuestionFeedback) : 'No AI feedback available',
      '',
      '5. INTERVIEW TRANSCRIPT:',
      data.interviewTranscript ? formatTranscript(data.interviewTranscript.messages) : 'No transcript available',
      '',
      '6. AI FEEDBACK ON INTERVIEW:',
      data.aiInterviewFeedback ? formatAIFeedback(data.aiInterviewFeedback) : 'No AI interview feedback available',
      ''
    ];

    return sections.join('\n');
  };

  const generateSummaryText = () => {
    if (!summaryData) return '';
    return generateSummaryTextFromData(summaryData);
  };

  const handleCopyToClipboard = async () => {
    try {
      const summaryText = generateSummaryText();
      await navigator.clipboard.writeText(summaryText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownload = () => {
    const summaryText = generateSummaryText();
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-summary-${sessionId}-${guest?.guestName || 'user'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const helpContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">Interview Summary</h3>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          This page shows a complete summary of your interview session, including:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>The persona you chose to interview</li>
          <li>The question you wrote during the session</li>
          <li>The final question selected by your group</li>
          <li>AI feedback on the selected question</li>
          <li>Your complete interview transcript</li>
          <li>AI evaluation of your interview performance</li>
        </ul>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> You can copy the summary to clipboard or download it as a text file for future reference.
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <LoadingPage
        type="ai-evaluation"
        title="Preparing your interview summary..."
        subtitle="Gathering all your session data"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Summary</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={onBack}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6">
      <HelpButton content={helpContent} title="Interview Summary Help" />
      
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Interview Session Summary</h1>
            <div className="flex gap-3">
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? 'Copied!' : 'Copy Summary'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{summaryData?.sessionDetails?.created_at ? new Date(summaryData.sessionDetails.created_at).toLocaleDateString() : 'Unknown Date'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{guest?.guestName || 'Unknown User'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{summaryData?.sessionDetails?.session_name || 'Unnamed Session'}</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* 1. Chosen Persona */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">1. Chosen Persona</h2>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-800 font-medium mb-2">
                Persona {summaryData?.chosenPersona || 'Unknown'}
              </p>
              <p className="text-purple-700 text-sm">
                {formatPersona(summaryData?.chosenPersona, summaryData?.sessionDetails?.scenario_data)}
              </p>
            </div>
          </div>

          {/* 2. Written Question */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">2. Written Question</h2>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 italic">
                "{summaryData?.writtenQuestion || 'No question written by this user'}"
              </p>
            </div>
          </div>

          {/* 3. Selected Question */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">3. Selected Question</h2>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 italic">
                "{summaryData?.selectedQuestion || 'No question was selected for the interview'}"
              </p>
            </div>
          </div>

          {/* 4. AI Question Feedback */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">4. AI Question Feedback</h2>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg max-h-60 overflow-y-auto">
              {summaryData?.aiQuestionFeedback ? (
                <div className="space-y-3">
                  {/* Handle pre-evaluation format: {mistakes, response} */}
                  {summaryData.aiQuestionFeedback.processed_scores && 
                   typeof summaryData.aiQuestionFeedback.processed_scores.mistakes !== 'undefined' && 
                   summaryData.aiQuestionFeedback.processed_scores.response ? (
                    <div className="border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-yellow-800">Question Quality:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          summaryData.aiQuestionFeedback.processed_scores.mistakes 
                            ? 'text-red-700 bg-red-200' 
                            : 'text-green-700 bg-green-200'
                        }`}>
                          {summaryData.aiQuestionFeedback.processed_scores.mistakes || 'No Issues Found'}
                        </span>
                      </div>
                      <p className="text-yellow-700 text-sm">{summaryData.aiQuestionFeedback.processed_scores.response}</p>
                    </div>
                  ) : /* Handle post-evaluation format: [{standard, score, response}] */ 
                  summaryData.aiQuestionFeedback.processed_scores && Array.isArray(summaryData.aiQuestionFeedback.processed_scores) ? (
                    summaryData.aiQuestionFeedback.processed_scores.map((rubric, index) => (
                      <div key={index} className="border-b border-yellow-200 pb-2 last:border-b-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-yellow-800">{rubric.standard}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-700 font-bold">{rubric.score}/5</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < rubric.score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-yellow-700 text-sm">{rubric.response}</p>
                      </div>
                    ))
                  ) : (
                    /* Fallback: display raw AI response */
                    <div className="border border-yellow-200 rounded-lg p-3">
                      <span className="font-medium text-yellow-800 block mb-2">AI Feedback:</span>
                      <p className="text-yellow-700 text-sm">
                        {typeof summaryData.aiQuestionFeedback.ai_response === 'string' 
                          ? summaryData.aiQuestionFeedback.ai_response 
                          : summaryData.aiQuestionFeedback.ai_response?.content 
                          ? (typeof summaryData.aiQuestionFeedback.ai_response.content === 'string' 
                              ? summaryData.aiQuestionFeedback.ai_response.content 
                              : 'Complex AI response object - see console for details')
                          : 'Raw feedback data available but in unexpected format'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-yellow-800 italic">No AI feedback available for the question</p>
              )}
            </div>
          </div>
        </div>

        {/* 5. Interview Transcript */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">5. Interview Transcript</h2>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            {summaryData?.interviewTranscript && summaryData.interviewTranscript.messages ? (
              <div className="space-y-3">
                {summaryData.interviewTranscript.messages.map((message, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-indigo-200 ml-4' 
                      : 'bg-white mr-4 border border-indigo-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-indigo-800">
                        {message.sender === 'user' ? 'Interviewer' : 'Interviewee'}
                      </span>
                      <span className="text-xs text-indigo-600">{message.timestamp}</span>
                    </div>
                    <p className="text-indigo-700">{message.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-indigo-800 italic">No transcript available</p>
            )}
          </div>
        </div>

        {/* 6. AI Interview Feedback */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">6. AI Interview Feedback</h2>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg max-h-80 overflow-y-auto">
            {summaryData?.aiInterviewFeedback && summaryData.aiInterviewFeedback.processed_scores ? (
              <div className="space-y-4">
                {summaryData.aiInterviewFeedback.processed_scores.map((rubric, index) => (
                  <div key={index} className="border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-emerald-800">{rubric.standard}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-emerald-600">{rubric.score}/5</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < rubric.score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-emerald-700">{rubric.response}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-emerald-800 italic">No AI interview feedback available</p>
            )}
          </div>
        </div>

        {/* Complete Button */}
        <div className="flex justify-center">
          <button 
            onClick={onComplete}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-200 hover:transform hover:scale-105"
          >
            Complete Interview Training
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSummary;
