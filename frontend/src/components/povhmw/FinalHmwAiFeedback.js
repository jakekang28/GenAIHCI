import React from 'react';
import { ArrowLeft, Star, ChevronRight } from 'lucide-react';
import LoadingPage from '../LoadingPage';
import { extractAIContent, parseHmwAIFeedback } from '../shared/utils';
import { useSession } from '../../providers/SessionProvider';

const FinalHmwAiFeedback = ({ 
  selectedFinalHmwQuestions, 
  selectedGroupPov, 
  hmwAIResults, 
  userHmwAIResults, // New: User's own HMW evaluations
  selectedHmwAIResults, // New: Selected HMW evaluations
  hmwLoading, 
  apiError, 
  onBack, 
  onComplete,
  onRetryEvaluation 
}) => {
  const { sessionId, members } = useSession();
  
  if (hmwLoading) {
    return (
      <LoadingPage
        type="ai-evaluation"
        title="Evaluating HMW questions with AI..."
        subtitle="Evaluating both your own HMW questions and the team's selected questions"
      />
    );
  }

  // Use new results if available, otherwise fall back to old format
  const hasNewResults = userHmwAIResults && selectedHmwAIResults && 
    (userHmwAIResults.length > 0 || selectedHmwAIResults.length > 0);

  const renderHmwEvaluation = (hmwResult, index, isUserOwn = false, isSelected = false) => {
    const parsedFeedback = parseHmwAIFeedback(hmwResult.evaluation || hmwResult);
    const question = hmwResult.question || selectedFinalHmwQuestions[index];
    
    return (
      <div key={`${isUserOwn ? 'user' : 'selected'}-${index}`} className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
        isSelected ? 'border-emerald-300 ring-2 ring-emerald-100' : 
        isUserOwn ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h2 className="text-xl font-bold text-gray-800">
                {isUserOwn ? `Your HMW Question ${index + 1}` : 
                 isSelected ? `Selected HMW Question ${index + 1}` : 
                 `HMW Question ${index + 1}`}
              </h2>
              {isSelected && (
                <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full">
                  ⭐ Team Selected
                </span>
              )}
              {isUserOwn && (
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  👤 Your Question
                </span>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 italic">"{question}"</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Evaluation</h3>
          <div className="prose max-w-none">
            {parsedFeedback && Array.isArray(parsedFeedback) ? (
              <div className="space-y-4">
                {parsedFeedback.map((rubric, criterionIndex) => (
                  <div key={rubric.id || criterionIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-semibold text-gray-800">
                        {rubric.title}
                      </h4>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rubric.score
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-gray-700 leading-relaxed text-sm">
                      {rubric.reason || 'No specific feedback provided.'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {extractAIContent(hmwResult.evaluation || hmwResult)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-100 p-6">
      <div className="max-w-6xl mx-auto w-full">
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Evaluation of HMW Questions</h1>
          <p className="text-gray-600 mb-6">
            Compare your own HMW questions with the team's selected questions. 
            See how different approaches perform according to HMW evaluation criteria.
          </p>
          
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-3">POV Foundation:</h3>
            <p className="text-emerald-700 break-words overflow-hidden">"{selectedGroupPov}"</p>
          </div>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-600">{apiError}</p>
            <button 
              onClick={onRetryEvaluation}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry Evaluation
            </button>
          </div>
        )}

        {hasNewResults ? (
          <div className="space-y-8">
            {/* User's Own HMW Questions */}
            {userHmwAIResults && userHmwAIResults.length > 0 && (
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Your HMW Questions</h2>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {userHmwAIResults.length} questions
                  </span>
                </div>
                <div className="space-y-6">
                  {userHmwAIResults.map((hmwResult, index) => 
                    renderHmwEvaluation(hmwResult, index, true, false)
                  )}
                </div>
              </div>
            )}

            {/* Selected HMW Questions */}
            {selectedHmwAIResults && selectedHmwAIResults.length > 0 && (
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Team's Selected HMW Questions</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full">
                    {selectedHmwAIResults.length} questions
                  </span>
                </div>
                <div className="space-y-6">
                  {selectedHmwAIResults.map((hmwResult, index) => 
                    renderHmwEvaluation(hmwResult, index, false, true)
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Fallback to old format
          <div className="space-y-6">
            {Object.entries(hmwAIResults).map(([index, result]) => 
              renderHmwEvaluation(result, parseInt(index), false, false)
            )}
          </div>
        )}

        {(!hasNewResults && Object.keys(hmwAIResults).length === 0) && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600">No HMW evaluations available yet.</p>
          </div>
        )}

        <div className="flex justify-center" style={{ marginTop: '20px' }}>
          <button 
            onClick={onComplete}
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200 flex items-center hover:transform hover:scale-105 smooth-hover"
          >
            Complete Session
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalHmwAiFeedback;