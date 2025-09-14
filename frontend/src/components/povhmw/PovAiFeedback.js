import React from 'react';
import { ArrowLeft, ChevronRight, Star } from 'lucide-react';
import LoadingPage from '../LoadingPage';
import { parsePovAIFeedback, extractAIContent } from '../shared/utils';
import { useSession } from '../../providers/SessionProvider';

const PovAiFeedback = ({ 
  selectedGroupPov, 
  needs, 
  insights, 
  povAIResult, 
  allPovAIResults, // New prop for all POV evaluations
  povLoading, 
  apiError, 
  onBack, 
  onContinue,
  onRetryEvaluation 
}) => {
  const { sessionId, members } = useSession();
  
  if (povLoading) {
    return (
      <LoadingPage
        type="ai-evaluation"
        title="Evaluating all POV statements with AI..."
        subtitle="This may take a moment as we evaluate each team member's POV statement"
      />
    );
  }

  // Use all POV results if available, otherwise fall back to single result
  const povEvaluations = allPovAIResults && allPovAIResults.length > 0 ? allPovAIResults : 
    (povAIResult ? [{ statement: selectedGroupPov, evaluation: povAIResult, studentName: 'Selected POV' }] : []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6">
      <div className="max-w-6xl mx-auto w-full">
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Evaluation of All POV Statements</h1>
          <p className="text-gray-600 mb-6">
            Our AI has evaluated all POV statements from your team. Compare and discuss the feedback with your groupmates to understand 
            different perspectives and see how each statement addresses user needs and insights.
          </p>
          
          <div className="bg-indigo-50 rounded-lg p-4 mb-6 border border-indigo-200">
            <h3 className="font-semibold text-indigo-800 mb-3">Selected POV for HMW Creation:</h3>
            <p className="text-indigo-700 break-words overflow-hidden">"{selectedGroupPov}"</p>
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

        {povEvaluations.length > 0 ? (
          <div className="space-y-6">
            {povEvaluations.map((povEvaluation, index) => {
              const parsedFeedback = parsePovAIFeedback(povEvaluation.evaluation);
              const isSelected = povEvaluation.statement === selectedGroupPov;
              
              return (
                <div key={index} className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
                  isSelected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h2 className="text-xl font-bold text-gray-800">
                          {povEvaluation.studentName || `POV Statement ${index + 1}`}
                        </h2>
                        {isSelected && (
                          <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                            ⭐ Selected POV
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 italic">"{povEvaluation.statement}"</p>
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
                          {extractAIContent(povEvaluation.evaluation)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600">No POV evaluations available yet.</p>
          </div>
        )}

  

          <div className="flex justify-center" style={{ marginTop: '20px' }}>
            <button 
              onClick={onContinue}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 flex items-center hover:transform hover:scale-105 smooth-hover"
            >
              Continue to HMW Questions
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>

      </div>
    </div>
  );
};

export default PovAiFeedback;