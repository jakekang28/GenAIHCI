import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { scenarioPersonaPairs } from '../shared/constants';
import { useBackTrap } from '../../hooks/useBackTrap.ts';
const ScenarioSelection = ({ onBack, onContinue, onPersonaSelection }) => {
  const [selectedScenario, setSelectedScenario] = useState(null);
  useBackTrap(true)
  const handleContinue = () => {
    if (selectedScenario) {
      onPersonaSelection(selectedScenario.tag);
      onContinue(selectedScenario);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Scenario & Persona</h1>
          <p className="text-xl text-gray-600">Select a design scenario and the persona you'll be working with</p>
        </div>``
        
        {/* Scenario Cards */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12 fade-in">
          {scenarioPersonaPairs.map((pair, index) => (
            <div 
              key={pair.id}
              className={`bg-white rounded-2xl shadow-lg cursor-pointer smooth-hover border-2 transition-all duration-300 ${
                selectedScenario?.id === pair.id 
                  ? 'border-purple-500 bg-purple-50 shadow-xl' 
                  : 'border-transparent hover:border-purple-200 hover:shadow-xl'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => setSelectedScenario(pair)}
            >
              {/* Persona Section */}
               <div className="p-6 border-b border-gray-100">
                 <div className="flex items-start space-x-4">
                   <div className="text-3xl flex-shrink-0">{pair.persona.image}</div>
                   <div className="flex-1">
                     <h4 className="text-lg font-bold text-gray-800 mb-1">{pair.persona.name}</h4>
                     <p className="text-purple-600 font-semibold text-sm mb-2">{pair.persona.role}</p>
                     <p className="text-gray-600 text-sm leading-relaxed">{pair.persona.description}</p>
                   </div>
                 </div>
               </div>
               
               {/* Scenario Section */}
               <div className="p-6">
                 <div className="mb-3">
                   <h3 className="text-lg font-bold text-gray-800 mb-2 leading-relaxed">
                     {pair.description}
                   </h3>
                 </div>

                 {/* Context */}
                 <div className="flex flex-col gap-2">
                 <div className="bg-blue-50 p-3 rounded-lg">
                   <p className="text-sm text-gray-700 leading-relaxed">
                     <span className="font-semibold text-blue-800">Context:</span> {pair.context}
                   </p>
                 </div>
                 <div className="bg-blue-50 p-3 rounded-lg">
                   <p className="text-sm text-gray-700 leading-relaxed">
                     <span className="font-semibold text-blue-800">Sample Scenario:</span> {pair.scenario}
                   </p>
                 </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
        
        {/* Continue Button */}
        {selectedScenario && (
          <div className="flex justify-center">
            <button 
              onClick={handleContinue}
              className="bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center hover:transform hover:scale-105 smooth-hover shadow-lg"
            >
              Continue with {selectedScenario.persona.name}
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioSelection;
