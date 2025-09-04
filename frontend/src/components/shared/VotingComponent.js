import React, { useState, useEffect } from 'react';
import { useSession } from '../../providers/SessionProvider';
import { CheckCircle, Users, Clock, Trophy, Vote } from 'lucide-react';

const VotingComponent = ({ 
  roomId, 
  contributions = [], 
  options = [],
  type, 
  title = "Vote for the best option",
  subtitle = "",
  maxSelections = 1,
  onVotingComplete,
  onVotingStarted,
  showDetailedOptions = false,
  onStartVotingClick,
  deferParentOnComplete = true,
  resultsPrimaryActionLabel = 'Continue',
  onResultsPrimaryAction
}) => {
  const { socket } = useSession();
  
  console.log(`🚀 [VotingComponent] Initialized with:`, {
    type,
    roomId,
    contributionsLength: contributions.length,
    optionsLength: options.length,
    hasSocket: !!socket
  });
  // Determine if we're using predefined options or contributions
  const usingPredefinedOptions = options.length > 0;
  
  const [votingState, setVotingState] = useState(usingPredefinedOptions ? 'voting' : 'waiting'); // types: 'waiting', 'voting', 'results', 'tie'
  const [activeContributions, setActiveContributions] = useState(contributions);
  
  // Use either predefined options or active contributions
  const votingOptions = usingPredefinedOptions ? options : activeContributions;
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteProgress, setVoteProgress] = useState({ totalVotes: 0, totalMembers: 0 });
  const [votingSessionId, setVotingSessionId] = useState(null);
  const [results, setResults] = useState([]);
  const [tieMessage, setTieMessage] = useState('');
  const [localVotes, setLocalVotes] = useState({}); // For predefined options voting
  const [finalWinner, setFinalWinner] = useState(null);
  const getContext = (entry) =>{
    if(!entry) return
    const payload = entry.contribution ?? entry;
    const c = payload?.content
    if (typeof c === 'string') return c;
    return c?.statement ?? c?.question ?? '';
  }
  // Update active contributions when contributions prop changes
  useEffect(() => {
    if (!usingPredefinedOptions) {
      setActiveContributions(contributions);
    }
  }, [contributions, usingPredefinedOptions]);

  useEffect(() => {
    console.log(`[VotingComponent] Setting up socket listeners for type: ${type}`, { 
    socket: !!socket, 
    votingState, 
    contributionsLength: activeContributions.length 
  });
    if (!socket) return;
    const dedupeByAuthor = (items) => {
     const map = new Map();
     for (const c of items || []) {
       const authorId =
         c?.authorId || c?.userId || c?.socketId || c?.content?.authorId;
       const key = authorId || c?.id || c?.socketId || Math.random();
       map.set(key, c);
     }
     return Array.from(map.values());
   };
    // Listen for voting events
    const handleVotingStarted = (data) => {
      console.log(`[VotingComponent] room:voting_started received:`, data);
      console.log(`🎯 [VotingComponent] Current type: ${type}, Event type: ${data.type}`);
      
      console.log(`[VotingComponent] Voting started for our type (${type})`);
      console.log(`[VotingComponent] Contributions in event:`, data.contributions);
      if (data?.type !== type) return;
      if (data?.roomId && data.roomId !== roomId) return;
      // Update contributions from the event if not using predefined options
      if (!usingPredefinedOptions && data.contributions) {
        console.log(`[VotingComponent] Updating active contributions from event`);
        const list = data.type === "hmw_question" ? data.contributions : dedupeByAuthor(data.contributions)
        setActiveContributions(list);
      }
      
      setVotingState('voting');
      setVotingSessionId(data.votingSessionId);
      setHasVoted(false);
      setSelectedOptions([]);
      setVoteProgress({ totalVotes: 0, totalMembers: 0 });
      if (onVotingStarted) onVotingStarted(data);
       
    };

    const handleVoteProgress = (data) => {
      console.log(`[VotingComponent] room:vote_progress received:`, data);
      if (data?.type !== type) return;
      if (data?.roomId && data.roomId !== roomId) return;
      console.log(`[VotingComponent] Progress for our voting type (${type})`);
      setVoteProgress({
        totalVotes: data.totalVotes,
        totalMembers: data.totalMembers
      });
      
    };

    const handleVotingComplete = (data) => {
      if (data?.type !== type) return;
      if (data?.roomId && data.roomId !== roomId) return;
      if (data?.isTie) {
        const res = data.results || [];
        const total = res.reduce((s, r) => s + (r.vote_count || 0), 0);
        const max = Math.max(0, ...res.map(r => r.vote_count || 0));
        const tiedCount = res.filter(r => (r.vote_count || 0) === max).length;
        setResults(res);
        setTieMessage(`Tie detected! ${tiedCount} options tied with ${max} vote(s). Click Revote to try again.`);
        setVotingState('tie');
        return
      }
      const res = data.results || [];
      setVotingState('results');
      setFinalWinner(data.winner || res[0] || null);
      setResults(data.results || []);
      if (!deferParentOnComplete &&onVotingComplete) {
        if (maxSelections > 1) {
          const topResults = (data.results || [])
          .sort((a, b) => b.vote_count - a.vote_count)
          .slice(0, maxSelections)
          .map(r => r.contribution);
          onVotingComplete(topResults, data.results || []);
        } else {
          onVotingComplete(data.winner, data.results || []);
        }
      }
    };

    const handleVotingTie = (data) => {
        if (!data) return;
        if (data?.roomId && data.roomId !== roomId) return;
        if (data?.votingSessionId && data.votingSessionId !== votingSessionId) return;
        setVotingState('tie');
        setResults(data.results);
        const tied = data.tiedContributions?.length ?? 0;
        setTieMessage(`Tie detected! ${tied} options tied. Click Revote to try again.`);
    };

    const handleRevoteStarted = (data) => {
      if (data?.type !== type) return;
      if (data?.roomId && data.roomId !== roomId) return;
      setVotingState('voting');
      setVotingSessionId(data.votingSessionId);
      setHasVoted(false);
      setSelectedOptions([]);
      setVoteProgress({ totalVotes: 0, totalMembers: 0 });
      setTieMessage('');
      
    };

    socket.on('room:voting_started', handleVotingStarted);
    socket.on('room:vote_progress', handleVoteProgress);
    socket.on('room:voting_complete', handleVotingComplete);
    socket.on('room:voting_tie', handleVotingTie);
    socket.on('room:revote_started', handleRevoteStarted);

    return () => {
      socket.off('room:voting_started', handleVotingStarted);
      socket.off('room:vote_progress', handleVoteProgress);
      socket.off('room:voting_complete', handleVotingComplete);
      socket.off('room:voting_tie', handleVotingTie);
      socket.off('room:revote_started', handleRevoteStarted);
    };
  }, [socket, type, roomId, votingSessionId, onVotingComplete, onVotingStarted]);

  const startVoting = () => {
    const payload = {roomId, type, maxSelections}
    if(onStartVotingClick){
      onStartVotingClick(payload)
      return;
    }
    if(socket && roomId){
      console.log(`[VotingComponent] Emitting room:start_voting:`, payload);
      socket.emit('room:start_voting', payload);
    }else{
      console.log(`[VotingComponent] Cannot start voting:`, { hasSocket: !!socket, roomId });
    }
  };

  const submitVote = () => {
    console.log(`[VotingComponent] submitVote called:`, {
      hasSocket: !!socket,
      selectedOptionsLength: selectedOptions.length,
      votingSessionId,
      roomId,
      usingPredefinedOptions
    });
    // Validate that user has selected exactly the required number of options
    if (selectedOptions.length !== maxSelections) {
      console.log(`[VotingComponent] Invalid selection count: ${selectedOptions.length}/${maxSelections}`);
      return;
    }
    if (usingPredefinedOptions) {
      // For predefined options, handle voting locally
      console.log(`[VotingComponent] Handling predefined options vote locally`);
      setHasVoted(true);
      
      // For now, just select the first option (could implement more sophisticated voting later)
      const winner = selectedOptions[0];
      console.log(`[VotingComponent] Local voting complete, winner:`, winner);
      
      // Call completion callback
      if (onVotingComplete) {
        onVotingComplete(winner, selectedOptions);
      }
    } else if (socket && votingSessionId) {
      // Submit votes for backend-tracked contributions
      const optionIds = selectedOptions.map(opt => opt.id || opt.socketId || opt);
      const votePayload = { roomId, type, optionIds };
      console.log(`[VotingComponent] Emitting room:vote:`, votePayload);
      socket.emit('room:vote', votePayload);
      setHasVoted(true);
    } else {
      console.log(`[VotingComponent] Cannot submit vote:`, {
        hasSocket: !!socket,
        selectedOptionsLength: selectedOptions.length,
        votingSessionId
      });
    }
  };

  const handleOptionSelect = (option) => {
    if (!hasVoted && votingState === 'voting') {
      if (maxSelections === 1) {
        // Single selection - replace the current selection
        setSelectedOptions([option]);
      } else {
        // Multiple selections - toggle the option
        setSelectedOptions(prev => {
          const isSelected = prev.some(selected => selected.id === option.id);
          if (isSelected) {
            // Remove from selection
            return prev.filter(selected => selected.id !== option.id);
          } else if (prev.length < maxSelections) {
            // Add to selection if under limit
            return [...prev, option];
          }
          // If at limit, don't add more
          return prev;
        });
      }
    }
  };

  const getVotePercentage = (option) => {
    if (results.length === 0) return 0;
    const result = results.find(r => r.contribution_id === option.id);
    const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);
    return totalVotes > 0 ? Math.round((result?.vote_count || 0) / totalVotes * 100) : 0;
  };

  console.log(`[VotingComponent] Current state:`, {
    votingState,
    votingOptions: votingOptions.length,
    usingPredefinedOptions,
    activeContributions: activeContributions.length,
    contributions: contributions.length
  });

  if (votingState === 'waiting') {
    return (
      <div className="text-center py-8 px-6 fade-in">
        <Clock className="mx-auto h-12 w-12 mb-4 text-teal-500 animate-pulse" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
        {subtitle && <p className="text-gray-600 mb-6">{subtitle}</p>}
        
        {votingOptions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-gray-500 border border-gray-200">
            No options to vote on yet. Waiting for {usingPredefinedOptions ? 'options' : 'contributions'}...
          </div>
        ) : (
          <div className="slide-in-up">
            <p className="mb-6 text-gray-700">
              {votingOptions.length} option{votingOptions.length !== 1 ? 's' : ''} ready for voting
            </p>
            <button
              onClick={startVoting}
              className="bg-teal-600 text-white border-none py-3 px-6 rounded-lg font-semibold cursor-pointer text-base hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              Start Voting
            </button>
          </div>
        )}
      </div>
    );
  }

  if (votingState === 'voting') {
    return (
      <div className="p-6 space-y-6 fade-in">
        <div className="text-center slide-in-down">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6 inline-block shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-teal-600" />
              <span className="font-semibold text-teal-800">
                Voting in progress: {voteProgress.totalVotes || 0}/{voteProgress.totalMembers || 0} votes cast
              </span>
            </div>
          </div>

        </div>

        <div className="space-y-4">
          {votingOptions.map((option, index) => (
            <div
              key={option.id || index}
              onClick={() => handleOptionSelect(option)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedOptions.some(selected => selected.id === option.id) 
                  ? 'border-teal-500 bg-teal-50 shadow-lg ring-2 ring-teal-200' 
                  : 'border-gray-200 hover:border-teal-300 hover:shadow-md hover:-translate-y-1'
              } ${hasVoted ? 'opacity-70 cursor-default' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-800">
                  Option {index + 1}
                </div>
                {selectedOptions.some(selected => selected.id === option.id) && (
                  <div className="flex items-center text-teal-600 animate-bounce">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Selected</span>
                  </div>
                )}
              </div>
              <div className="text-gray-700 mb-3">
                {typeof option.content === 'string' ? option.content : 
                 option.content?.statement || option.content?.question || 
                 JSON.stringify(option.content)}
              </div>
            </div>
          ))}
        </div>

        {!hasVoted && selectedOptions.length > 0 ? (
          <div className="text-center slide-in-up">
            {maxSelections > 1 && (
              <div className="text-center mb-4 text-gray-700 text-sm">
                {selectedOptions.length}/{maxSelections} selected
                {selectedOptions.length < maxSelections && ` (select ${maxSelections - selectedOptions.length} more)`}
              </div>
            )}
            <button
              onClick={submitVote}
              disabled={selectedOptions.length !== maxSelections}
              className={`border-none py-3 px-6 rounded-lg font-semibold cursor-pointer w-full text-base transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl ${
                selectedOptions.length === maxSelections
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedOptions.length === maxSelections 
                ? `Submit Vote${selectedOptions.length > 1 ? 's' : ''} ✓`
                : `Select ${maxSelections - selectedOptions.length} more option${maxSelections - selectedOptions.length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        ) : hasVoted ? (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold slide-in-up animate-pulse">
            ✓ Vote submitted! Waiting for others...
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
            Select an option to vote
          </div>
        )}
      </div>
    );
  }

  if (votingState === 'tie') {
    return (
      <div className="text-center py-8 px-6 fade-in">
        <h3 className="text-xl font-semibold text-green-600 mb-4 animate-pulse">
          🤝 It's a Tie!
        </h3>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-800 slide-in-up">
          {tieMessage}
        </div>
        <button
          onClick={()=>{
            if(!socket) return
            socket.emit('room:start_voting', { roomId, type, maxSelections });
          }}
          className="bg-green-600 text-white border-none py-3 px-6 rounded-lg font-semibold cursor-pointer hover:bg-green-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl"
        >
            Revote
        </button>
        <div className="mt-6 slide-in-up" style={{ animationDelay: '0.2s' }}>
          <h4 className="mb-4 text-gray-800 font-semibold">Results:</h4>
          <div className="space-y-3">
            {results.map((result, index) => {
              // Get the actual content for display
              const contribution = result.contribution;
              let displayText = `Option ${index + 1}`;
              
              if (contribution) {
                if (contribution.content?.question) {
                  displayText = contribution.content.question;
                } else if (contribution.content?.statement) {
                  displayText = contribution.content.statement;
                } else if (typeof contribution.content === 'string') {
                  displayText = contribution.content;
                } else if (contribution.question) {
                  displayText = contribution.question;
                } else if (contribution.statement) {
                  displayText = contribution.statement;
                }
              }
              
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-300" style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-700 font-medium">Question {index + 1}</span>
                    <span className="font-semibold text-gray-800">{result.vote_count} vote{result.vote_count !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed text-left">{displayText}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (votingState === 'results') {
  const isMulti = type === 'hmw_question' && (maxSelections ?? 1) > 1;

  const getContentText = (x) => {
    if (!x) return '';
    const contrib = x.contribution || x; 
    const c = contrib?.content;
    if (typeof c === 'string') return c;
    return c?.question || c?.statement || '';
  };


  if (!isMulti) {
    const winnerRes = (results || [])[0] || null; 
    const winnerText = getContentText(winnerRes);

    return (
      <div className="text-center py-8 px-6 space-y-6 fade-in">
        <div className="slide-in-down">
          <Trophy className="mx-auto h-12 w-12 mb-4 text-teal-600 animate-bounce" />
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            🎉 Voting Complete!
          </h3>
        </div>

        <div className="bg-teal-50 border-2 border-teal-500 rounded-xl p-6 mb-6 slide-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-lg font-semibold text-teal-800 mb-2">
            Winner!
          </div>
          <div className="text-gray-700">
            {winnerText || 'Selected Option'}
          </div>
          {winnerRes && (
            <div className="text-sm text-gray-600 mt-2">
              {winnerRes.vote_count} vote{winnerRes.vote_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="slide-in-up" style={{ animationDelay: '0.2s' }}>
          <h4 className="mb-4 text-gray-800 font-semibold">Final Results:</h4>
          <div className="space-y-3">
            {(results || []).map((result, index) => (
              <div key={result.contribution_id || result.option_id || index} className={`border-2 rounded-lg p-3 flex justify-between items-center transition-all duration-300 hover:shadow-md ${
                index === 0 ? 'bg-teal-50 border-teal-500' : 'bg-white border-gray-200'
              }`} style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                <span className={`font-medium ${index === 0 ? 'text-teal-800' : 'text-gray-700'} max-w-md truncate`}>
                  {index === 0 ? '👑 ' : ''}{getContentText(result)}
                </span>
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-200 rounded-full h-2 w-24 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-700 ease-out ${
                      index === 0 ? 'bg-teal-600' : 'bg-gray-400'
                    }`} style={{ width: `${(result.vote_count / ((results?.[0]?.vote_count || 1))) * 100}%` }} />
                  </div>
                  <span className="font-semibold text-gray-800 min-w-[60px]">
                    {result.vote_count} vote{result.vote_count !== 1 ? 's' : ''} (
                    {Math.round(
                      (result.vote_count /
                        (results || []).reduce((sum, x) => sum + (x.vote_count || 0), 0)) * 100
                    )}
                    %)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 slide-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => {
              if (!onVotingComplete) return;
        
              onVotingComplete(winnerRes, results || []);
            }}
            className="bg-teal-600 text-white border-none py-3 px-6 rounded-lg font-semibold cursor-pointer hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const total = (results || []).length;
  const topCount = Math.min((maxSelections || 3), total);
  const winners = (results || []).slice(0, topCount);

  return (
    <div className="text-center py-8 px-6 space-y-6 fade-in">
      <div className="slide-in-down">
        <Trophy className="mx-auto h-12 w-12 mb-4 text-teal-600 animate-bounce" />
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          🎉 Voting Complete!
        </h3>
      </div>

      <div className="bg-teal-50 border-2 border-teal-500 rounded-xl p-6 mb-6 text-left slide-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="text-lg font-semibold text-teal-800 mb-4">
          Top {topCount} Winners
        </div>

        <div className="space-y-3">
          {winners.map((w, i) => (
            <div
              key={w.contribution_id || w.option_id || i}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}
            >
              <div className="font-semibold text-gray-800 mb-1">👑 #{i + 1}</div>
              <div className="text-gray-700">{getContentText(w)}</div>
              <div className="text-sm text-gray-500 mt-1">
                {w.vote_count} vote{w.vote_count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-4 text-gray-800 font-semibold">Final Results:</h4>
        <div className="space-y-3">
          {(results || []).map((r, index) => {
            const isTop = index < topCount;
            return (
              <div
                key={r.contribution_id || r.option_id || index}
                className={`border-2 rounded-lg p-3 flex justify-between items-center transition-all duration-300 hover:shadow-md ${
                  isTop ? 'bg-teal-50 border-teal-500' : 'bg-white border-gray-200'
                }`}
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <span className={`font-medium ${isTop ? 'text-teal-800' : 'text-gray-700'} max-w-md truncate`}>
                  {isTop ? '👑 ' : ''}{getContentText(r)}
                </span>
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-200 rounded-full h-2 w-24 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-700 ease-out ${
                      isTop ? 'bg-teal-600' : 'bg-gray-400'
                    }`} style={{ width: `${(r.vote_count / ((results?.[0]?.vote_count || 1))) * 100}%` }} />
                  </div>
                  <span className="font-semibold text-gray-800 min-w-[60px]">
                    {r.vote_count} vote{r.vote_count !== 1 ? 's' : ''} (
                    {Math.round(
                      (r.vote_count /
                        (results || []).reduce((sum, x) => sum + (x.vote_count || 0), 0)) * 100
                    )}
                    %)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 slide-in-up" style={{ animationDelay: '0.5s' }}>
        <button
          onClick={() => {
            if (!onVotingComplete) return;
            const topContribs = winners
              .map(w => w.contribution)
              .filter(Boolean);
            onVotingComplete(topContribs, results || []);
          }}
          className="bg-teal-600 text-white border-none py-3 px-6 rounded-lg font-semibold cursor-pointer hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
  
  return null;
};

export default VotingComponent;
