import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import LoadingPage from '../LoadingPage';
import { extractAIContent, parseHmwAIFeedback } from '../shared/utils';
import { useSession } from '../../providers/SessionProvider';

const FinalHmwAiFeedback = ({ 
  selectedFinalHmwQuestions, 
  selectedGroupPov, 
  hmwAIResults, 
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
        title="Evaluating your HMW questions with AI..."
        subtitle=""
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-100 p-6">
      <div className="max-w-6xl mx-auto w-full">
        {/* <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Group Selection
          </button>
        </div> */}

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Evaluation of Final HMW Questions</h1>
          <p className="text-gray-600 mb-6">
            Our AI has evaluated your 3 selected HMW questions using the same rubrics as the original system. 
            Review the feedback to understand the strengths and potential improvements for each question.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Selected POV Foundation:</h3>
            <p className="text-gray-600 text-sm italic">"{selectedGroupPov}"</p>
          </div>
        </div>

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

        <div className="space-y-8">
          {selectedFinalHmwQuestions.map((question, questionIndex) => {
            const aiResult = hmwAIResults[questionIndex];
            const parsedFeedback = parseHmwAIFeedback(aiResult);
            
            // Debug logging
            console.log(`Question ${questionIndex + 1} AI Result:`, aiResult);
            console.log(`Question ${questionIndex + 1} Parsed Feedback:`, parsedFeedback);

            return (
              <div key={questionIndex} className="bg-white rounded-2xl shadow-xl p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Selected Question {questionIndex + 1}
                  </h2>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <p className="text-gray-700 break-words overflow-hidden leading-relaxed text-lg">
                      {question}
                    </p>
                  </div>
                </div>

                {aiResult && !hmwLoading && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                        <span className="text-emerald-600 font-bold text-sm">AI</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-emerald-800 mb-3">AI Evaluation Results</h4>
                        
                        {parsedFeedback ? (
                          <div className="space-y-4">
                            {parsedFeedback.map((rubric) => (
                              <div key={rubric.id} className="border border-emerald-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-lg font-semibold text-emerald-800">{rubric.title}</h5>
                                  <div className="flex items-center">
                                    <span className="text-xl font-bold text-emerald-600 mr-2">{rubric.score}/5</span>
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`w-4 h-4 ${i < rubric.score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                {rubric.reason && (
                                  <div className="bg-emerald-100 p-3 rounded-lg">
                                    <p className="text-emerald-800 text-sm leading-relaxed">
                                      {rubric.reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-emerald-700 text-sm leading-relaxed whitespace-pre-line">
                            {extractAIContent(aiResult)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!aiResult && !hmwLoading && !apiError && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-center">
                      <span className="text-gray-500">Waiting for evaluation...</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-8 space-x-8">
          <button 
            onClick={onComplete}
            className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-200 hover:transform hover:scale-105 smooth-hover text-lg shadow-lg"
          >
            Complete HMW Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalHmwAiFeedback;
