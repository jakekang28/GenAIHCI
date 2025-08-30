import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Users, CheckCircle } from 'lucide-react';
import { generateGroupmateQuestions } from '../shared/utils';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
const GroupQuestionEvaluation = ({ prePlannedQuestion, selectedScenario, onBack, onContinue }) => {
  const [selectedGroupQuestion, setSelectedGroupQuestion] = useState('');
  
  const groupmateQuestions = generateGroupmateQuestions(prePlannedQuestion, selectedScenario);

  const handleContinue = () => {
    if (selectedGroupQuestion) {
      onContinue(selectedGroupQuestion);
    }
  };
  useBackTrap(true)
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6 flex items-center justify-center">
      <div className="max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 fade-in">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Group Question Evaluation</h1>
          <p className="text-gray-600 mb-8">
            Review all the questions from your group members and select the best one to use in the interview session. 
            Consider which question will help uncover the most valuable insights about the user's experience.
          </p>
          <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center mb-3">
              <Users className="w-5 h-5 text-teal-600 mr-2" />
              <h3 className="font-semibold text-teal-800">Group Questions for: {selectedScenario.persona.name} ({selectedScenario.persona.role})</h3>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {groupmateQuestions.map((item, index) => (
              <div 
                key={item.id}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                  selectedGroupQuestion === item.question
                    ? 'border-teal-500 bg-teal-50 shadow-md'
                    : 'border-gray-200 hover:border-teal-300 hover:bg-teal-25'
                }`}
                onClick={() => setSelectedGroupQuestion(item.question)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      item.isYourQuestion ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <span className="font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {item.studentName} {item.isYourQuestion && '(You)'}
                      </h4>
                    </div>
                  </div>
                  {selectedGroupQuestion === item.question && (
                    <CheckCircle className="w-6 h-6 text-teal-600" />
                  )}
                </div>
                <p className="text-gray-700 break-words overflow-hidden leading-relaxed pl-11">
                  "{item.question}"
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleContinue}
              disabled={!selectedGroupQuestion}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center hover:transform hover:scale-105 ${
                selectedGroupQuestion
                  ? 'bg-teal-600 text-white hover:bg-teal-700 smooth-hover' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to AI Feedback
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupQuestionEvaluation;
