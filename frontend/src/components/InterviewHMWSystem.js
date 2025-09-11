import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { buildQna } from './buildQna';
import { useLocalGuest } from '../hooks/useLocalGuest';
import { useSession } from '../providers/SessionProvider';
import { useBackTrap } from '../hooks/useBackTrap.ts';

// Shared Components
import Home from './shared/Home';

// Collaborative Interview Components
import CollaborativeScenarioSelection from './interview/CollaborativeScenarioSelection';
import CollaborativeQuestionCreation from './interview/CollaborativeQuestionCreation';
import AIQuestionFeedback from './interview/AIQuestionFeedback';
import InterviewSession from './interview/InterviewSession';
import TranscriptReview from './interview/TranscriptReview';
import PeerTranscriptEvaluation from './interview/PeerTranscriptEvaluation';
import PostInterviewEvaluation from './interview/PostInterviewEvaluation';
import InterviewSummary from './interview/InterviewSummary';

// Collaborative POV/HMW Components
import NeedsInsights from './povhmw/NeedsInsights';
import CollaborativePovCreation from './povhmw/CollaborativePovCreation';
import PovAiFeedback from './povhmw/PovAiFeedback';
import CollaborativeHMWCreation from './povhmw/CollaborativeHMWCreation';
import FinalHmwAiFeedback from './povhmw/FinalHmwAiFeedback';

const InterviewHMWSystem = () => {
  useBackTrap(true);
  
  const {
    guest,
    ensureGuest,
    getSessionId,
    setSessionId: setLocalSessionId,
    clearSessionId,
  } = useLocalGuest();

  // Collaborative session management
  const { sessionId, ensureJoined, members, socket } = useSession();

  // Session Management
  const [localSessionId, _setLocalSessionId] = useState(getSessionId());
  
  // Navigation & UI State
  const [currentStep, setCurrentStep] = useState('home');
  const [sessionType, setSessionType] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // User Selection
  const [selectedScenario, setSelectedScenario] = useState(null);
  
  // Interview System State
  const [prePlannedQuestion, setPrePlannedQuestion] = useState('');
  const [selectedGroupQuestion, setSelectedGroupQuestion] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [qaHistory, setQaHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiScoreFeedback, setAiScoreFeedback] = useState([]);
  
  // POV/HMW System State
  const [needs, setNeeds] = useState(Array(3).fill(''));
  const [insights, setInsights] = useState(Array(3).fill(''));
  const [povStatement, setPovStatement] = useState('');
  const [selectedGroupPov, setSelectedGroupPov] = useState('');
  const [hmwQuestions, setHmwQuestions] = useState(Array(3).fill(''));
  const [selectedFinalHmwQuestions, setSelectedFinalHmwQuestions] = useState([]);
  
  // API State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [povLoading, setPovLoading] = useState(false);
  const [hmwLoading, setHmwLoading] = useState(false);
  const [povAIResult, setPovAIResult] = useState(null);
  const [hmwAIResults, setHmwAIResults] = useState({});
  const [apiError, setApiError] = useState(null);

  // ========================================
  // API FUNCTIONS
  // ========================================

  const personaSelection = async (tag) => {
    // Skip persona retrieval for collaborative sessions - personas are predefined
    console.log('👤 [InterviewHMWSystem] Persona selection:', tag, '(skipping API call for collaborative mode)');

  };

  const generateAIResponse = async (question) => {
    if (!question.trim()) return '';
    
    try {
      const isInit = qaHistory.length === 0;
      const transcript = await apiService.interview(isInit, question, selectedScenario.tag);
      const lastQA = Array.isArray(transcript)
        ? transcript[transcript.length - 1]
        : transcript;
      return lastQA?.answer ?? '';
    } catch (err) {
      setError(err.message || 'Unknown error');
      throw err;
    }
  };

  const evaluatePovStatement = async (statement) => {
    setPovLoading(true);
    setApiError(null);
    
    try {
      // Get current user info from session
      const currentUser = members?.find(m => m.socketId === socket?.id);
      const userId = currentUser?.userId;
      
      const result = await apiService.evaluatePovWithSession(
        statement,
        needs.filter(need => need.trim()),
        insights.filter(insight => insight.trim()),
        sessionId,
        userId
      );
      
      if (result.success) {
        setPovAIResult(result.result);
      } else {
        setApiError(result.error || 'Evaluation failed');
      }
    } catch (error) {
      setApiError('Failed to connect to evaluation service');
      console.error('POV evaluation error:', error);
    } finally {
      setPovLoading(false);
    }
  };

  const evaluateHMWQuestions = async (questions) => {
    setHmwLoading(true);
    setApiError(null);
    
    try {
      // Get current user info from session
      const currentUser = members?.find(m => m.socketId === socket?.id);
      const userId = currentUser?.userId;
      
      const result = await apiService.evaluateHmwWithSession(
        questions,
        needs.filter(need => need.trim()),
        insights.filter(insight => insight.trim()),
        selectedGroupPov,
        sessionId,
        userId
      );
      
      if (result.success) {
        setHmwAIResults(result.results);
      } else {
        setApiError(result.error || 'Evaluation failed');
      }
    } catch (error) {
      setApiError('Failed to connect to evaluation service');
      console.error('HMW evaluation error:', error);
    } finally {
      setHmwLoading(false);
    }
  };

  // ========================================
  // EFFECTS
  // ========================================

  useEffect(() => {
    if (localSessionId) setLocalSessionId(localSessionId);
  }, [localSessionId, setLocalSessionId]);

  // Pre-evaluation trigger
  useEffect(() => {
    if (currentStep === 'ai-question-feedback' && selectedGroupQuestion && selectedScenario) {
      console.log('🤖 [InterviewHMWSystem] Triggering pre-evaluation for:', selectedGroupQuestion);
      console.log('🤖 [InterviewHMWSystem] Using sessionId:', sessionId);
      setLoading(true);
      apiService.preEvaluation(selectedGroupQuestion, selectedScenario.tag, sessionId)
        .then(data => {
          setAiFeedback(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('❌ [InterviewHMWSystem] Pre-evaluation error:', err);
          setError(err);
          setLoading(false);
        });
    }
  }, [currentStep, selectedGroupQuestion, selectedScenario, sessionId]);

  // Post-evaluation trigger
  useEffect(() => {
    if (currentStep === 'post-interview-evaluation' && qaHistory.length > 0) {
      const qna = buildQna(qaHistory);
      setLoading(true);
      
      // Get current user info from session
      const currentUser = members?.find(m => m.socketId === socket?.id);
      const userId = currentUser?.userId;
      
      apiService.postInterview(qna, selectedScenario.tag, sessionId, userId)
        .then(data => {
          setAiScoreFeedback(data.result);
          setLoading(false);
        })
        .catch(err => {
          setError(err);
          setLoading(false);
        });
    }
  }, [currentStep, qaHistory, selectedScenario, sessionId, members, socket]);

  // POV evaluation trigger
  useEffect(() => {
    if (currentStep === 'pov-ai-feedback' && selectedGroupPov && !povAIResult && !povLoading) {
      evaluatePovStatement(selectedGroupPov);
    }
  }, [currentStep, selectedGroupPov, povAIResult, povLoading]);

  // HMW evaluation trigger
  useEffect(() => {
    if (currentStep === 'final-hmw-ai-feedback') {
      const questionsToEvaluate = selectedFinalHmwQuestions.filter(q => q.trim());
      
      if (questionsToEvaluate.length > 0 && Object.keys(hmwAIResults).length === 0 && !hmwLoading) {
        evaluateHMWQuestions(questionsToEvaluate);
      }
    }
  }, [currentStep, selectedFinalHmwQuestions, hmwAIResults, hmwLoading]);

  // ========================================
  // NAVIGATION FUNCTIONS
  // ========================================

  const navigateToStep = (step) => {
    console.log('🧭 [InterviewHMWSystem] navigateToStep called with:', step);
    console.log('🧭 [InterviewHMWSystem] Current step:', currentStep);
    
    setIsTransitioning(true);
    
    // Reset states based on step
    if (step === 'collaborative-question-creation') {
      setPrePlannedQuestion('');
      setChatMessages([]);
      setQaHistory([]);
      setSelectedGroupQuestion('');
    }
    
    if (step === 'interview-session') {
      setChatMessages([]);
    }
    
    if (step === 'hmw-needs-insights') {
      setNeeds(Array(3).fill(''));
      setInsights(Array(3).fill(''));
      setPovStatement('');
      setSelectedGroupPov('');
      setHmwQuestions(Array(3).fill(''));
      setSelectedFinalHmwQuestions([]);
    }
    
    if (step === 'collaborative-pov-creation') {
      setPovStatement('');
      setSelectedGroupPov('');
      setPovAIResult(null);
      setApiError(null);
    }
    
    if (step === 'pov-ai-feedback') {
      setPovAIResult(null);
      setApiError(null);
    }
    
    if (step === 'collaborative-hmw-creation') {
      setHmwQuestions(Array(3).fill(''));
      setSelectedFinalHmwQuestions([]);
      setHmwAIResults({});
      setApiError(null);
    }
    
    if (step === 'final-hmw-ai-feedback') {
      setHmwAIResults({});
      setApiError(null);
    }
    
    setTimeout(() => {
      console.log('🔄 [InterviewHMWSystem] Setting current step to:', step);
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 150);
  };

  // ========================================
  // HANDLER FUNCTIONS
  // ========================================

  const handleStartInterview = () => {
    setSelectedScenario(null);
    setSessionType('interview');
    navigateToStep('scenario-selection');
  };

  const handleStartHMW = () => {
    setSelectedScenario(null);
    setSessionType('hmw');
    navigateToStep('hmw-needs-insights');
  };

  const handleScenarioSelection = async (scenario) => {
    console.log('🎯 [InterviewHMWSystem] handleScenarioSelection called with:', scenario);
    console.log('🎯 [InterviewHMWSystem] Current sessionType:', sessionType);
    
    setSelectedScenario(scenario);
    
    // Save interview session data immediately when scenario is selected
    if (sessionId && scenario) {
      try {
        console.log('💾 [InterviewHMWSystem] Saving interview session data for scenario:', scenario.tag);
        await apiService.saveInterviewSessionData(sessionId, scenario.tag, scenario);
      } catch (error) {
        console.error('❌ [InterviewHMWSystem] Failed to save interview session data:', error);
        // Don't block the flow, just log the error
      }
    }
    
    if (sessionType === 'interview') {
      console.log('✅ [InterviewHMWSystem] Navigating to collaborative-question-creation');
      navigateToStep('collaborative-question-creation');
    } else {
      console.log('✅ [InterviewHMWSystem] Navigating to hmw-needs-insights');
      navigateToStep('hmw-needs-insights');
    }
  };

  const handleGroupQuestionSelection = (question) => {
    setSelectedGroupQuestion(question);
    navigateToStep('ai-question-feedback');
  };

  const handleNeedsInsightsSubmit = (data) => {
    setNeeds(data.needs);
    setInsights(data.insights);
    navigateToStep('collaborative-pov-creation');
  };

  const handlePovGroupSelection = (statement) => {
    setSelectedGroupPov(statement);
    navigateToStep('pov-ai-feedback');
  };

  const handleHMWGroupSelection = (questions) => {
    setSelectedFinalHmwQuestions(questions);
    navigateToStep('final-hmw-ai-feedback');
  };

  const handleCompleteSession = () => {
    navigateToStep('home');
  };

  // ========================================
  // RENDER FUNCTION
  // ========================================

  const renderCurrentStep = () => {
    const stepComponents = {
      'home': () => (
        <Home 
          onStartInterview={handleStartInterview}
          onStartHMW={handleStartHMW}
        />
      ),
      'scenario-selection': () => (
        <CollaborativeScenarioSelection 
          onBack={() => navigateToStep('home')}
          onContinue={handleScenarioSelection}
          onPersonaSelection={personaSelection}
        />
      ),
      'collaborative-question-creation': () => (
        <CollaborativeQuestionCreation 
          selectedScenario={selectedScenario}
          onBack={() => navigateToStep('scenario-selection')}
          onContinue={handleGroupQuestionSelection}
        />
      ),
      'ai-question-feedback': () => (
        <AIQuestionFeedback 
          selectedGroupQuestion={selectedGroupQuestion}
          selectedScenario={selectedScenario}
          aiFeedback={aiFeedback}
          loading={loading}
          error={error}
          onBack={() => navigateToStep('collaborative-question-creation')}
          onContinue={() => navigateToStep('interview-session')}
        />
      ),
      'interview-session': () => (
        <InterviewSession 
          selectedScenario={selectedScenario}
          selectedGroupQuestion={selectedGroupQuestion}
          onBack={() => navigateToStep('ai-question-feedback')}
          onContinue={(messages) => {
            setChatMessages(messages);
            navigateToStep('transcript-review');
          }}
          generateAIResponse={generateAIResponse}
          onUpdateQaHistory={setQaHistory}
        />
      ),
      'transcript-review': () => (
        <TranscriptReview 
          chatMessages={chatMessages}
          selectedGroupQuestion={selectedGroupQuestion}
          selectedScenario={selectedScenario}
          onBack={() => navigateToStep('interview-session')}
          onContinue={async () => {
            // Check if all interviews are complete before allowing navigation
            if (sessionId) {
              try {
                // Convert members to the format expected by the API
                const participants = members.map(member => ({
                  userId: member.userId,
                  userName: member.userName
                }));
                
                const completionStatus = await apiService.checkInterviewCompletionStatusWithParticipants(sessionId, participants);
                if (completionStatus.allCompleted) {
                  navigateToStep('peer-transcript-evaluation');
                } else {
                  // Show alert that we need to wait
                  alert(`Please wait for all group members to complete their interviews. Currently ${completionStatus.completedInterviews} of ${completionStatus.totalParticipants} are done.`);
                }
              } catch (error) {
                console.warn('Failed to check completion status:', error);
                // Fallback to the old method
                try {
                  const completionStatus = await apiService.checkInterviewCompletionStatus(sessionId);
                  if (completionStatus.allCompleted) {
                    navigateToStep('peer-transcript-evaluation');
                  } else {
                    alert(`Please wait for all group members to complete their interviews. Currently ${completionStatus.completedInterviews} of ${completionStatus.totalParticipants} are done.`);
                  }
                } catch (fallbackError) {
                  console.warn('Fallback completion status check also failed:', fallbackError);
                  // Allow navigation anyway if check fails
                  navigateToStep('peer-transcript-evaluation');
                }
              }
            } else {
              // No session ID, allow navigation
              navigateToStep('peer-transcript-evaluation');
            }
          }}
        />
      ),
      'peer-transcript-evaluation': () => (
        <PeerTranscriptEvaluation 
          chatMessages={chatMessages}
          selectedGroupQuestion={selectedGroupQuestion}
          selectedScenario={selectedScenario}
          onBack={() => navigateToStep('transcript-review')}
          onContinue={() => navigateToStep('post-interview-evaluation')}
        />
      ),
      'post-interview-evaluation': () => (
        <PostInterviewEvaluation 
          aiScoreFeedback={aiScoreFeedback}
          loading={loading}
          onBack={() => navigateToStep('peer-transcript-evaluation')}
          onComplete={() => navigateToStep('interview-summary')}
        />
      ),
      'interview-summary': () => (
        <InterviewSummary 
          onBack={() => navigateToStep('post-interview-evaluation')}
          onComplete={handleCompleteSession}
        />
      ),
      'hmw-needs-insights': () => (
        <NeedsInsights 
          onBack={() => navigateToStep('home')}
          onContinue={handleNeedsInsightsSubmit}
        />
      ),
      'collaborative-pov-creation': () => (
        <CollaborativePovCreation 
          needs={needs}
          insights={insights}
          onBack={() => navigateToStep('hmw-needs-insights')}
          onContinue={handlePovGroupSelection}
        />
      ),
      'pov-ai-feedback': () => (
        <PovAiFeedback 
          selectedGroupPov={selectedGroupPov}
          needs={needs}
          insights={insights}
          povAIResult={povAIResult}
          povLoading={povLoading}
          apiError={apiError}
          onBack={() => navigateToStep('collaborative-pov-creation')}
          onContinue={() => navigateToStep('collaborative-hmw-creation')}
          onRetryEvaluation={() => evaluatePovStatement(selectedGroupPov)}
        />
      ),
      'collaborative-hmw-creation': () => (
        <CollaborativeHMWCreation 
          needs={needs}
          insights={insights}
          povStatement={selectedGroupPov}
          onBack={() => navigateToStep('pov-ai-feedback')}
          onContinue={handleHMWGroupSelection}
        />
      ),
      'final-hmw-ai-feedback': () => (
        <FinalHmwAiFeedback 
          selectedFinalHmwQuestions={selectedFinalHmwQuestions}
          selectedGroupPov={selectedGroupPov}
          hmwAIResults={hmwAIResults}
          hmwLoading={hmwLoading}
          apiError={apiError}
          onBack={() => navigateToStep('collaborative-hmw-creation')}
          onComplete={handleCompleteSession}
          onRetryEvaluation={() => evaluateHMWQuestions(selectedFinalHmwQuestions.filter(q => q.trim()))}
        />
      )
    };
    
    const Component = stepComponents[currentStep];
    return Component ? Component() : stepComponents['home']();
  };

  return (
    <div className="font-sans min-h-screen">
      <div className={`transition-all duration-300 ${
        isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
      }`}>
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default InterviewHMWSystem;
