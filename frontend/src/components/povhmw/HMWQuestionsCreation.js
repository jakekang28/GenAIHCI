import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const HMWQuestionsCreation = ({ needs, insights, povStatement, onBack, onContinue }) => {
  const [hmwQuestions, setHmwQuestions] = useState(Array(3).fill(''));
  
  const completedHMWQuestions = hmwQuestions.filter(q => q.trim()).length;
  const isComplete = completedHMWQuestions >= 3;

  const handleContinue = () => {
    if (isComplete) {
      onContinue(hmwQuestions);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        {/* <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to POV Feedback
          </button>
        </div> */}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Create How Might We Questions</h1>
          
          <div className="mb-6 p-4 bg-pink-50 rounded-lg">
            <h3 className="font-semibold text-pink-800 mb-4">Your Research Foundation:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">User Needs:</h4>
                <ul className="space-y-1">
                  {needs.filter(need => need.trim()).map((need, index) => (
                    <li key={index} className="text-green-600 break-words overflow-hidden">• {need}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">User Insights:</h4>
                <ul className="space-y-1">
                  {insights.filter(insight => insight.trim()).map((insight, index) => (
                    <li key={index} className="text-blue-600 break-words overflow-hidden">• {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
            {povStatement.trim() && (
              <div className="mt-4">
                <h4 className="font-semibold text-purple-700 mb-2">Point of View:</h4>
                <p className="text-purple-600 italic break-words overflow-hidden">"{povStatement}"</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-lg font-semibold text-gray-700">
                Write Your How Might We Questions
              </label>
            </div>
            <p className="text-gray-600 mb-4">
              Transform your insights into actionable How Might We questions. Create 3 focused questions that are specific enough 
              to inspire solutions but broad enough to allow for creative exploration.
            </p>
            
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedHMWQuestions / 3) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              {hmwQuestions.map((question, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-pink-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => {
                        const newHMWQuestions = [...hmwQuestions];
                        newHMWQuestions[index] = e.target.value;
                        setHmwQuestions(newHMWQuestions);
                      }}
                      placeholder={`HMW Question ${index + 1}...`}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleContinue}
              disabled={!isComplete}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center ${
                isComplete 
                  ? 'bg-pink-600 text-white hover:bg-pink-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Group Selection
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HMWQuestionsCreation;
