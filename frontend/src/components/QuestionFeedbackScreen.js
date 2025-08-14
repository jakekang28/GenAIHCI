import React from 'react';
import { usePreEvaluation } from '../hooks/usePreEvaluation';
import LoadingPage from './LoadingPage';

function QuestionFeedbackScreen({
  selectedGroupQuestion,
  selectedScenario,
  navigateToStep
}) {
  // Pull in the pre-evaluation data
  const { data, loading, error } = usePreEvaluation(
    selectedGroupQuestion,
    selectedScenario.tag
  )

             if (loading) {
             return (
               <LoadingPage
                 type="ai-evaluation"
                 title="Loading AI feedback..."
                 subtitle=""
               />
             );
           }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl font-bold">!</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Feedback</h2>
              <p className="text-red-600 mb-4">{error.message}</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return renderAIQuestionFeedback(
    data, 
    selectedGroupQuestion, 
    navigateToStep
  )
}

export default QuestionFeedbackScreen;