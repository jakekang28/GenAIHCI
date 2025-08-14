import React from 'react';
import { ArrowLeft, ChevronRight, Star } from 'lucide-react';
import LoadingPage from '../LoadingPage';
import { parsePovAIFeedback, extractAIContent } from '../shared/utils';

const PovAiFeedback = ({ 
  selectedGroupPov, 
  needs, 
  insights, 
  povAIResult, 
  povLoading, 
  apiError, 
  onBack, 
  onContinue,
  onRetryEvaluation 
}) => {
  if (povLoading) {
    return (
      <LoadingPage
        type="ai-evaluation"
        title="Evaluating your POV statement with AI..."
        subtitle=""
      />
    );
  }

  const parsedFeedback = parsePovAIFeedback(povAIResult);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8 slide-in-left">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Group Comparison
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 fade-in">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">AI Feedback on POV Statement</h1>

          <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-800 mb-3">Selected POV Statement:</h3>
            <p className="text-indigo-700 break-words overflow-hidden text-lg">"{selectedGroupPov}"</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Analysis</h2>
            
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-red-600 font-bold text-sm">!</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 mb-2">Error</h4>
                    <p className="text-red-700 text-sm">{apiError}</p>
                    <button 
                      onClick={onRetryEvaluation}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {parsedFeedback && !povLoading && (
              <div className="space-y-6">
                {parsedFeedback.map((rubric) => (
                  <div key={rubric.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{rubric.title}</h3>
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-indigo-600 mr-2">{rubric.score}/5</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-5 h-5 ${i < rubric.score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-indigo-800 break-words overflow-hidden">
                        {rubric.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {povAIResult && !parsedFeedback && !povLoading && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                    <span className="text-indigo-600 font-bold text-sm">AI</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-indigo-800 mb-3">AI Evaluation Results</h4>
                    <div className="text-indigo-700 text-sm leading-relaxed whitespace-pre-line">
                      {extractAIContent(povAIResult)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
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
    </div>
  );
};

export default PovAiFeedback;
