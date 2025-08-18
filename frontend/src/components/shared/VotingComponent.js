import React, { useState, useEffect } from 'react';
import { useSession } from '../../providers/SessionProvider';

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
    if (selectedOptions.length === 0) return;
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
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
        {subtitle && <p style={{ color: '#6b7280', marginBottom: 16 }}>{subtitle}</p>}
        
        {votingOptions.length === 0 ? (
          <div style={{ 
            background: '#f3f4f6', 
            padding: 20, 
            borderRadius: 8, 
            color: '#6b7280' 
          }}>
            No options to vote on yet. Waiting for {usingPredefinedOptions ? 'options' : 'contributions'}...
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 16, color: '#374151' }}>
              {votingOptions.length} option{votingOptions.length !== 1 ? 's' : ''} ready for voting
            </p>
            <button
              onClick={startVoting}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 16
              }}
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
      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
        <div style={{ 
          background: '#dbeafe', 
          border: '1px solid #60a5fa', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <span style={{ fontWeight: 600 }}>Voting in progress:</span> {voteProgress.totalVotes || 0}/{voteProgress.totalMembers || 0} votes cast
        </div>

        <div style={{ marginBottom: 20 }}>
          {votingOptions.map((option, index) => (
            <div
              key={option.id || index}
              onClick={() => handleOptionSelect(option)}
              style={{
                border: selectedOptions.some(selected => selected.id === option.id) ? '2px solid #10b981' : '1px solid #d1d5db',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                cursor: hasVoted ? 'default' : 'pointer',
                background: selectedOptions.some(selected => selected.id === option.id) ? '#f0fdf4' : 'white',
                opacity: hasVoted ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Option {index + 1}
                {selectedOptions.some(selected => selected.id === option.id) && (
                  <span style={{ marginLeft: 8, color: '#10b981' }}>✓ Selected</span>
                )}
              </div>
              <div style={{ color: '#374151' }}>
                {typeof option.content === 'string' ? option.content : 
                 option.content?.statement || option.content?.question || 
                 JSON.stringify(option.content)}
              </div>
              {option.userName && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  by {option.userName}
                </div>
              )}
            </div>
          ))}
        </div>

        {!hasVoted && selectedOptions.length > 0 ? (
          <div>
            {maxSelections > 1 && (
              <div style={{ 
                textAlign: 'center', 
                marginBottom: 12, 
                color: '#374151',
                fontSize: 14 
              }}>
                {selectedOptions.length}/{maxSelections} selected
                {selectedOptions.length < maxSelections && ` (select ${maxSelections - selectedOptions.length} more)`}
              </div>
            )}
            <button
              onClick={submitVote}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                fontSize: 16
              }}
            >
              Submit Vote{selectedOptions.length > 1 ? 's' : ''} ✓
            </button>
          </div>
        ) : hasVoted ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            background: '#f0fdf4', 
            border: '1px solid #10b981', 
            borderRadius: 8,
            color: '#15803d',
            fontWeight: 600
          }}>
            ✓ Vote submitted! Waiting for others...
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            background: '#f9fafb', 
            border: '1px solid #d1d5db', 
            borderRadius: 8,
            color: '#6b7280'
          }}>
            Select an option to vote
          </div>
        )}
      </div>
    );
  }

  if (votingState === 'tie') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#f59e0b' }}>
          🤝 It's a Tie!
        </h3>
        <div style={{ 
          background: '#fef3c7', 
          border: '1px solid #f59e0b', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20,
          color: '#92400e'
        }}>
          {tieMessage}
        </div>
        <button
          onClick={()=>{
            if(!socket) return
            socket.emit('room:start_voting', { roomId, type, maxSelections });
          }}
          style={{
            background : '#10b981', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
          }}
        >
            Revote
        </button>
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Results:</h4>
          {results.map((result, index) => (
            <div key={index} style={{ 
              background: 'white', 
              border: '1px solid #d1d5db', 
              borderRadius: 8, 
              padding: 12, 
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Option {index + 1}</span>
              <span style={{ fontWeight: 600 }}>{result.vote_count} vote{result.vote_count !== 1 ? 's' : ''}</span>
            </div>
          ))}
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
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#10b981' }}>
          🎉 Voting Complete!
        </h3>

        <div style={{
          background: '#f0fdf4',
          border: '2px solid #10b981',
          padding: 20,
          borderRadius: 12,
          marginBottom: 20
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>
            Winner!
          </div>
          <div style={{ color: '#374151' }}>
            {winnerText || 'Selected Option'}
          </div>
          {winnerRes && (
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
              {winnerRes.vote_count} vote{winnerRes.vote_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div>
          <h4 style={{ marginBottom: 12 }}>Final Results:</h4>
          {(results || []).map((result, index) => (
            <div key={result.contribution_id || result.option_id || index} style={{
              background: index === 0 ? '#f0fdf4' : 'white',
              border: index === 0 ? '2px solid #10b981' : '1px solid #d1d5db',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: index === 0 ? 600 : 400 }}>
                {index === 0 ? '👑 ' : ''}{`Option ${index + 1}`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  background: '#e5e7eb',
                  borderRadius: 4,
                  height: 8,
                  width: 100,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: index === 0 ? '#10b981' : '#6b7280',
                    height: '100%',
                    width: `${(result.vote_count / ((results?.[0]?.vote_count || 1))) * 100}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <span style={{ fontWeight: 600, minWidth: 60 }}>
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


        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => {
              if (!onVotingComplete) return;
        
              onVotingComplete(winnerRes, results || []);
            }}
            style={{
              background: '#10b981', color: 'white', border: 'none',
              padding: '12px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
            }}
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
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#10b981' }}>
        🎉 Voting Complete!
      </h3>

      <div
        style={{
          background: '#f0fdf4',
          border: '2px solid #10b981',
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          textAlign: 'left'
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: '#15803d', marginBottom: 8 }}>
          Top {topCount} Winners
        </div>

        {winners.map((w, i) => (
          <div
            key={w.contribution_id || w.option_id || i}
            style={{
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: 12,
              marginBottom: 10
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>👑 #{i + 1}</div>
            <div style={{ color: '#374151' }}>{getContentText(w)}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              {w.vote_count} vote{w.vote_count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

  
      <div>
        <h4 style={{ marginBottom: 12 }}>Final Results:</h4>
        {(results || []).map((r, index) => {
          const isTop = index < topCount;
          return (
            <div
              key={r.contribution_id || r.option_id || index}
              style={{
                background: isTop ? '#f0fdf4' : 'white',
                border: isTop ? '2px solid #10b981' : '1px solid #d1d5db',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontWeight: isTop ? 600 : 400 }}>
                {isTop ? '👑 ' : ''}{getContentText(r) || `Option ${index + 1}`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: '#e5e7eb',
                    borderRadius: 4,
                    height: 8,
                    width: 100,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      background: isTop ? '#10b981' : '#6b7280',
                      height: '100%',
                      width: `${(r.vote_count / ((results?.[0]?.vote_count || 1))) * 100}%`,
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
                <span style={{ fontWeight: 600, minWidth: 60 }}>
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

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => {
            if (!onVotingComplete) return;
            const topContribs = winners
              .map(w => w.contribution)
              .filter(Boolean);
            onVotingComplete(topContribs, results || []);
          }}
          style={{
            background: '#10b981', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
          }}
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
