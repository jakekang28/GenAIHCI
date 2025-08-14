import React from 'react';
import { ArrowLeft, ChevronRight, CheckCircle } from 'lucide-react';
import LoadingPage from '../LoadingPage';
import { mistakeTypes } from '../shared/constants';

const AIQuestionFeedback = ({ 
  selectedGroupQuestion, 
  selectedScenario, 
  aiFeedback, 
  loading, 
  error,
  onBack, 
  onContinue 
}) => {
  if (loading) {
    return (
      <LoadingPage
        type="ai-evaluation"
        title="Loading AI feedback..."
        subtitle=""
      />
    );
  }

  if (error || !aiFeedback) {
    return <p>No AI feedback available.</p>;
  }

  // Fix: Access the eval property from aiFeedback
  const { mistakes, response } = aiFeedback.eval || aiFeedback;

  let mistakesArray = Array.isArray(mistakes) ? mistakes : [mistakes];
  let responseArray = Array.isArray(response) ? response : [response];

  const getMistakeId = (typeArray, findFunction) => {
    const mistake = typeArray.find(findFunction);
    return mistake?.id;
  };

  const getMistakeDesc = (typeArray, findFunction) => {
    const mistake = typeArray.find(findFunction);
    return mistake?.description;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8 slide-in-left">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Group Evaluation
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 fade-in">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">AI Feedback on Selected Question</h1>

          <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-800 mb-3">Selected Question:</h3>
            <p className="text-indigo-700 break-words overflow-hidden text-lg">"{selectedGroupQuestion}"</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Analysis</h2>

            {mistakes && mistakes !== "None" && mistakesArray.length > 0 && mistakesArray[0] !== "None" ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">Identified Issues:</h3>
                  <div className="flex flex-wrap gap-2">
                    {mistakesArray.filter(mistake => mistake !== "None").map(mistake => (
                      <span key={getMistakeId(mistakeTypes, u => u.title === mistake)} className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                        {mistake}
                      </span>
                    ))}
                  </div>
                </div>

                {mistakesArray.filter(mistake => mistake !== "None").map((mistake, index) => {
                  return (
                    <div key={getMistakeId(mistakeTypes, u => u.title === mistake)} className="border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">{mistake}</h3>
                      <p className="text-gray-600 mb-4 break-words overflow-hidden">{getMistakeDesc(mistakeTypes, u => u.title === mistake)}</p>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                            <span className="text-indigo-600 font-bold text-sm">AI</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-indigo-800 mb-2">AI Feedback</h4>
                            <p className="text-indigo-700 text-sm break-words overflow-hidden leading-relaxed">
                              {responseArray[index]}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-800">Excellent Question!</h3>
                    <p className="text-green-600 text-sm">AI Analysis Complete</p>
                  </div>
                </div>
                
                {/* AI Feedback Section - Show even when no issues */}
                {responseArray && responseArray.length > 0 && (
                  <div className="bg-white border border-green-100 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                        <span className="text-green-600 font-bold text-sm">AI</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">AI Feedback</h4>
                        <p className="text-green-700 text-sm break-words overflow-hidden leading-relaxed">
                          {responseArray[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-blue-800 mb-3">Interview Tips</h3>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li>• Remember to listen actively and ask follow-up questions based on their responses</li>
              <li>• Look for emotional cues and dig deeper into feelings and motivations</li>
              <li>• Keep the conversation focused on their experience rather than solutions</li>
              <li>• Ask "why" questions to uncover deeper insights</li>
            </ul>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={onContinue}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 flex items-center hover:transform hover:scale-105 smooth-hover"
            >
              Start Interview Session
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIQuestionFeedback;
