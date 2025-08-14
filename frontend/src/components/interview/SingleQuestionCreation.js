import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

const SingleQuestionCreation = ({ selectedScenario, onBack, onContinue }) => {
  const [prePlannedQuestion, setPrePlannedQuestion] = useState('');

  const handleContinue = () => {
    if (prePlannedQuestion.trim()) {
      onContinue(prePlannedQuestion);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8 slide-in-left">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Scenario Selection
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 fade-in">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Your Interview Question</h1>
          
          <div className="mb-6 p-4 bg-orange-50 rounded-lg">
            <h3 className="font-semibold text-orange-800 mb-2">Selected Scenario:</h3>
            <p className="text-orange-700 font-semibold">{selectedScenario.scenario}</p>
            <p className="text-orange-600 text-sm mt-2">{selectedScenario.description}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">{selectedScenario.persona.image}</div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedScenario.persona.name}</h3>
                <p className="text-gray-600">{selectedScenario.persona.role}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 break-words overflow-hidden">{selectedScenario.context}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-lg font-semibold text-gray-700">
                Write Your Interview Question
              </label>
            </div>
            <p className="text-gray-600 mb-4">
              Create 1 thoughtful question that will help you understand {selectedScenario.persona.name}'s experience 
              with {selectedScenario.scenario.toLowerCase()}. Focus on open-ended questions that explore motivations, 
              challenges, and feelings.
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={prePlannedQuestion}
                      onChange={(e) => setPrePlannedQuestion(e.target.value)}
                      placeholder="Enter your interview question here..."
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleContinue}
              disabled={!prePlannedQuestion.trim()}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center hover:transform hover:scale-105 ${
                prePlannedQuestion.trim() 
                  ? 'bg-orange-600 text-white hover:bg-orange-700 smooth-hover' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Group Evaluation
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleQuestionCreation;
