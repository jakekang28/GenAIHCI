import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock } from 'lucide-react';
import { scenarioPersonaPairs } from './constants';
import { useSession } from '../../providers/SessionProvider';

const ScenarioVotingComponent = ({ 
  onVotingComplete,
  onVotingStarted 
}) => {
  const { sessionId, members, socket } = useSession();
  const [votingState, setVotingState] = useState('waiting'); // types: 'waiting', 'active', 'complete'
  const [votes, setVotes] = useState({}); // { scenarioId: voteCount }
  const [myVote, setMyVote] = useState(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleVotingStarted = (data) => {
      console.log('[ScenarioVotingComponent] Voting started:', data);
      setVotingState('active');
      setVotes({});
      setMyVote(null);
      setTotalVotes(0);
      if (onVotingStarted) onVotingStarted(data);
    };

    const handleVoteProgress = (data) => {
      console.log('[ScenarioVotingComponent] Vote progress:', data);
      if (data.votes) {
        setVotes(data.votes);
        setTotalVotes(data.totalVotes || 0);
      }
    };

    const handleVotingComplete = (data) => {
      console.log('[ScenarioVotingComponent] Voting complete:', data);
      setVotingState('complete');
      
      // Backend returns string ("1"), frontend scenarios returns number id (1, 2, 3, 4)
      const winnerScenarioId = parseInt(data.winner?.id) || data.winner?.id;
      console.log('[ScenarioVotingComponent] Looking for scenario with ID:', winnerScenarioId);
      
      const winnerScenario = scenarioPersonaPairs.find(pair => pair.id === winnerScenarioId);
      console.log('[ScenarioVotingComponent] Found winner scenario:', winnerScenario);

      if (winnerScenario) {
        setWinner(winnerScenario);
        setTimeout(() => {
          if (onVotingComplete) onVotingComplete(winnerScenario, data.results);
        }, 2000); // Show results for 2 seconds
      } else {
        console.error('[ScenarioVotingComponent] Could not find scenario with ID:', winnerScenarioId);
        console.log('[ScenarioVotingComponent] Available scenarios:', scenarioPersonaPairs.map(p => ({ id: p.id, name: p.persona.name })));
      }
    };

    socket.on('room:voting_started', handleVotingStarted);
    socket.on('room:vote_progress', handleVoteProgress);
    socket.on('room:voting_complete', handleVotingComplete);

    return () => {
      socket.off('room:voting_started', handleVotingStarted);
      socket.off('room:vote_progress', handleVoteProgress);
      socket.off('room:voting_complete', handleVotingComplete);
    };
  }, [socket, onVotingStarted, onVotingComplete]);

  const handleCardClick = (scenario) => {
    if (votingState !== 'active' || myVote) return;

    // Frontend scenarios use numeric IDs (1, 2, 3, 4), backend expects them as strings
    const backendScenarioId = scenario.id.toString();
    console.log('[ScenarioVotingComponent] Submitting vote for:', backendScenarioId, 'scenario:', scenario);
    
    setMyVote(scenario.id);
    
    socket.emit('room:vote', {
      roomId: sessionId,
      type: 'scenario_selection',
      optionIds: [backendScenarioId] // Send as array as expected by backend
    });
  };

  const getVoteCount = (scenarioId) => {
    // Backend uses string IDs for vote tracking
    const voteKey = scenarioId.toString();
    return votes[voteKey] || 0;
  };

  const getVotePercentage = (scenarioId) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(scenarioId) / totalVotes) * 100);
  };

  if (votingState === 'waiting') {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-12 w-12 mb-4 text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Preparing to Vote</h3>
        <p className="text-gray-500">Waiting for voting to begin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voting Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {votingState === 'complete' ? 'Voting Complete!' : 'Cast Your Vote'}
        </h2>
        <p className="text-gray-600 mb-4">
          {votingState === 'complete' 
            ? 'Your team has selected the scenario' 
            : 'Click on a scenario card to vote'
          }
        </p>
        
        {/* Vote Progress */}
        <div className="bg-purple-50 rounded-lg p-4 mb-6 inline-block">
          <div className="flex items-center space-x-4">
            <Users className="h-5 w-5 text-purple-600" />
            <span className="text-purple-800 font-medium">
              Votes: {totalVotes}/{members.length}
            </span>
            {myVote && (
              <span className="text-sm text-purple-600">✓ You voted</span>
            )}
          </div>
        </div>
      </div>

      {/* Scenario Cards with Voting */}
      <div className="grid lg:grid-cols-2 gap-8">
        {scenarioPersonaPairs.map((pair, index) => {
          const voteCount = getVoteCount(pair.id);
          const percentage = getVotePercentage(pair.id);
          const hasVoted = myVote === pair.id;
          const isWinner = winner?.id === pair.id;
          const canVote = votingState === 'active' && !myVote;

          return (
            <div 
              key={pair.id}
              className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ${
                isWinner 
                  ? 'border-purple-500 bg-purple-50 shadow-xl ring-4 ring-purple-200' 
                  : hasVoted
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : canVote
                  ? 'border-gray-200 hover:border-purple-300 hover:shadow-xl cursor-pointer'
                  : 'border-gray-200'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleCardClick(pair)}
            >
              {/* Winner Badge */}
              {isWinner && (
                <div className="bg-purple-600 text-white text-center py-2 rounded-t-2xl">
                  <span className="font-bold">🏆 WINNER</span>
                </div>
              )}

              {/* Vote Status Badge */}
              {hasVoted && !isWinner && (
                <div className="bg-blue-600 text-white text-center py-2 rounded-t-2xl">
                  <span className="font-bold">✓ YOUR VOTE</span>
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
                  {(hasVoted || isWinner) && (
                    <CheckCircle className={`w-6 h-6 flex-shrink-0 ${
                      isWinner ? 'text-purple-600' : 'text-blue-600'
                    }`} />
                  )}
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
                {votingState === 'active' || votingState === 'complete' ? (
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
                          isWinner ? 'bg-purple-600' : hasVoted ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  canVote && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                      <p className="text-purple-600 font-medium text-sm">
                        👆 Click to vote for this scenario
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voting Instructions */}
      {votingState === 'active' && !myVote && (
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            💡 Click on any scenario card above to cast your vote
          </p>
        </div>
      )}
    </div>
  );
};

export default ScenarioVotingComponent;
