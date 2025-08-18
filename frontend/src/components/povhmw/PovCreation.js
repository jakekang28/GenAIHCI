import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const PovCreation = ({ needs, insights, onBack, onContinue }) => {
  const [povStatement, setPovStatement] = useState('');
  
  const isComplete = povStatement.trim().length > 0;

  const handleContinue = () => {
    if (isComplete) {
      onContinue(povStatement);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        {/* <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Needs & Insights
          </button>
        </div> */}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Point of View Statement</h1>

          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">👤</div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">User Research</h3>
                <p className="text-gray-600">Design Challenge Analysis</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Synthesize your insights into a single Point of View statement that captures who the user is, what they need, and why it matters.
            </p>
          </div>

          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-semibold text-indigo-800 mb-2">Your Research Foundation:</h3>
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
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">Point of View Statement</h2>
            
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-2">Template:</h4>
              <p className="text-indigo-700 text-sm">
                <span className="font-medium">[User]</span> needs to <span className="font-medium">[Need]</span> because/but/surprisingly <span className="font-medium">[Insight]</span>
              </p>
              <p className="text-indigo-600 text-xs mt-2">
                Example: "Graduate students need to have a flexible planning system that combines digital convenience with physical satisfaction because they feel more in control when they can physically interact with their planning tools while maintaining digital connectivity."
              </p>
            </div>

            <textarea
              value={povStatement}
              onChange={(e) => setPovStatement(e.target.value)}
              placeholder="Write your Point of View statement here following the template..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all duration-200"
            />
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleContinue}
              disabled={!isComplete}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center hover:transform hover:scale-105 ${
                isComplete 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 smooth-hover' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Group Comparison
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PovCreation;
