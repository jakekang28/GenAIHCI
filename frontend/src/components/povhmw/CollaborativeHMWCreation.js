import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, HelpCircle, Lightbulb, Target } from 'lucide-react';
import VotingComponent from '../shared/VotingComponent';
import { useSession } from '../../providers/SessionProvider';

const CollaborativeHMWCreation = ({ needs, insights, povStatement, onBack, onContinue }) => {
  const { sessionId, members, socket } = useSession();
  const [myHmwQuestions, setMyHmwQuestions] = useState(['', '', '']);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [phase, setPhase] = useState('create'); // types: 'create', 'voting', 'results'
  //Util Functions
  const normHmw = (c) => {
    const content = typeof c?.content === 'string' ? { question: c.content } : (c?.content ?? {});
    return {
    ...c,
    content,
    userId: c?.userId ?? c?.content?.userId,
    socketId: c?.socketId ?? c?.content?.socketId,
    authorId: c?.authorId ?? c?.content?.authorId,
    }
  }
  const hmwKey = (x) => {
    const a = x.userId || x.authorId || x.socketId || 'u';
    const id = x.id || x.socketId;
    if (id) return id;
    const ord = x.content?.order;
    if (ord != null) return `${a}::ord:${ord}`;
    const q = (x.content?.question || '').trim().toLowerCase();
    return `${a}::q:${q}`;
  }
  const upsertHmwByStableId = (prev, incomingRaw) => {
    const prevN = prev.map(normHmw);
    const incN  = incomingRaw.map(normHmw);
    const map = new Map(prevN.map((p) => [hmwKey(p), p]));
    for (const n of incN) {
      const k = hmwKey(n);
      map.set(k, { ...(map.get(k) ?? {}), ...n });
    }
    return Array.from(map.values());
  }
  useEffect(() => {
    if (!socket) return;

    // Listen for contributions from other members
    const handleContributions = (data) => {
      if (data?.type !== 'hmw_question') return;
      const incoming = Array.isArray(data?.contributions?.length ? data.contributions : data);
      if (!incoming.length) return;
      setContributions((prev) => upsertHmwByStableId(prev, incoming));
    };

    const handlePhaseChange = (data) => {
      if (data.stage) {
        setPhase(data.stage);
      }
    };
     const handleContributionAck = (ack) => {
      if (!ack?.ok || !ack?.contribution) return;
      setContributions((prev) => upsertHmwByStableId(prev, [ack.contribution]));
    };
    const handleVotingStarted = (data) => {
      if (data?.type !== 'hmw_question') return;
      if (data?.roomId && data.roomId !== sessionId) return;
      setPhase('voting');
      if (data?.contributions) {
        setContributions(upsertHmwByStableId([], data.contributions));
      }
    };
    socket.on('room:voting_started', handleVotingStarted);
    socket.on('room:contributions', handleContributions);
    socket.on('room:contribution:ack', handleContributionAck);
    socket.on('room:stage', handlePhaseChange);
    socket.on('session:stage', handlePhaseChange); // Legacy support

    return () => {
      socket.off('room:voting_started', handleVotingStarted);
      socket.off('room:contributions', handleContributions);
      socket.off('room:contribution:ack', handleContributionAck);
      socket.off('room:stage', handlePhaseChange);
      socket.off('session:stage', handlePhaseChange);
    };
  }, [socket, sessionId]);

  const updateHmwQuestion = (index, value) => {
    const newQuestions = [...myHmwQuestions];
    newQuestions[index] = value;
    setMyHmwQuestions(newQuestions);
  };

  const submitHmwQuestions = () => {
    if (!socket) return;

    const validQuestions = myHmwQuestions.filter(q => q.trim());
    if (validQuestions.length === 0) return;
    const me = members?.find((m) => m.socketId === socket.id);
    const myUserId = me?.userId || undefined;
    const myUserName = me?.userName || 'You';
    const baseMeta = {
      roomId: sessionId,
      type: 'hmw_question',
      userId: myUserId,
      socketId: socket.id,
      authorId: myUserId || socket.id,
      userName: myUserName,
      saveToDb: true,
    };
    // Submit each question as a separate contribution
    validQuestions.forEach((question, index) => {
      const contribution = {
        ...baseMeta,
        content :{
          question: question,
          povStatement,
          needs: needs.filter((n) => n.trim()),
          insights: insights.filter((i) => i.trim()),
          index,
          context: 'HMW question based on selected POV statement',
          userId: myUserId,
          socketId: socket.id,
          authorId: myUserId || socket.id,
          userName: myUserName,
        }
      };

      socket.emit('room:contribution:submit', contribution);
      setContributions((prev) => upsertHmwByStableId(prev, [contribution]));
    });

    setHasSubmitted(true);
  };

  const handleVotingComplete = (selectedQuestions, results) => {
    console.log('HMW voting complete:', selectedQuestions);
    // selectedQuestions -> array of the top 3 voted HMW questions
    const texts = (selectedQuestions || []).map((q) => q?.content?.question || q?.content || '');
    onContinue(texts);
  };

  const startVoting = () => {
    if (!socket) return;
    socket.emit('room:start_voting', {
      roomId: sessionId,
      type: 'hmw_question',
      maxSelections: 3 // Allow selecting top 3 HMW questions
    });
  };

  const renderPovContext = () => (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-200">
      <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
        <Target className="h-5 w-5 mr-2" />
        Selected POV Statement
      </h3>
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <p className="text-gray-800 font-medium">{povStatement}</p>
      </div>
    </div>
  );

  const renderHmwList = () => {
    if (contributions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Waiting for team members to submit their HMW questions...</p>
        </div>
      );
    }

    // Group contributions by user
    const groupedContributions = {};
    contributions.forEach(contribution => {
      const userId = contribution.userId || contribution.socketId || contribution.authorId || 'unknown';
      if (!groupedContributions[userId]) {
        groupedContributions[userId] = {
          userName: contribution.userName || 'Team Member',
          questions: []
        };
      }
      groupedContributions[userId].questions.push(contribution);
    });

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Team HMW Questions ({Object.keys(groupedContributions).length}/{members.length} members)
        </h3>
        {Object.values(groupedContributions).map((userGroup, userIndex) => (
          <div key={userIndex} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-5 w-5 text-green-500" />
              <p className="font-medium text-gray-800">{userGroup.userName}</p>
              <span className="text-sm text-gray-500">({userGroup.questions.length} questions)</span>
            </div>
            <div className="space-y-2">
              {userGroup.questions.map((contribution, qIndex) => (
                <div key={contribution.id || qIndex} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <HelpCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      {contribution.content?.question || contribution.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCreatePhase = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
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
            <p className="text-sm text-green-600 font-medium">{members.length} members</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🤔 Create "How Might We" Questions
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Based on your POV statement, brainstorm HMW questions that open up solution opportunities
          </p>
        </div>

        {renderPovContext()}

        <div className="grid md:grid-cols-2 gap-8">
          {/* HMW Creation Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
              Create Your HMW Questions
            </h2>
            
            <div className="space-y-6">
              {myHmwQuestions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HMW Question {index + 1}
                  </label>
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => updateHmwQuestion(index, e.target.value)}
                      placeholder="How might we help users achieve their goals more easily?"
                      className="w-full h-20 pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                      disabled={hasSubmitted}
                    />
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">💡 HMW Question Tips:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Start with "How might we..."</li>
                  <li>• Be specific but not prescriptive</li>
                  <li>• Focus on opportunities, not solutions</li>
                  <li>• Build on your POV statement</li>
                  <li>• Think about different user touchpoints</li>
                </ul>
              </div>

              <button
                onClick={submitHmwQuestions}
                disabled={myHmwQuestions.every(q => !q.trim()) || hasSubmitted}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {hasSubmitted ? '✓ HMW Questions Submitted' : 'Submit HMW Questions'}
              </button>
            </div>
          </div>

          {/* Team HMW Questions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Team HMW Questions</h2>
              {contributions.length > 0 && (
                <button
                  onClick={startVoting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Start Voting
                </button>
              )}
            </div>
            
            {renderHmwList()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderVotingPhase = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🗳️ Vote for the Top 3 HMW Questions
          </h1>
          <p className="text-gray-600">
            Choose the 3 most promising HMW questions that open up the best solution opportunities
          </p>
        </div>

        {renderPovContext()}

        <VotingComponent
          roomId={sessionId}
          contributions={contributions}
          type="hmw_question"
          title="Vote for the Top 3 HMW Questions"
          subtitle="Select the questions that best capture solution opportunities based on your POV statement"
          maxSelections={3}
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

export default CollaborativeHMWCreation;
