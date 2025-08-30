import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import LoadingPage from '../LoadingPage';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
const PostInterviewEvaluation = ({ 
  aiScoreFeedback, 
  loading, 
  onBack, 
  onComplete 
}) => {
  useBackTrap(true)
  if (loading) {
    return (
      <LoadingPage
        type="ai-evaluation"
        title="Scoring your interview with AI..."
        subtitle=""
      />
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Post-Interview AI Evaluation</h1>
          <div className="space-y-6">
            {aiScoreFeedback && (
            aiScoreFeedback.map((rubric, index) => (
              <div key={rubric.standard} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{rubric.standard}</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-emerald-600 mr-2">{rubric.score}/5</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-5 h-5 ${i < (rubric.score) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-emerald-800 break-words overflow-hidden">
                    {rubric.response}
                  </p>
                </div>
              </div>
            ))
          )}
          </div>



          <div className="flex justify-center mt-8">
            <button 
              onClick={onComplete}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-200 hover:transform hover:scale-105 smooth-hover"
            >
              Complete Interview Training
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostInterviewEvaluation;
