import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const TranscriptReview = ({ 
  chatMessages, 
  selectedGroupQuestion, 
  selectedScenario, 
  onBack, 
  onContinue 
}) => {
  const getMessageType = (message, index) => {
    if (message.text === selectedGroupQuestion) return 'main-question';
    if (message.sender === 'user' && message.text !== selectedGroupQuestion) return 'follow-up';
    return 'response';
  };

  const userFollowUps = chatMessages
    .filter(msg => msg.sender === 'user' && msg.text !== selectedGroupQuestion)
    .map(msg => msg.text);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Interview
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Interview Transcript</h1>

          <div className="space-y-4 mb-8">
            {chatMessages.map((message, index) => {
              const messageType = getMessageType(message, index);
              return (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        message.sender === 'user' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {message.sender === 'user' ? 'You' : selectedScenario.persona.name}
                      </span>
                      {messageType === 'main-question' && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          Main Question
                        </span>
                      )}
                      {messageType === 'follow-up' && (
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{message.timestamp}</span>
                  </div>
                  <p className="text-gray-700 break-words overflow-hidden leading-relaxed">
                    {message.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Your Questions Analysis</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Main Question:</h4>
                <p className="text-gray-600 bg-white p-3 rounded border break-words overflow-hidden">
                  "{selectedGroupQuestion}"
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Follow-up Questions:</h4>
                <div className="space-y-2">
                  {userFollowUps.filter(q => q.trim()).map((question, index) => (
                    <p key={index} className="text-gray-600 bg-white p-3 rounded border break-words overflow-hidden">
                      {index + 1}. "{question}"
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={onContinue}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center"
            >
              Continue to Peer Evaluation
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptReview;
