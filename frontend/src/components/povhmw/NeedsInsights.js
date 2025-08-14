import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const NeedsInsights = ({ onBack, onContinue }) => {
  const [needs, setNeeds] = useState(Array(3).fill(''));
  const [insights, setInsights] = useState(Array(3).fill(''));

  const completedNeeds = needs.filter(need => need.trim()).length;
  const completedInsights = insights.filter(insight => insight.trim()).length;
  const totalCompleted = completedNeeds + completedInsights;
  const isComplete = completedNeeds >= 3 && completedInsights >= 3;

  const handleContinue = () => {
    if (isComplete) {
      onContinue({ needs, insights });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Input Needs and Insights</h1>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">👤</div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">User Research</h3>
                <p className="text-gray-600">Design Challenge Analysis</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Based on your research and understanding of your users, identify their needs and insights about their behavior.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{totalCompleted}/6 completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(totalCompleted / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-green-700">User Needs</h2>
                <span className="text-sm text-gray-500">{completedNeeds}/3 completed</span>
              </div>
              <p className="text-gray-600 mb-4">
                What are the specific needs your users require to accomplish their goals?
              </p>
              <div className="space-y-3">
                {needs.map((need, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={need}
                      onChange={(e) => {
                        const newNeeds = [...needs];
                        newNeeds[index] = e.target.value;
                        setNeeds(newNeeds);
                      }}
                      placeholder={`Need ${index + 1}...`}
                      className="flex-1 h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-700">User Insights</h2>
                <span className="text-sm text-gray-500">{completedInsights}/3 completed</span>
              </div>
              <p className="text-gray-600 mb-4">
                What have you discovered about your users' behavior and motivations?
              </p>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={insight}
                      onChange={(e) => {
                        const newInsights = [...insights];
                        newInsights[index] = e.target.value;
                        setInsights(newInsights);
                      }}
                      placeholder={`Insight ${index + 1}...`}
                      className="flex-1 h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={handleContinue}
              disabled={!isComplete}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center hover:transform hover:scale-105 ${
                isComplete 
                  ? 'bg-teal-600 text-white hover:bg-teal-700 smooth-hover' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to POV Creation
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeedsInsights;
