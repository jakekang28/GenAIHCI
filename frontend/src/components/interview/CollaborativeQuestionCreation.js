import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Users, Clock, Lightbulb } from 'lucide-react';
import VotingComponent from '../shared/VotingComponent';
import { useSession } from '../../providers/SessionProvider';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
const CollaborativeQuestionCreation = ({ selectedScenario, onBack, onContinue }) => {
  const { sessionId, members, socket } = useSession();
  const [myQuestion, setMyQuestion] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [phase, setPhase] = useState('create'); // types: 'create', 'voting', 'results'
  const [votingStarted, setVotingStarted] = useState(false);
  const [resetAt, setResetAt] = useState(0);
  useBackTrap(true)
  useEffect(() => {
  if (!socket) return;
  const onTypeReset = (d) => {
    if (d?.type !== 'interview_question') return;
    // 리셋 기준 시각 저장
    setResetAt(Date.now());
    // 로컬 상태 초기화
    setContributions([]);
    setHasSubmitted(false);
    setMyQuestion('');
    setPhase('create');
    setVotingStarted(false);
  };
  socket.on('room:type_reset', onTypeReset);
  return () => socket.off('room:type_reset', onTypeReset);
}, [socket]);
  useEffect(() => {
    if (!socket) return;

    // Listen for contributions from other members
    const handleContributions = (data) => {
  if (data.type !== 'interview_question') return;
  const list = Array.isArray(data.contributions) ? data.contributions : [];
  const filtered = resetAt
    ? list.filter((c) => {
        const t = Date.parse(c?.timestamp || '') || 0;
        return t >= resetAt;
      })
    : list;

  setContributions(filtered);
};

    const handlePhaseChange = (data) => {
      if (data.stage) {
        setPhase(data.stage);
      }
    };

    const handleVotingStarted = (data) => {
      console.log('[CollaborativeQuestionCreation] room:voting_started received:', data);
      if (data.type === 'interview_question') {
        console.log('[CollaborativeQuestionCreation] Switching to voting phase');
        setPhase('voting');
        setVotingStarted(true);
        
        // Update contributions from the voting event if available
        if (data.contributions) {
          console.log('[CollaborativeQuestionCreation] Updating contributions from voting event');
          setContributions(data.contributions);
        }
      }
    };

    socket.on('room:contributions', handleContributions);
    socket.on('room:stage', handlePhaseChange);
    socket.on('session:stage', handlePhaseChange); // Legacy support
    socket.on('room:voting_started', handleVotingStarted);

    return () => {
      socket.off('room:contributions', handleContributions);
      socket.off('room:stage', handlePhaseChange);
      socket.off('session:stage', handlePhaseChange);
      socket.off('room:voting_started', handleVotingStarted);
    };
  }, [socket]);

  const submitQuestion = () => {
    if (!socket || !myQuestion.trim()) return;

    const contribution = {
      roomId: sessionId,
      type: 'interview_question',
      content: {
        question: myQuestion.trim(),
        scenario: selectedScenario?.description || 'Unknown Scenario',
        context: `Question for ${selectedScenario?.persona?.name || 'persona'} interview`
      },
      saveToDb: true
    };

    socket.emit('room:contribution:submit', contribution);
    setHasSubmitted(true);
  };
  const extractQuestionText = (winnerLike) => {
    if (!winnerLike) return '';
    const node = winnerLike.contribution || winnerLike; 
    const content = node?.content;
    if (typeof content === 'string') return content;
    if (content?.question) return content.question;
    if (typeof node === 'string') return node;
    return '';
  };
  const handleVotingComplete = (winner, results) => {
    console.log('Voting complete:', winner);
    console.log('Voting results:', results);
    
    // Extract the question content from the winner
    let questionContent = extractQuestionText(winner);
    if (!questionContent && Array.isArray(results) && results.length) {
      questionContent = extractQuestionText(results[0]);
    }

    if (!questionContent) {
      console.error('Could not extract question content from winner/results:', { winner, results });
      return;
    }

    console.log('Extracted question content:', questionContent);
    onContinue(questionContent);
  };

  const startVoting = () => {
    console.log('[CollaborativeQuestionCreation] Starting voting with contributions:', contributions);
    console.log('[CollaborativeQuestionCreation] Voting already started?', votingStarted);
    
    if (!socket || votingStarted) {
      console.log('[CollaborativeQuestionCreation] Cannot start voting - no socket or already started');
      return;
    }
    
    setVotingStarted(true);
    socket.emit('room:start_voting', {
      roomId: sessionId,
      type: 'interview_question',
      maxSelections: 1
    });
    
    console.log('[CollaborativeQuestionCreation] Voting start request sent');
  };

  const renderQuestionList = () => {
    if (contributions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Waiting for team members to submit their questions...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Team Questions ({contributions.length}/{members.length})
        </h3>
        {contributions.map((contribution, index) => (
          <div key={contribution.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Users className="h-5 w-5 text-blue-500 mt-1" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 mb-1">
                  {contribution.userName || 'Team Member'}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {contribution.content?.question || contribution.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCreatePhase = () => {
    console.log('🎯 [CollaborativeQuestionCreation] Render state:', {
      contributions: contributions.length,
      members: members.length,
      hasSubmitted,
      phase
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-right">
            <p className="text-sm text-gray-600">Room: {localStorage.getItem('roomCode') || sessionId?.slice(-6)?.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">{members.length} members</p>
          </div>
        </div>

        {/* Selected Scenario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Selected Scenario</h2>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            {/* Persona Section */}
            <div className="flex items-start space-x-4 mb-4">
              <div className="text-3xl flex-shrink-0">{selectedScenario?.persona?.image}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 mb-1">{selectedScenario?.persona?.name} - {selectedScenario?.persona?.role}</h3>
                <p className="text-blue-700 text-sm leading-relaxed">{selectedScenario?.persona?.description}</p>
              </div>
            </div>
            
            {/* Scenario Section */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-blue-800 text-sm mb-1">Scenario Question:</h4>
                <p className="text-blue-700 text-sm leading-relaxed">{selectedScenario?.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 text-sm mb-1">Context:</h4>
                <p className="text-blue-700 text-sm leading-relaxed">{selectedScenario?.context}</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 text-sm mb-1">Sample Scenario:</h4>
                <p className="text-blue-700 text-sm leading-relaxed">{selectedScenario?.scenario}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Question Creation Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 text-blue-600 mr-2" />
              Create Your Interview Question
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Interview Question
                </label>
                <textarea
                  value={myQuestion}
                  onChange={(e) => setMyQuestion(e.target.value)}
                  placeholder="Write a thoughtful interview question for this scenario..."
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={hasSubmitted}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">💡 Tips for Good Questions:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Be specific and relevant to the scenario</li>
                  <li>• Encourage detailed responses</li>
                  <li>• Avoid yes/no questions</li>
                  <li>• Consider the persona's background</li>
                </ul>
              </div>

              <button
                onClick={submitQuestion}
                disabled={!myQuestion.trim() || hasSubmitted}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {hasSubmitted ? (
                  <>
                    <span>✓ Question Submitted</span>
                  </>
                ) : (
                  <>
                    <span>Submit Question</span>
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Team Questions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Team Questions</h2>
              {contributions.length >= members.length && (
                <button
                  onClick={startVoting}
                  disabled={votingStarted}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    votingStarted 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {votingStarted ? 'Voting Started' : 'Start Voting'}
                </button>
              )}
            </div>
            
            {renderQuestionList()}
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderVotingPhase = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Vote for the Best Interview Question
          </h1>
          <p className="text-gray-600">
            Choose the question that will lead to the most insightful interview
          </p>
        </div>

        <VotingComponent
          roomId={sessionId}
          contributions={contributions}
          type="interview_question"
          title="Vote for the Best Interview Question"
          subtitle="Consider which question will provide the most valuable insights for the interview"
          maxSelections={1}
          onVotingComplete={handleVotingComplete}
        />
        {console.log('🔍 [CollaborativeQuestionCreation] Passing contributions to VotingComponent:', contributions)}
      </div>
    </div>
  );

  // Render based on current phase
  switch (phase) {
    case 'voting':
      return renderVotingPhase();
    case 'create':
    default:
      return renderCreatePhase();
  }
};

export default CollaborativeQuestionCreation;
