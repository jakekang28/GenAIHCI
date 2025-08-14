import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, Target, Lightbulb } from 'lucide-react';
import VotingComponent from '../shared/VotingComponent';
import { useSession } from '../../providers/SessionProvider';

const CollaborativePovCreation = ({ needs, insights, onBack, onContinue }) => {
  const { sessionId, members, socket } = useSession();
  const [myPovStatement, setMyPovStatement] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [phase, setPhase] = useState('create'); // types:'create', 'voting', 'results'

  useEffect(() => {
    if (!socket) return;

    // Listen for contributions from other members
    const handleContributions = (data) => {
      if (data.type === 'pov_statement') {
        setContributions(data.contributions || []);
      }
    };

    const handlePhaseChange = (data) => {
      if (data.stage) {
        setPhase(data.stage);
      }
    };

    socket.on('room:contributions', handleContributions);
    socket.on('room:stage', handlePhaseChange);
    socket.on('session:stage', handlePhaseChange); // Legacy support

    return () => {
      socket.off('room:contributions', handleContributions);
      socket.off('room:stage', handlePhaseChange);
      socket.off('session:stage', handlePhaseChange);
    };
  }, [socket]);

  const submitPovStatement = () => {
    if (!socket || !myPovStatement.trim()) return;

    const contribution = {
      roomId: sessionId,
      type: 'pov_statement',
      content: {
        statement: myPovStatement.trim(),
        needs: needs.filter(n => n.trim()),
        insights: insights.filter(i => i.trim()),
        context: 'POV statement based on team needs and insights'
      },
      saveToDb: true
    };

    socket.emit('room:contribution:submit', contribution);
    setHasSubmitted(true);
  };

  const handleVotingComplete = (winner, results) => {
    console.log('POV voting complete:', winner);
    // The winner.content should contain the POV statement
    onContinue(winner.content.statement);
  };

  const startVoting = () => {
    if (!socket) return;
    socket.emit('room:start_voting', {
      roomId: sessionId,
      type: 'pov_statement',
      maxSelections: 1
    });
  };

  const renderNeedsInsights = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">📋 Team Needs & Insights</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-blue-700 mb-3">🎯 Needs:</h4>
          <ul className="space-y-2">
            {needs.filter(need => need.trim()).map((need, index) => (
              <li key={index} className="bg-white rounded-lg p-3 text-sm border border-blue-100">
                {index + 1}. {need}
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-700 mb-3">💡 Insights:</h4>
          <ul className="space-y-2">
            {insights.filter(insight => insight.trim()).map((insight, index) => (
              <li key={index} className="bg-white rounded-lg p-3 text-sm border border-blue-100">
                {index + 1}. {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderPovList = () => {
    if (contributions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Waiting for team members to submit their POV statements...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Team POV Statements ({contributions.length}/{members.length})
        </h3>
        {contributions.map((contribution, index) => (
          <div key={contribution.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Target className="h-5 w-5 text-purple-500 mt-1" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 mb-1">
                  {contribution.userName || 'Team Member'}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {contribution.content?.statement || contribution.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCreatePhase = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">Room: {sessionId?.slice(-6)?.toUpperCase()}</p>
            <p className="text-sm text-purple-600 font-medium">{members.length} members</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎯 Create Point of View Statements
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Based on your team's needs and insights, craft a clear POV statement that frames the design challenge
          </p>
        </div>

        {renderNeedsInsights()}

        <div className="grid md:grid-cols-2 gap-8">
          {/* POV Creation Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
              Create Your POV Statement
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your POV Statement
                </label>
                <textarea
                  value={myPovStatement}
                  onChange={(e) => setMyPovStatement(e.target.value)}
                  placeholder="We believe that [user/customer] needs [need] because [insight]..."
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={hasSubmitted}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">💡 POV Statement Tips:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Start with "We believe that..."</li>
                  <li>• Include user, need, and insight</li>
                  <li>• Be specific and actionable</li>
                  <li>• Focus on human-centered needs</li>
                  <li>• Avoid solutions in the statement</li>
                </ul>
              </div>

              <button
                onClick={submitPovStatement}
                disabled={!myPovStatement.trim() || hasSubmitted}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {hasSubmitted ? '✓ POV Statement Submitted' : 'Submit POV Statement'}
              </button>
            </div>
          </div>

          {/* Team POV Statements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Team POV Statements</h2>
              {contributions.length >= members.length && (
                <button
                  onClick={startVoting}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Start Voting
                </button>
              )}
            </div>
            
            {renderPovList()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderVotingPhase = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🗳️ Vote for the Best POV Statement
          </h1>
          <p className="text-gray-600">
            Choose the POV statement that best captures your team's insights and frames the design challenge
          </p>
        </div>

        {renderNeedsInsights()}

        <VotingComponent
          roomId={sessionId}
          contributions={contributions}
          type="pov_statement"
          title="Vote for the Best POV Statement"
          subtitle="Consider which statement best integrates the needs and insights while clearly framing the design challenge"
          maxSelections={1}
          onVotingComplete={handleVotingComplete}
        />
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

export default CollaborativePovCreation;
