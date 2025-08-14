import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { generateGroupmateHmwQuestions } from '../shared/utils';

const HmwGroupSelection = ({ hmwQuestions, selectedGroupPov, onBack, onContinue }) => {
  const [selectedFinalHmwQuestions, setSelectedFinalHmwQuestions] = useState([]);
  
  const allQuestions = generateGroupmateHmwQuestions(hmwQuestions);

  const handleQuestionToggle = (question) => {
    if (selectedFinalHmwQuestions.includes(question)) {
      setSelectedFinalHmwQuestions(prev => prev.filter(q => q !== question));
    } else if (selectedFinalHmwQuestions.length < 3) {
      setSelectedFinalHmwQuestions(prev => [...prev, question]);
    }
  };

  const handleContinue = () => {
    if (selectedFinalHmwQuestions.length === 3) {
      onContinue(selectedFinalHmwQuestions);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to HMW Creation
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Select Final 3 HMW Questions</h1>
          <p className="text-gray-600 mb-8">
            Review all HMW questions from your group and select the 3 best ones for final AI evaluation. 
            Choose questions that are most inspiring, actionable, and aligned with your POV statement.
          </p>

          <div className="mb-6 p-4 bg-violet-50 rounded-lg border border-violet-200">
            <h3 className="font-semibold text-violet-800 mb-2">Selected POV Statement:</h3>
            <p className="text-violet-700 text-sm italic">"{selectedGroupPov}"</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">All Group HMW Questions</h3>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {allQuestions.map((item, index) => (
                <div 
                  key={item.questionId}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedFinalHmwQuestions.includes(item.question)
                      ? 'border-violet-500 bg-violet-50 shadow-md'
                      : 'border-gray-200 hover:border-violet-300'
                  } ${selectedFinalHmwQuestions.length >= 3 && !selectedFinalHmwQuestions.includes(item.question) ? 'opacity-50' : ''}`}
                  onClick={() => handleQuestionToggle(item.question)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.isYours ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">{item.studentName}</span>
                        <p className="text-gray-700 break-words overflow-hidden">{item.question}</p>
                      </div>
                    </div>
                    {selectedFinalHmwQuestions.includes(item.question) && (
                      <CheckCircle className="w-5 h-5 text-violet-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedFinalHmwQuestions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-green-800 mb-2">
                Selected HMW Questions ({selectedFinalHmwQuestions.length}/3):
              </h4>
              <ul className="space-y-1">
                {selectedFinalHmwQuestions.map((question, index) => (
                  <li key={index} className="text-green-700 text-sm break-words overflow-hidden">
                    {index + 1}. "{question}"
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center">
            <button 
              onClick={handleContinue}
              disabled={selectedFinalHmwQuestions.length !== 3}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center ${
                selectedFinalHmwQuestions.length === 3
                  ? 'bg-violet-600 text-white hover:bg-violet-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Final AI Feedback
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HmwGroupSelection;
