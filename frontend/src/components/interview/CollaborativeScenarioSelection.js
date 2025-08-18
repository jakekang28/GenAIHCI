import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Users, CheckCircle, Clock } from 'lucide-react';
import { scenarioPersonaPairs } from '../shared/constants';
import ScenarioVotingComponent from '../shared/ScenarioVotingComponent';
import { useSession } from '../../providers/SessionProvider';

const CollaborativeScenarioSelection = ({ onBack, onContinue, onPersonaSelection }) => {
  const { sessionId, members, socket } = useSession();
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [winner, setWinner] = useState(null);
  const [results, setResults] = useState([]);
  const [countdown, setCountdown] = useState(3);
  // Auto-start voting when component mounts
  useEffect(() => {
    if (socket && sessionId) {
      console.log('[CollaborativeScenarioSelection] Auto-starting scenario voting');
      
      // Small delay to ensure socket is fully connected
      setTimeout(() => {
        socket.emit('room:start_voting', {
          roomId: sessionId,
          type: 'scenario_selection',
          maxSelections: 1
        });
      }, 500);
    }
  }, [socket, sessionId]);

  const handleVotingStarted = () => {
    console.log('[CollaborativeScenarioSelection] Voting started');
  };

  const handleVotingComplete = (winner, results) => {
    console.log('[CollaborativeScenarioSelection] Voting complete! Winner:', winner);
    console.log('[CollaborativeScenarioSelection] Results:', results);
    
    setWinner(winner);
    setResults(results);
    setSelectedScenario(winner);
    setShowResults(true);
    
    if (onPersonaSelection && winner.tag) {
      console.log('👤 [CollaborativeScenarioSelection] Calling onPersonaSelection with tag:', winner.tag);
      onPersonaSelection(winner.tag);
    }
    
        // Auto-continue after showing results briefly
    console.log('[CollaborativeScenarioSelection] Setting up auto-continue with winner:', winner);
    console.log('[CollaborativeScenarioSelection] onContinue function:', onContinue);
    
    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          console.log('[CollaborativeScenarioSelection] Auto-continuing after countdown');
          if (onContinue) {
            onContinue(winner);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleManualContinue = () => {
    console.log('▶[CollaborativeScenarioSelection] Manual continue clicked with winner:', winner);
    if (winner && onContinue) {
      onContinue(winner);
    }
  };

    if (showResults && winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Voting Complete!</h1>
            <p className="text-xl text-gray-600">Your team has selected the scenario</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {scenarioPersonaPairs.map((pair, index) => {
              const voteResult = results.find(r => r.contribution?.id === pair.id || r.option_id === pair.id);
              const voteCount = voteResult?.vote_count || 0;
              const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isWinner = winner.id === pair.id;
              
              return (
                <div 
                  key={pair.id}
                  className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ${
                    isWinner 
                      ? 'border-purple-500 bg-purple-50 shadow-xl ring-4 ring-purple-200' 
                      : 'border-gray-200'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {isWinner && (
                    <div className="bg-purple-600 text-white text-center py-2 rounded-t-2xl">
                      <span className="font-bold">WINNER</span>
                    </div>
                  )}
                  
                  {/* Persona Section */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl flex-shrink-0">{pair.persona.image}</div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-800 mb-1">{pair.persona.name}</h4>
                        <p className="text-purple-600 font-semibold text-sm mb-2">{pair.persona.role}</p>
                        <p className="text-gray-600 text-sm leading-relaxed">{pair.persona.description}</p>
                      </div>
                      {isWinner && <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0" />}
                    </div>
                  </div>
                  
                  {/* Scenario Section */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 leading-relaxed">
                      {pair.description}
                    </h3>
                    
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-semibold text-blue-800">Context:</span> {pair.context}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-semibold text-blue-800">Sample Scenario:</span> {pair.scenario}
                        </p>
                      </div>
                    </div>

                    {/* Vote Results */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Votes received:</span>
                        <span className="font-semibold text-gray-800">
                          {voteCount} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isWinner ? 'bg-purple-600' : 'bg-gray-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            {countdown > 0 ? (
              <div className="bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Continuing with {winner.persona.name} in {countdown}...
              </div>
            ) : (
              <button
                onClick={handleManualContinue}
                className="bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                Continue with {winner.persona.name}
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-in-left">
          <div className="flex items-center text-purple-600">
            <Users className="w-5 h-5 mr-2" />
            {members.length} members
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Vote for Your Scenario & Persona</h1>
          <p className="text-xl text-gray-600">Review the scenarios below and vote for your team's choice</p>
        </div>
        
        {/* Custom Scenario Voting Component */}
        <ScenarioVotingComponent
          onVotingStarted={handleVotingStarted}
          onVotingComplete={handleVotingComplete}
        />
      </div>
    </div>
  );
};

export default CollaborativeScenarioSelection;