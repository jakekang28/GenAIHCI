import React, { useState } from 'react';
import { ChevronRight, MessageCircle, Lightbulb, Star, Send, ArrowLeft, Users, CheckCircle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/apiService';
import { buildQna } from '../components/buildQna';
import LoadingSpinner from '../components/LoadingSpinner';
import LoadingPage from '../components/LoadingPage';
import { useLocalGuest } from '../hooks/useLocalGuest';
import {BrowserRouter} from 'react-router-dom'
const InterviewHMWSystem = () => {
  const {
    guest,
    ensureGuest,
    getSessionId,
    setSessionId,
    clearSessionId,
  } = useLocalGuest();
  //Session Management
  const [sessionId, _setSessionId] = useState(getSessionId());
  //Navigation & UI State
  const [currentStep, setCurrentStep] = useState('home');
  const [sessionType, setSessionType] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  //User Selection
  const [selectedScenario, setSelectedScenario] = useState(null);
  //Pre-Eval data
  const [aiFeedback, setAiFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  //Interview Data
  const [qaHistory, setQaHistory] = useState([]);
  //Interview Session State
  const [prePlannedQuestion, setPrePlannedQuestion] = useState('');
  const [selectedGroupQuestion, setSelectedGroupQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [followUpQuestions, setFollowUpQuestions] = useState(['', '', '']);
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasAskedPreplanned, setHasAskedPreplanned] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  //Post evaluation data
  const [aiScoreFeedback, setAiScoreFeedback] = useState([])
  //HMW Session State
  const [needs, setNeeds] = useState(Array(3).fill(''));
  const [insights, setInsights] = useState(Array(3).fill(''));
  const [povStatement, setPovStatement] = useState('');
  const [selectedGroupPov, setSelectedGroupPov] = useState('');
  const [hmwQuestions, setHmwQuestions] = useState(Array(3).fill(''));
  const [selectedFinalHmwQuestions, setSelectedFinalHmwQuestions] = useState([]);
  
  //Evaluation State
  const [hmwSelfEval, setHmwSelfEval] = useState({});
  
  //API State

  //Loading states
  const [povLoading, setPovLoading] = useState(false);
  const [hmwLoading, setHmwLoading] = useState(false);
  
  //Results states
  const [povAIResult, setPovAIResult] = useState(null);
  const [hmwAIResults, setHmwAIResults] = useState({});
  
  //Error state
  const [apiError, setApiError] = useState(null);
  
  // ========================================
  // POV & HMW EVALUATION FUNCTIONS
  // ========================================
  
  //POV Evaluation Handler - for sending POV statement to backend AI service for evaluation
  const evaluatePovStatement = async (statement) => {
    setPovLoading(true);
    setApiError(null);
    
    try {
      //convert arrays to numbered list format
      const needsText = needs
        .filter(need => need.trim())
        .map((need, i) => `${i + 1}. ${need}`)
        .join('\n');
      
      const insightsText = insights
        .filter(insight => insight.trim())
        .map((insight, i) => `Insight ${i + 1}: ${insight}`)
        .join('\n');
      
      //Call API with needs, insights, POV
      const result = await apiService.evaluatePOVDynamic(
        statement,      //POV statement to evaluate
        needsText,      //user needs
        insightsText,   //user insights
        statement       //user POV for context (same as the statement being evaluated)
      );
      
      //successful API
      if (result.success) {
        setPovAIResult(result.result); //Store AI feedback for display
      } else {
        setApiError(result.error); //Show error message to user
      }
    } catch (error) {
      //Network Errors
      setApiError('Failed to connect to evaluation service');
      console.error('POV evaluation error:', error);
    } finally {
      setPovLoading(false);
    }
  };

  //HMW Evaluation Handler - for sending HMW to backend
  const evaluateHMWQuestions = async (questions) => {
    setHmwLoading(true);
    setApiError(null);
    const results = {};
    
    try {
      //format needs & insights (same as POV)
      const needsText = needs
        .filter(need => need.trim())
        .map((need, i) => `${i + 1}. ${need}`)
        .join('\n');
      
      const insightsText = insights
        .filter(insight => insight.trim())
        .map((insight, i) => `Insight ${i + 1}: ${insight}`)
        .join('\n');
      
      //Evaluate each question individually
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        //Call API with individual HMW question, needs, insights, POV
        const result = await apiService.evaluateHMWDynamic(
          `${i + 1}. ${question}`,    //Individual HMW question
          needsText,                   //User Needs
          insightsText,                //Insights
          selectedGroupPov             //Selected POV
        );
        
        if (result.success) {
          //Parse the AI response for this individual question
          const parsedFeedback = parseHmwAIFeedback(result.result);
          
          if (parsedFeedback) {
            results[i] = parsedFeedback;
          } else {
            results[i] = result.result;
          }
        } else {
          setApiError(result.error);
          break;
        }
      }
      
      setHmwAIResults(results); //Store results for UI display
    } catch (error) {
      //Handle connection errors
      setApiError('Failed to connect to evaluation service');
      console.error('HMW evaluation error:', error);
    } finally {
      setHmwLoading(false);
    }
  };
  
  // ========================================
  // API TRIGGERS & EFFECTS
  // ========================================
  
  //Transcript Dropdown State
  const [openDropdowns, setOpenDropdowns] = useState({});
  
  //API Trigger for POV Evaluation
   React.useEffect(() => {
    if (sessionId) setSessionId(sessionId);
  }, [sessionId, setSessionId]);
  React.useEffect(() => {
    //Check if we're on the POV feedback step and have all required data
    if (currentStep === 'pov-ai-feedback' && selectedGroupPov && !povAIResult && !povLoading) {
      evaluatePovStatement(selectedGroupPov);
    }
  }, [currentStep, selectedGroupPov, povAIResult, povLoading]);

  //API Trigger for HMW Evaluation
  React.useEffect(() => {
    //Check if we're on HMW evaluation steps
    if (currentStep === 'final-hmw-ai-feedback' || currentStep === 'ai-hmw-eval') {
      //Filter out empty questions before evaluation
      const questionsToEvaluate = selectedFinalHmwQuestions.filter(q => q.trim());
      
      //Only evaluate if we have questions and haven't evaluated yet
      if (questionsToEvaluate.length > 0 && Object.keys(hmwAIResults).length === 0 && !hmwLoading) {
        evaluateHMWQuestions(questionsToEvaluate);
      }
    }
  }, [currentStep, selectedFinalHmwQuestions, hmwAIResults, hmwLoading]);

  const toggleDropdown = (transcriptId, questionType) => {
    const dropdownKey = `${transcriptId}_${questionType}`;
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownKey]: !prev[dropdownKey]
    }));
  };
  //API Trigger for Pre-Evaluation
  React.useEffect(() => {
  if (currentStep === 'ai-question-feedback') {
    setLoading(true);
    apiService.preEvaluation(selectedGroupQuestion, selectedScenario.tag)
      .then(data => {
        setAiFeedback(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }
}, [currentStep, selectedGroupQuestion]);
  //API Trigger for Post-Evaluation
  React.useEffect(() => {
  if (currentStep === 'post-interview-evaluation') {
    const qna = buildQna(qaHistory)
    setLoading(true);
    apiService.postInterview(qna, selectedScenario.tag)
      .then(data => {
        setAiScoreFeedback(data.result);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }
  }, [currentStep, qaHistory]);
  
  // ========================================
  // NAVIGATION & UTILITY FUNCTIONS
  // ========================================
  
  //Navigation function with state reset logic
  const navigateToStep = (step) => {
    setIsTransitioning(true);
    
    //Reset interview session state
    if (step === 'single-question-creation') {
      setPrePlannedQuestion('');
      setChatMessages([]);
      setFollowUpQuestions(['', '', '']);
      setCurrentFollowUpIndex(0);
      setFollowUpQuestion('');
      setIsTyping(false);
      setHasAskedPreplanned(false);
      setInterviewCompleted(false);
      setSelectedGroupQuestion('');
    }
    
    //Reset group evaluation state
    if (step === 'group-question-evaluation') {
      setSelectedGroupQuestion('');
    }
    

    
    //Reset interview session state
    if (step === 'interview-session') {
      setChatMessages([]);
      setFollowUpQuestion('');
      setIsTyping(false);
      setHasAskedPreplanned(false);
      setInterviewCompleted(false);
      setCurrentFollowUpIndex(0);
    }
    
    //Reset HMW session state
    if (step === 'hmw-needs-insights') {
      setNeeds(Array(3).fill(''));
      setInsights(Array(3).fill(''));
      setPovStatement('');
      setSelectedGroupPov('');
      setHmwQuestions(Array(3).fill(''));
              setSelectedFinalHmwQuestions([]);
        setHmwSelfEval({});
    }
    
    //Reset POV creation state
    if (step === 'pov-creation') {
      setPovStatement('');
      setSelectedGroupPov('');
      setPovAIResult(null);
      setApiError(null);
    }
    
    //Reset POV AI feedback state
    if (step === 'pov-ai-feedback') {
      setPovAIResult(null);
      setApiError(null);
    }
    
    //Reset HMW questions state
    if (step === 'hmw-questions-creation') {
      setHmwQuestions(Array(3).fill(''));
      setSelectedFinalHmwQuestions([]);
      setHmwAIResults({});
      setApiError(null);
    }
    
    //Reset HMW AI feedback state
    if (step === 'final-hmw-ai-feedback' || step === 'ai-hmw-eval') {
      setHmwAIResults({});
      setApiError(null);
    }
    
    //Reset transcript dropdown state
    if (step === 'peer-transcript-evaluation') {
      setOpenDropdowns({});
    }
    
    setTimeout(() => {
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 150);
  };

  // ========================================
  // INTERVIEW SYSTEM FUNCTIONS
  // ========================================
  
  //TO BE REPLACED: Scenario-Persona Pairs
  const scenarioPersonaPairs = [
    {
      id: 1,
      tag : 'A',
      scenario: "She scrambles to log in to two different platforms on her phone while her toddler tugs at her leg—then realizes she just missed the assignment submission window.",
      description: "How can we redesign the experience having to hop between different platforms of to-do lists so that it makes her well-prepared and less overwhelmed?",
      persona: {
        name: "Sofia Nguyen",
        role: "Single Parent & Part-Time Evening Student",
        image: "👩‍🎓",
        description: "Holds a high-school diploma; returned to school for career advancement while raising two children alone."
      },
      context: "After a full day at her retail job, Sofia arrives home to dinner prep, homework questions from her 7-year-old, and a group project Zoom call."
    },
    {
      id: 2,
      tag : 'B',
      scenario: "Back home, Roberto finds receipts scattered across the kitchen counter and spends two hours typing them into three separate tools—by which time he's too exhausted to plan tomorrow's prep.",
      description: "How can we redesign the experience of manually recording sales and stocks that drains time and lead to frustration?",
      persona: {
        name: "Roberto Alvarez",
        role: "Independent Coffee Shop Owner",
        image: "👨‍💼",
        description: "Family-owned café operator for 15 years; just introduced a small catering service."
      },
      context: "A sudden lunch-rush catering order arrives just as he's closing the shop for the break time;  he scribbles notes on a receipt, then forgets key details by night's end."
    },
    {
      id: 3,
      tag : 'C',
      scenario: "She scribbles vital signs on paper, then pockets photos of the forms—later realizing several pages are blurry or misplaced.",
      description: "How can we redesign the experience of suffering from unreliable connectivity in rural places for health workers so that they don't feel anxious about missing something critical in their works?",
      persona: {
        name: "Fatima Hassan",
        role: "Community Health Outreach Worker",
        image: "👵",
        description: "Public-health graduate; drives between rural clinics to educate about nutrition and vaccinations."
      },
      context: "Visiting a remote village school, Fatima conducts check-ups for dozens of children but can't connect to the server to log their data on the spot."
    },
    {
      id: 4,
      tag : 'D',
      scenario: "He loses his place in the code, toggles through four apps to triage notifications, and wastes 20 minutes just re-orienting himself.",
      description: "How can we redesign the experience of coding in a startup for software developers so that they don't feel lost in an ocean of information? ",
      persona: {
        name: "Ethan Walker",
        role: "Junior Remote Software Developer",
        image: "👦",
        description: "Computer-science grad working from home for a distributed startup team."
      },
      context: "Mid-afternoon, Ethan's in the zone debugging a complex issue when three chat pings, two email threads, and a build-failure alert pop up simultaneously."
    }
  ];

  //TO BE REPLACED: Groupmate Interview Questions
  const generateGroupmateQuestions = () => {
    const groupmateQuestions = [
      {
        id: 1,
        studentName: "Student A",
        question: prePlannedQuestion,
        isYourQuestion: true
      },
      {
        id: 2,
        studentName: "Student B",
        question: selectedScenario?.id === 1 
          ? "How do you currently organize and prioritize your coursework across multiple online platforms?"
          : selectedScenario?.id === 2
          ? "What challenges do you face when trying to coordinate tasks with team members in different time zones?"
          : selectedScenario?.id === 3
          ? "How do you prefer to track and share your health information with healthcare providers?"
          : "What difficulties do you encounter when trying to stick to a budget as a college student?",
        isYourQuestion: false
      },
      {
        id: 3,
        studentName: "Student C",
        question: selectedScenario?.id === 1 
          ? "Can you describe a recent time when you felt overwhelmed with your online coursework?"
          : selectedScenario?.id === 2
          ? "Tell me about a time when miscommunication affected your team's productivity."
          : selectedScenario?.id === 3
          ? "What concerns do you have about using technology to manage your health?"
          : "How do you decide what expenses are worth spending money on?",
        isYourQuestion: false
      },
      {
        id: 4,
        studentName: "Student D",
        question: selectedScenario?.id === 1 
          ? "What motivates you to stay engaged with online course material when studying remotely?"
          : selectedScenario?.id === 2
          ? "How do you maintain relationships and team spirit in a remote work environment?"
          : selectedScenario?.id === 3
          ? "What would make you feel more confident about using digital health tools?"
          : "What emotions do you experience when thinking about your financial future?",
        isYourQuestion: false
      }
    ];
    return groupmateQuestions;
  };

  //Pre-Interview Rubrics
  const mistakeTypes = [
    {
      id: 'closed_question',
      title: 'Closed Question',
      description: 'Yes/No or single-word responses that limit insight'
    },
    {
      id: 'too_broad',
      title: 'Too Broad/Abstract',
      description: 'Vague themes that lack specificity'
    },
    {
      id: 'premature_solution',
      title: 'Premature Solution',
      description: 'Introduces solutions before exploring user problems'
    },
    {
      id: 'double_barreled',
      title: 'Double-barreled',
      description: 'Combines two questions into one'
    },
    {
      id: 'leading_biased',
      title: 'Leading or Biased Framing',
      description: 'Suggests an answer or embeds assumptions'
    },
    {
      id: 'lacks_relevance',
      title: 'Lacks User Relevance',
      description: 'Does not connect clearly to the user experience or role'
    },
    {
      id: 'overly_narrow',
      title: 'Overly Narrow',
      description: 'Frames the problem so tightly that alternative insights are excluded'
    },
    {
      id: 'unclear_purpose',
      title: 'Unclear Purpose or Flow',
      description: 'The question does not fit logically in the sequence or does not relate to clear objectives'
    }
  ];


  //HMW Rubrics
  const hmwRubrics = [
    {
      id: 'focus_on_user_needs',
      title: 'Focus on User Needs',
      description: 'Does the question clearly reflect a genuine user problem or need revealed during research?'
    },
    {
      id: 'open_endedness',
      title: 'Open-endedness',
      description: 'Does the question allow for a wide range of creative design directions, rather than implying a solution?'
    },
    {
      id: 'balance_of_specificity_and_generality',
      title: 'Balance of Specificity and Generality',
      description: 'Is the scope of the question narrow enough to be useful, but broad enough to inspire multiple ideas?'
    },
    {
      id: 'emotional_resonance',
      title: 'Emotional Resonance',
      description: "Does the question hint at the emotional or experiential aspect of the user's challenge?"
    }
  ];


  //TO BE REPLACED: AI Responses for Interview Questions
  const generateAIResponse = async(question) => {
    if(!question.trim()) return '';
    setIsTyping(true)
    try{
      const isInit = !hasAskedPreplanned 
      const transcript = await apiService.interview(isInit, question, selectedScenario.tag)
      const lastQA = Array.isArray(transcript)
      ? transcript[transcript.length - 1]
      : transcript;
      return lastQA?.answer ?? '';
      // console.log(newQA)
    }catch(err) {
      setError(err.message || 'Unknown error');
    } finally {
      setIsTyping(false);
    }
  };

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="text-center mb-12 fade-in">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Design Thinking Learning System</h1>
          <p className="text-xl text-gray-600">
            Choose your learning session to improve your design research skills
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Interview System */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 slide-in-left">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mr-4">
                <MessageCircle className="w-6 h-6 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Interview System</h2>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Practice conducting user interviews with AI personas. Create questions, get group feedback, 
              receive AI guidance, and conduct simulated interviews with follow-up questions.
            </p>

            <button 
              onClick={() => {
                setSelectedScenario(null);
                setSessionType('interview');
                navigateToStep('scenario-selection');
              }}
              className="w-full bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-200 flex items-center justify-center hover:transform hover:scale-105 smooth-hover"
            >
              Start Interview Training
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>

          {/* HMW System */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 slide-in-right">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">POV & HMW System</h2>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Learn to create Point of View statements and generate How Might We questions. 
              Practice synthesizing research into actionable design challenges with AI feedback.
            </p>

            <button 
              onClick={() => {
                setSelectedScenario(null);
                setSessionType('hmw');
                navigateToStep('hmw-needs-insights');
              }}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center justify-center hover:transform hover:scale-105 smooth-hover"
            >
              Start POV & HMW Training
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  const personaSelection = async (tag) => {
    await apiService.personaRetrieval(tag);
  };
  const renderScenarioSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8 slide-in-left">
          <button 
            onClick={() => navigateToStep('home')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Scenario & Persona</h1>
          <p className="text-xl text-gray-600">Select a design scenario and the persona you'll be working with</p>
        </div>
        
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
                   <p className="text-xs text-gray-700 leading-relaxed">
                     <span className="font-semibold text-blue-800">Context:</span> {pair.context}
                   </p>
                 </div>
                 <div className="bg-blue-50 p-3 rounded-lg">
                   <p className="text-xs text-gray-700 leading-relaxed">
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
              onClick={() => {
                if (sessionType === 'interview') {
                  personaSelection(selectedScenario.tag)
                  navigateToStep('single-question-creation');
                } else {
                  personaSelection(selectedScenario.tag)
                  navigateToStep('hmw-needs-insights');
                }
              }}
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

  const renderSingleQuestionCreation = () => (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8 slide-in-left">
          <button 
            onClick={() => navigateToStep('scenario-selection')}
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
              onClick={() => navigateToStep('group-question-evaluation')}
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
  const renderGroupQuestionEvaluation = () => {
    const groupmateQuestions = generateGroupmateQuestions();

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6 flex items-center justify-center">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center mb-8 slide-in-left">
            <button 
              onClick={() => navigateToStep('single-question-creation')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Question Creation
            </button>
          </div>

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
                onClick={() => 
                {
                  navigateToStep('ai-question-feedback')
                }}
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

  const renderAIQuestionFeedback = () => {
    if (loading) {
      return (
        <LoadingPage
          type="ai-evaluation"
          title="Loading AI feedback..."
          subtitle=""
        />
      );
    }
    if(error || !aiFeedback){
      return <p>No AI feedback available.</p>
    }

    // Fix: Access the eval property from aiFeedback
    const { mistakes, response } = aiFeedback.eval || aiFeedback;

    // console.log("Mistakes : ", mistakes, "Response :", response)
    let mistakesArray = Array.isArray(mistakes) ? mistakes : [mistakes];
    let responseArray = Array.isArray(response) ? response : [response] 
    // console.log(aiFeedback)
    // const {mistakes, response} = preAIEval(selectedGroupQuestion, selectedScenario.tag)
    const getMistakeId = (typeArray, findFunction) => {
      const mistake = typeArray.find(findFunction)
      return mistake?.id
    };
    const getMistakeDesc = (typeArray, findFunction) =>{
      const mistake = typeArray.find(findFunction)
      return mistake?.description
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center mb-8 slide-in-left">
            <button 
              onClick={() => navigateToStep('group-question-evaluation')}
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
                onClick={() => navigateToStep('interview-session')}
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

  //Chat Function
  const addMessageToChat = (message, sender) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      sender: sender,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const sendPreplannedQuestion = async () => {
          if (selectedGroupQuestion.trim() && !hasAskedPreplanned) {
        addMessageToChat(selectedGroupQuestion, 'user');
        const newAnswer = await generateAIResponse(selectedGroupQuestion)
        addMessageToChat(newAnswer, 'ai');
      setQaHistory(prev => [
      ...prev,
      { question: selectedGroupQuestion, answer: newAnswer }
    ]);
      setHasAskedPreplanned(true);
    }
  };

  const sendFollowUpQuestion = async () => {
    const q = followUpQuestion.trim();
      if (!q || currentFollowUpIndex >= 3) return;
      addMessageToChat(q, 'user');
      const aiAnswer = await generateAIResponse(q);
      addMessageToChat(aiAnswer, 'ai');
    setQaHistory(prev => [
    ...prev,
    { question: q, answer: aiAnswer }
  ]);
    setCurrentFollowUpIndex(i => i + 1);
      if (currentFollowUpIndex + 1 >= 3) {
      setInterviewCompleted(true);
    }
      setFollowUpQuestion('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!hasAskedPreplanned) {
        sendPreplannedQuestion();
      } else {
        sendFollowUpQuestion();
      }
    }
  };

  const renderInterviewSession = () => (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => navigateToStep('ai-question-feedback')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to AI Feedback
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Interview Session</h1>
          </div>

          <div className="flex items-center mb-6">
            <div className="text-4xl mr-4">{selectedScenario.persona.image}</div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{selectedScenario.persona.name}</h3>
              <p className="text-teal-600">● Online</p>
              <p className="text-sm text-gray-500 break-words overflow-hidden">{selectedScenario.persona.description}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6 h-96 overflow-y-auto custom-scrollbar">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start the interview by asking your pre-planned question below.</p>
              </div>
            )}
            
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words overflow-hidden ${
                    message.sender === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border shadow-sm'
                  }`}>
                    <p className="text-sm break-words overflow-hidden">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border shadow-sm px-4 py-3 rounded-lg max-w-xs">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-600 font-medium">{selectedScenario.persona.name} is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!hasAskedPreplanned && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Selected Question:</h3>
              <div className="grid gap-3">
                <button
                  onClick={sendPreplannedQuestion}
                  disabled={isTyping}
                  className="text-left p-4 rounded-lg border transition-all break-words overflow-hidden bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300"
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 bg-teal-500 text-white">
                      1
                    </div>
                    <span className="break-words overflow-hidden">
                      {selectedGroupQuestion}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {hasAskedPreplanned && !interviewCompleted && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Ask Follow-up Question ({currentFollowUpIndex + 1}/3):
              </h3>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Type your follow-up question ${currentFollowUpIndex + 1} here...`}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={isTyping}
                />
                <button
                  onClick={sendFollowUpQuestion}
                  disabled={!followUpQuestion.trim() || isTyping}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center ${
                    followUpQuestion.trim() && !isTyping
                      ? 'bg-teal-600 text-white hover:bg-teal-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Progress:</span>
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((index) => (
                      <div 
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          index < currentFollowUpIndex 
                            ? 'bg-teal-500' 
                            : index === currentFollowUpIndex 
                            ? 'bg-teal-300' 
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {interviewCompleted && (
            <div className="text-center mt-8 pt-6 border-t">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-green-800 mb-2">Interview Completed!</h3>
                <p className="text-green-700">
                  You've successfully completed the interview with {selectedScenario.persona.name}. 
                </p>
              </div>
              <button 
                onClick={() => navigateToStep('transcript-review')}
                className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center mx-auto"
              >
                Review Interview Transcript
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTranscriptReview = () => {
    const getMessageType = (message, index) => {
      if (message.text === selectedGroupQuestion) return 'main-question';
      if (message.sender === 'user' && message.text !== selectedGroupQuestion) return 'follow-up';
      return 'response';
    };
    const userFollowUps = chatMessages
      .filter(msg => msg.sender === 'user' && msg.text !== selectedGroupQuestion)
      .map(msg => msg.text);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigateToStep('interview-session')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Interview
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Interview Transcript</h1>

            <div className="space-y-4 mb-8">
              {chatMessages.map((message, index) => {
                const messageType = getMessageType(message, index);
                return (
                  <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          message.sender === 'user' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {message.sender === 'user' ? 'You' : selectedScenario.persona.name}
                        </span>
                        {messageType === 'main-question' && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                            Main Question
                          </span>
                        )}
                        {messageType === 'follow-up' && (
                          <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                            Follow-up
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{message.timestamp}</span>
                    </div>
                    <p className="text-gray-700 break-words overflow-hidden leading-relaxed">
                      {message.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Questions Analysis</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Main Question:</h4>
                  <p className="text-gray-600 bg-white p-3 rounded border break-words overflow-hidden">
                    "{selectedGroupQuestion}"
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Follow-up Questions:</h4>
                  <div className="space-y-2">
                    {userFollowUps.filter(q => q.trim()).map((question, index) => (
                      <p key={index} className="text-gray-600 bg-white p-3 rounded border break-words overflow-hidden">
                        {index + 1}. "{question}"
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => navigateToStep('peer-transcript-evaluation')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center"
              >
                Continue to Peer Evaluation
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPeerTranscriptEvaluation = () => {
    const generateGroupmateTranscripts = () => {
      const yourResponses = chatMessages.filter(msg => msg.sender === 'ai').map(msg => msg.text);
      const yourFollowUps = chatMessages
        .filter(msg => msg.sender === 'user' && msg.text !== selectedGroupQuestion)
        .map(msg => msg.text);
      
      return [
        {
          id: 1,
          studentName: "Student A (You)",
          isYourTranscript: true,
          mainQuestion: selectedGroupQuestion,
          mainQuestionResponse: yourResponses[0] || "Thank you for that question. Let me share my perspective on this...",
          followUps: yourFollowUps.filter(q => q.trim()),
          followUpResponses: yourResponses.slice(1) || [
            "That's a really insightful follow-up. Let me elaborate on that aspect...",
            "You're touching on something important here. From my experience...",
            "That's exactly the kind of detail that helps me understand better..."
          ],
          insights: []
        },
        {
          id: 2,
          studentName: "Student B",
          isYourTranscript: false,
          mainQuestion: selectedScenario?.id === 1 
            ? "How do you currently organize and prioritize your coursework across multiple online platforms?"
            : selectedScenario?.id === 2
            ? "What challenges do you face when trying to coordinate tasks with team members in different time zones?"
            : selectedScenario?.id === 3
            ? "How do you prefer to track and share your health information with healthcare providers?"
            : "What difficulties do you encounter when trying to stick to a budget as a college student?",
          mainQuestionResponse: selectedScenario?.id === 1
            ? "It's honestly pretty chaotic right now. I have Google Classroom for one course, Canvas for two others, and then my research advisor uses Slack for communication. I spend the first 30 minutes of every day just checking all these different platforms to see what's due and what's been updated. It's exhausting and I feel like I'm always missing something important."
            : selectedScenario?.id === 2
            ? "The biggest challenge is that when I send a message or email, I never know when people will see it. Like, I might need input on something by end of day, but half my team is just starting their workday when I'm wrapping up. We end up having these long email chains that take days to resolve something that could be figured out in a 10-minute conversation."
            : selectedScenario?.id === 3
            ? "Well, I'm still pretty new to all this digital stuff. My doctor gave me this blood pressure monitor that connects to an app, but honestly, I'm not sure if I'm using it right. The numbers show up on my phone, but I don't really know what they mean or if I should be worried. I'd rather just write things down on paper like I always have."
            : "I guess the biggest difficulty is that I never learned how to budget properly. My parents always handled money stuff, and now I'm on my own with a credit card and student loans. I try to keep track of what I spend, but then unexpected things come up like textbooks or my laptop breaking, and suddenly I'm way over whatever limit I thought I had.",
          followUps: [
            "Can you walk me through a typical day when this happens?",
            "How does that make you feel?",
            "What would need to change for this to work better for you?"
          ],
          followUpResponses: [
            selectedScenario?.id === 1
              ? "So yesterday was a perfect example. I woke up and checked my phone - three different notifications about assignments. One was due that day that I completely forgot about. I spent my morning panic-rushing through it instead of working on my research. Then I missed a discussion post deadline in another class because it was buried in a different system. By evening I felt completely scattered and behind on everything."
              : selectedScenario?.id === 2
              ? "Yesterday I needed feedback on a project proposal from my team leads in London and Singapore. I sent it Monday morning my time, heard back from London Tuesday, but Singapore didn't respond until Thursday their time, which was Wednesday night for me. By then the client call was Friday morning and we still weren't aligned. I ended up staying up until 2 AM to revise everything after getting Singapore's input."
              : selectedScenario?.id === 3
              ? "Yesterday morning I took my blood pressure like my doctor said, and the app showed some red numbers. I didn't know if that meant I should call the doctor right away or if it was normal for morning readings. I ended up worrying about it all day, but I felt silly calling the doctor's office for something that might be nothing. I wish I could just show the numbers to someone who could tell me if I need to be concerned."
              : "Yesterday I went to buy groceries and planned to spend $50, but then I remembered I needed laundry detergent and some other things. At checkout it was $87. Then I got a text that my car insurance payment bounced because I forgot it comes out mid-month. Now I'm stressed about overdraft fees and whether I have enough for rent next week.",
            selectedScenario?.id === 1
              ? "Frustrated and overwhelmed, honestly. Like I'm always playing catch-up instead of being proactive. I feel stupid for missing things, even though I know it's not really my fault that everything is so disorganized. Sometimes I wonder if I'm just not cut out for managing all this digital complexity."
              : selectedScenario?.id === 2
              ? "Really frustrated and kind of helpless. Like I'm trying to do my job well, but the system is working against me. I feel bad for my team too because I know they're dealing with the same thing. Sometimes I wonder if remote work is just inherently inefficient, or if we're missing some obvious solution."
              : selectedScenario?.id === 3
              ? "Anxious and a bit embarrassed, to be honest. I don't want to seem like I can't handle technology, but I also don't want to make mistakes with my health. It makes me feel old and out of touch, which isn't a good feeling. I wish there was someone patient who could sit with me and explain how all this works."
              : "Honestly, pretty anxious and kind of ashamed. I feel like everyone else my age has this figured out, and I'm just bad with money. It's embarrassing to be 20 years old and not know how to manage basic finances. Sometimes I avoid checking my bank account because I'm afraid of what I'll see.",
            selectedScenario?.id === 1
              ? "I think I need one central place where everything shows up. Not just a calendar, but actually integrated so I can see assignments, communications, and deadlines all in one view. And it needs to be smart enough to prioritize things for me and remind me when something is urgent. Basically, I need it to think ahead so I don't have to constantly worry about what I'm forgetting."
              : selectedScenario?.id === 2
              ? "We need better ways to work asynchronously but still stay connected. Maybe something that shows everyone's schedules and automatically suggests meeting times, or a system that routes urgent decisions to whoever is online right now instead of waiting for specific people. And clearer expectations about response times for different types of requests."
              : selectedScenario?.id === 3
              ? "I need something that explains what the numbers mean in plain English, right when I'm looking at them. Like, instead of just showing '145/90', it should say something like 'This is slightly high, but not an emergency. Talk to your doctor at your next appointment.' And maybe a simple way to share the important readings with my daughter so she can help me understand what to watch for."
              : "I think I need a system that teaches me as I go, not just tracks what I spend. Like, if I'm about to go over budget, it should warn me and maybe suggest what I could skip this month. And it should help me plan for those unexpected expenses by showing me patterns of what I typically spend beyond my basic budget."
          ],
          insights: ["Strong emotional probing", "Good progression from general to specific"]
        },
        {
          id: 3,
          studentName: "Student C",
          isYourTranscript: false,
          mainQuestion: selectedScenario?.id === 1 
            ? "Can you describe a recent time when you felt overwhelmed with your online coursework?"
            : selectedScenario?.id === 2
            ? "Tell me about a time when miscommunication affected your team's productivity."
            : selectedScenario?.id === 3
            ? "What concerns do you have about using technology to manage your health?"
            : "How do you decide what expenses are worth spending money on?",
          mainQuestionResponse: selectedScenario?.id === 1
            ? "Just last week, actually. I had three major assignments due within two days, all for different classes, and each professor had different submission requirements. One wanted it uploaded to Canvas, another through email, and the third through some third-party platform I'd never used before. I spent more time figuring out how to submit things than actually working on the content. I was up until 3 AM and still barely made the deadlines."
            : selectedScenario?.id === 2
            ? "A few weeks ago we were working on a major client presentation. I thought everyone understood that I was handling the technical specifications section, but it turned out my colleague in our Berlin office was also working on the same thing. We both spent hours on it, and when we tried to combine our work the day before the presentation, we realized we had completely different interpretations of what the client wanted. We had to scramble to create something coherent."
            : selectedScenario?.id === 3
            ? "My biggest concern is privacy, honestly. I don't really understand where all this health information goes or who can see it. When I connect my devices to apps, are insurance companies getting that data? Could it affect my coverage? And what if the technology breaks or gets hacked? I don't want my personal health information floating around the internet where anyone could access it."
            : "I think about whether it's something that will improve my life long-term versus just something I want in the moment. Like, I'll spend money on good shoes because I know they'll last and my feet won't hurt. But I try not to buy clothes just because they're trendy. I also think about whether it's something that will help me reach my goals - like I'll spend money on career development or networking events, but not on expensive dinners out every week.",
          followUps: [
            "What was going through your mind at that time?",
            "Who else was involved in this situation?",
            "What did you try to do about it?"
          ],
          followUpResponses: [
            selectedScenario?.id === 1
              ? "I was thinking 'This is ridiculous.' I felt like I was spending more energy navigating technology than actually learning. I started questioning whether online education was right for me, even though I know it's more convenient for my schedule. There was this voice in my head saying 'You're just not tech-savvy enough' which made me feel even worse."
              : selectedScenario?.id === 2
              ? "I was frustrated and confused. I kept thinking 'How did this happen?' We use all these collaboration tools supposedly to prevent exactly this kind of thing. I felt bad for wasting both our time, but also annoyed that our systems failed us. I was worried the client would think we were disorganized and unprofessional."
              : selectedScenario?.id === 3
              ? "I worry that I'm being paranoid, but I also think maybe I should be more careful. I see stories on the news about data breaches and identity theft, and I think about how vulnerable all this information makes me. I don't understand the technology well enough to know what's safe and what isn't, so I end up being cautious about everything."
              : "I'm usually thinking about my future self. Like, 'Will future me be grateful I spent this money or regretful?' I try to imagine myself in six months or a year and whether this purchase will seem worthwhile then. Sometimes I'll put things in my cart and then wait a day or two to see if I still want them.",
            selectedScenario?.id === 1
              ? "Nobody else was directly involved, which made it worse. If I had a study group or someone to ask for help, maybe it would have been easier. I felt very alone in trying to figure everything out. I did eventually call the IT help desk for one of the platforms, but they couldn't help with how to actually navigate the assignment requirements."
              : selectedScenario?.id === 2
              ? "My colleague in Berlin and I were both working on it, plus our project manager who should have been coordinating but was managing three other projects. The client was involved indirectly because we had to keep asking for clarifications, which probably made us look unprepared. The whole situation involved too many people with unclear roles."
              : selectedScenario?.id === 3
              ? "My doctor recommended these apps and devices, and my adult children think I should use them because they worry about me living alone. But I don't think any of them really understand my privacy concerns. They grew up with technology and are comfortable sharing everything online. I come from a generation where personal information was kept private."
              : "Usually I'll talk to my roommate or call my mom if it's a bigger purchase. They help me think through whether I really need something or if I'm just being impulsive. My mom is really good at asking questions like 'Where will you put it?' or 'When will you use it?' that help me be more realistic.",
            selectedScenario?.id === 1
              ? "I tried making a spreadsheet to track all the different requirements for each class, but it was so complicated that maintaining the spreadsheet became another task I was stressed about. I also tried setting up notifications on my phone, but then I was getting so many alerts that I started ignoring them all. Eventually I just brute-forced through it, but I knew that wasn't sustainable."
              : selectedScenario?.id === 2
              ? "I tried to salvage both pieces of work by finding ways to combine them, but they were structured completely differently. We ended up having an emergency video call at a terrible time for both our time zones to try to fix it. I suggested we put better communication protocols in place for future projects, but I'm not sure anything actually changed."
              : selectedScenario?.id === 3
              ? "I asked my doctor about privacy, but they didn't really have good answers - they just said the apps are 'secure.' I looked up the companies online to try to understand their privacy policies, but the legal language was impossible to understand. I'm still using some of the technology, but I'm very selective about what information I'm willing to share."
              : "I started using a budgeting app to track my spending patterns, which has been helpful. I also have a rule where I wait 24 hours before buying anything over $50. And I've started thinking more about cost per use - like, if something costs $100 but I'll use it every day for a year, that's better than something that costs $20 but I'll only use once."
          ],
          insights: ["Good use of storytelling", "Explored context well"]
        }
      ];
    };

    const groupmateTranscripts = generateGroupmateTranscripts();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigateToStep('transcript-review')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Transcript
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Peer Transcript Comparison</h1>
            <p className="text-gray-600 mb-4">
              Compare your interview transcript with your groupmates. Look at the different approaches 
              to follow-up questions and note what techniques were most effective.
            </p>

            <div className="space-y-6">
              {groupmateTranscripts.map((transcript, index) => (
                <div 
                  key={transcript.id}
                  className={`border-2 rounded-lg p-6 ${
                    transcript.isYourTranscript 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      {transcript.studentName}
                    </h3>
                    {transcript.isYourTranscript && (
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                        Your Transcript
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Main Question Section */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Main Question:</h4>
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => toggleDropdown(transcript.id, 'main')}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 break-words overflow-hidden flex-1 text-sm">
                            "{transcript.mainQuestion}"
                          </span>
                          {openDropdowns[`${transcript.id}_main`] ? (
                            <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                          )}
                        </button>
                        
                        {openDropdowns[`${transcript.id}_main`] && (
                          <div className="border-t border-gray-200 p-4 bg-blue-50">
                            <div className="flex items-start">
                              <div className="text-2xl mr-3 flex-shrink-0">{selectedScenario.persona.image}</div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-blue-800 mb-2">{selectedScenario.persona.name}'s Response:</h5>
                                <p className="text-blue-700 text-sm break-words overflow-hidden leading-relaxed">
                                  {transcript.mainQuestionResponse}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/*Follow-up Questions Section*/}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Follow-up Questions:</h4>
                      <div className="space-y-3">
                        {transcript.followUps.map((question, qIndex) => (
                          <div key={qIndex} className="border border-gray-200 rounded-lg">
                            <button
                              onClick={() => toggleDropdown(transcript.id, `followup_${qIndex}`)}
                              className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-gray-700 break-words overflow-hidden flex-1 text-sm">
                                {qIndex + 1}. "{question}"
                              </span>
                              {openDropdowns[`${transcript.id}_followup_${qIndex}`] ? (
                                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                              )}
                            </button>
                            
                            {openDropdowns[`${transcript.id}_followup_${qIndex}`] && (
                              <div className="border-t border-gray-200 p-4 bg-green-50">
                                <div className="flex items-start">
                                  <div className="text-2xl mr-3 flex-shrink-0">{selectedScenario.persona.image}</div>
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-green-800 mb-2">{selectedScenario.persona.name}'s Response:</h5>
                                    <p className="text-green-700 text-sm break-words overflow-hidden leading-relaxed">
                                      {transcript.followUpResponses && transcript.followUpResponses[qIndex] 
                                        ? transcript.followUpResponses[qIndex] 
                                        : "Response not available for this follow-up question."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <button 
                onClick={() => navigateToStep('post-interview-evaluation')}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center"
              >
                Continue to Final Evaluation
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPostInterviewEvaluation = () => (
    loading ? (
      <LoadingPage
        type="ai-evaluation"
        title="Scoring your interview with AI..."
        subtitle=""
      />
    ) : (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => navigateToStep('peer-transcript-evaluation')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Peer Evaluation
          </button>
        </div>

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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h3 className="text-xl font-bold text-blue-800 mb-3">Overall Feedback</h3>
            <p className="text-blue-700 break-words overflow-hidden">
              Great work on your interview session! You successfully completed the structured interview process 
              with a clear main question and three relevant follow-ups. Your questioning approach showed good 
              progression from broad to specific, and you maintained focus on the user's experience. For future 
              interviews, continue to focus on emotional responses and the 'why' behind user behaviors.
            </p>
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigateToStep('home')}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-200 hover:transform hover:scale-105 smooth-hover"
            >
              Complete Interview Training
            </button>
          </div>
        </div>
      </div>
    </div>)
  );



  const renderNeedsInsights = () => {
    const completedNeeds = needs.filter(need => need.trim()).length;
    const completedInsights = insights.filter(insight => insight.trim()).length;
    const totalCompleted = completedNeeds + completedInsights;
    const isComplete = completedNeeds >= 3 && completedInsights >= 3;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 p-6 flex items-center justify-center">
        <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
              onClick={() => navigateToStep('home')}
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
                onClick={() => navigateToStep('pov-creation')}
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

  const renderPovCreation = () => {
    const isComplete = povStatement.trim().length > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigateToStep('hmw-needs-insights')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Needs & Insights
            </button>
          </div>

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
                onClick={() => navigateToStep('pov-group-comparison')}
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

  //TO BE REPLACED: Sample Groupmate POV Statements
  const generateGroupmatePovStatements = () => {
    return [
      {
        id: 1,
        studentName: "Student A (You)",
        statement: povStatement,
        isYourStatement: true
      },
      {
        id: 2,
        studentName: "Student B",
        statement: "Users need to have intuitive and accessible interfaces because complex systems create barriers and prevent effective engagement with digital tools.",
        isYourStatement: false
      },
      {
        id: 3,
        studentName: "Student C",
        statement: "Users need to feel supported and connected in their digital experiences because isolation and lack of guidance lead to frustration and abandonment of tools.",
        isYourStatement: false
      },
      {
        id: 4,
        studentName: "Student D", 
        statement: "Users need to have personalized and flexible solutions because one-size-fits-all approaches don't accommodate diverse needs and preferences.",
        isYourStatement: false
      }
    ];
  };

  const renderPovGroupComparison = () => {
    const groupmatePovStatements = generateGroupmatePovStatements();

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6 flex items-center justify-center">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center mb-8 slide-in-left">
            <button 
              onClick={() => navigateToStep('pov-creation')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to POV Creation
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 fade-in">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Group POV Comparison</h1>
            <p className="text-gray-600 mb-8">
              Review all the POV statements from your group members and select the best one to use for creating HMW questions. 
              Consider which statement best captures the user's needs and provides the strongest foundation for ideation.
            </p>

            <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center mb-3">
                <Users className="w-5 h-5 text-teal-600 mr-2" />
                <h3 className="font-semibold text-teal-800">Group POV Statements</h3>
              </div>
              <p className="text-teal-700 text-sm">
                Design Challenge Analysis
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {groupmatePovStatements.map((item, index) => (
                <div 
                  key={item.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                    selectedGroupPov === item.statement
                      ? 'border-teal-500 bg-teal-50 shadow-md'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-teal-25'
                  }`}
                  onClick={() => setSelectedGroupPov(item.statement)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        item.isYourStatement ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {item.studentName} {item.isYourStatement && '(You)'}
                        </h4>
                        {item.isYourStatement && (
                          <span className="text-orange-600 text-xs font-medium">Your POV Statement</span>
                        )}
                      </div>
                    </div>
                    {selectedGroupPov === item.statement && (
                      <CheckCircle className="w-6 h-6 text-teal-600" />
                    )}
                  </div>
                  <p className="text-gray-700 break-words overflow-hidden leading-relaxed pl-11">
                    "{item.statement}"
                  </p>
                </div>
              ))}
            </div>


            <div className="flex justify-center">
              <button 
                onClick={() => navigateToStep('pov-ai-feedback')}
                disabled={!selectedGroupPov}
                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center hover:transform hover:scale-105 ${
                  selectedGroupPov
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

  // ========================================
  // AI CONTENT PARSING FUNCTIONS
  // ========================================
  
  // Helper function to extract content from LangChain response objects
  const extractAIContent = (aiResponse) => {
    if (!aiResponse) return null;
    
    // If it's already a string, return it
    if (typeof aiResponse === 'string') {
      return aiResponse;
    }
    
    // Extract from LangChain response object
    if (aiResponse && typeof aiResponse === 'object') {
      if (aiResponse.kwargs && aiResponse.kwargs.content) {
        return aiResponse.kwargs.content;
      } else if (aiResponse.content) {
        return aiResponse.content;
      }
    }
    
    console.error('Invalid AI response format:', aiResponse);
    return null;
  };

  const parsePovAIFeedback = (rawFeedback) => {
    if (!rawFeedback) return null;
    
    const feedbackText = extractAIContent(rawFeedback);
    if (!feedbackText) return null;
    
    const rubrics = [
      { id: 'actionable', title: 'Actionable' },
      { id: 'generative', title: 'Generative' },
      { id: 'clear_problem', title: 'Clear Problem' }
    ];
    
    const results = [];
    
    rubrics.forEach(rubric => {
      const pattern = new RegExp(`\\*\\*${rubric.title}:\\s*(\\d)\\*\\*\\s*\\n\\s*-\\s*Deduction Reason:\\s*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
      const match = feedbackText.match(pattern);
      
      if (match) {
        results.push({
          ...rubric,
          score: parseInt(match[1]),
          reason: match[2].trim()
        });
      }
    });
    
    return results.length > 0 ? results : null;
  };

  const parseHmwAIFeedback = (rawFeedback) => {
    if (!rawFeedback) return null;
    
    const feedbackText = extractAIContent(rawFeedback);
    if (!feedbackText) return null;
    
    const rubrics = [
      { id: 'focus_on_user_needs', title: 'Focus on user needs' },
      { id: 'open_endedness', title: 'Open-endedness' },
      { id: 'balance_of_specificity', title: 'Balance of specificity and generality' },
      { id: 'emotional_resonance', title: 'Emotional Resonance' }
    ];
    
    const results = [];
    
    rubrics.forEach(rubric => {
      const pattern = new RegExp(`\\*\\*${rubric.title}:\\s*(\\d)\\*\\*\\s*\\n\\s*-\\s*Deduction Reason:\\s*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
      const match = feedbackText.match(pattern);
      
      if (match) {
        results.push({
          ...rubric,
          score: parseInt(match[1]),
          reason: match[2].trim()
        });
      }
    });
    
    return results.length > 0 ? results : null;
  };

  // ========================================
  // RENDERING FUNCTIONS
  // ========================================
  
  const renderPovAiFeedback = () => {
    if (povLoading) {
      return (
        <LoadingPage
          type="ai-evaluation"
          title="Evaluating your POV statement with AI..."
          subtitle=""
        />
      );
    }
    const parsedFeedback = parsePovAIFeedback(povAIResult);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center mb-8 slide-in-left">
            <button 
              onClick={() => navigateToStep('pov-group-comparison')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Group Comparison
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 fade-in">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">AI Feedback on POV Statement</h1>

            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h3 className="font-semibold text-indigo-800 mb-3">Selected POV Statement:</h3>
              <p className="text-indigo-700 break-words overflow-hidden text-lg">"{selectedGroupPov}"</p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Analysis</h2>
              

              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-red-600 font-bold text-sm">!</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">Error</h4>
                      <p className="text-red-700 text-sm">{apiError}</p>
                      <button 
                        onClick={() => evaluatePovStatement(selectedGroupPov)}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {parsedFeedback && !povLoading && (
                <div className="space-y-6">
                  {parsedFeedback.map((rubric) => (
                    <div key={rubric.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-800">{rubric.title}</h3>
                        <div className="flex items-center">
                          <span className="text-2xl font-bold text-indigo-600 mr-2">{rubric.score}/5</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-5 h-5 ${i < rubric.score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <p className="text-indigo-800 break-words overflow-hidden">
                          {rubric.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {povAIResult && !parsedFeedback && !povLoading && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                      <span className="text-indigo-600 font-bold text-sm">AI</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-indigo-800 mb-3">AI Evaluation Results</h4>
                      <div className="text-indigo-700 text-sm leading-relaxed whitespace-pre-line">
                        {extractAIContent(povAIResult)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => navigateToStep('hmw-questions-creation')}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 flex items-center hover:transform hover:scale-105 smooth-hover"
              >
                Continue to HMW Questions
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHMWQuestionsCreation = () => {
    const completedHMWQuestions = hmwQuestions.filter(q => q.trim()).length;
    const isComplete = completedHMWQuestions >= 3;

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
              onClick={() => navigateToStep('selected-pov')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-200 hover:transform hover:translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Selected POV
          </button>
        </div>

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
                onClick={() => navigateToStep('hmw-group-selection')}
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

  const renderHmwGroupSelection = () => {
    //TO BE REPLACED: HMW Question Generation
    const generateGroupmateHmwQuestions = () => {
      const baseQuestions = [
        "How might we make the user experience more intuitive and accessible?",
        "How might we reduce the cognitive load for users?",
        "How might we create better tools for organization and planning?",
        "How might we help users feel more connected and supported?",
        "How might we improve communication and collaboration?",
        "How might we make complex processes simpler and more engaging?",
        "How might we help users achieve their goals more effectively?",
        "How might we create better feedback and progress tracking?",
        "How might we reduce barriers and increase accessibility?",
        "How might we make the experience more personalized and relevant?"
      ];

      const allQuestions = [];
      
      hmwQuestions.filter(q => q.trim()).forEach((question, index) => {
        allQuestions.push({
          question,
          studentName: "Student A (You)",
          isYours: true,
          questionId: `user_${index}`
        });
      });
      
      baseQuestions.slice(0, 9).forEach((question, index) => {
        const studentNames = ["Student B", "Student C", "Student D"];
        const studentName = studentNames[index % 3];
        allQuestions.push({
          question,
          studentName,
          isYours: false,
          questionId: `groupmate_${index}`
        });
      });

      return allQuestions;
    };

    const allQuestions = generateGroupmateHmwQuestions();

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-6 flex items-center justify-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigateToStep('hmw-questions-creation')}
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
                    onClick={() => {
                      if (selectedFinalHmwQuestions.includes(item.question)) {
                        setSelectedFinalHmwQuestions(prev => prev.filter(q => q !== item.question));
                      } else if (selectedFinalHmwQuestions.length < 3) {
                        setSelectedFinalHmwQuestions(prev => [...prev, item.question]);
                      }
                    }}
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
                onClick={() => navigateToStep('final-hmw-ai-feedback')}
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

  const renderHMWSelfEval = () => {
    const completedQuestions = hmwQuestions.filter(q => q.trim());
    
    const handleRatingChange = (questionIndex, rubricId, rating) => {
      setHmwSelfEval(prev => ({
        ...prev,
        [`${rubricId}_${questionIndex}`]: rating
      }));
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigateToStep('hmw-questions-creation')} 
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to HMW Questions Creation
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Self-Evaluate Your HMW Questions</h1>
            <p className="text-gray-600 mb-6">
              Rate each of your How Might We questions using the provided rubrics. This will help you identify 
              strengths and areas for improvement in your question formulation.
            </p>
          </div>
          
          <div className="space-y-8">
            {completedQuestions.map((question, questionIndex) => (
              <div key={questionIndex} className="bg-white rounded-2xl shadow-xl p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Question {questionIndex + 1}
                  </h2>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <p className="text-gray-700 break-words overflow-hidden leading-relaxed text-lg">
                      {question}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {hmwRubrics.map((rubric) => (
                    <div key={rubric.id} className="border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{rubric.title}</h3>
                      <p className="text-gray-600 mb-4 break-words overflow-hidden">
                        {rubric.description}
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Rate this aspect:</span>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => handleRatingChange(questionIndex, rubric.id, rating)}
                              className={`w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center font-semibold ${
                                hmwSelfEval[`${rubric.id}_${questionIndex}`] === rating
                                  ? 'bg-pink-500 border-pink-500 text-white shadow-lg transform scale-110'
                                  : 'border-gray-300 text-gray-600 hover:border-pink-400 hover:text-pink-600'
                              }`}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigateToStep('ai-hmw-eval')}
              disabled={!hmwRubrics.every(rubric => 
                completedQuestions.every((_, questionIndex) => 
                  hmwSelfEval[`${rubric.id}_${questionIndex}`]
                )
              )}
              className={`px-10 py-4 rounded-xl font-semibold transition-all duration-200 hover:transform hover:scale-105 smooth-hover text-lg shadow-lg ${
                hmwRubrics.every(rubric => 
                  completedQuestions.every((_, questionIndex) => 
                    hmwSelfEval[`${rubric.id}_${questionIndex}`]
                  )
                ) 
                  ? 'bg-pink-600 text-white hover:bg-pink-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to AI Evaluation
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFinalHmwAiFeedback = () => {
    if (hmwLoading) {
      return (
        <LoadingPage
          type="ai-evaluation"
          title="Evaluating your HMW questions with AI..."
          subtitle=""
        />
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-100 p-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigateToStep('hmw-group-selection')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Group Selection
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Evaluation of Final HMW Questions</h1>
            <p className="text-gray-600 mb-6">
              Our AI has evaluated your 3 selected HMW questions using the same rubrics as the original system. 
              Review the feedback to understand the strengths and potential improvements for each question.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Selected POV Foundation:</h3>
              <p className="text-gray-600 text-sm italic">"{selectedGroupPov}"</p>
            </div>
          </div>

             

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-red-600 font-bold text-sm">!</span>
                </div>
                <div>
                  <h4 className="font-semibold text-red-800 mb-2">Error</h4>
                  <p className="text-red-700 text-sm">{apiError}</p>
                  <button 
                    onClick={() => evaluateHMWQuestions(selectedFinalHmwQuestions.filter(q => q.trim()))}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {selectedFinalHmwQuestions.map((question, questionIndex) => {
              const aiResult = hmwAIResults[questionIndex];

              return (
                <div key={questionIndex} className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Selected Question {questionIndex + 1}
                    </h2>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <p className="text-gray-700 break-words overflow-hidden leading-relaxed text-lg">
                        {question}
                      </p>
                    </div>
                  </div>

                  

                  {aiResult && !hmwLoading && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                          <span className="text-emerald-600 font-bold text-sm">AI</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-emerald-800 mb-3">AI Evaluation Results</h4>
                          
                          {Array.isArray(aiResult) ? (
                            <div className="space-y-4">
                              {aiResult.map((rubric) => (
                                <div key={rubric.id} className="border border-emerald-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-lg font-semibold text-emerald-800">{rubric.title}</h5>
                                    <div className="flex items-center">
                                      <span className="text-xl font-bold text-emerald-600 mr-2">{rubric.score}/5</span>
                                      <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                          <Star 
                                            key={i} 
                                            className={`w-4 h-4 ${i < rubric.score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-emerald-100 p-3 rounded-lg">
                                    <p className="text-emerald-800 text-sm leading-relaxed">
                                      {rubric.reason}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-emerald-700 text-sm leading-relaxed whitespace-pre-line">
                              {extractAIContent(aiResult)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!aiResult && !hmwLoading && !apiError && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-center">
                        <span className="text-gray-500">Waiting for evaluation...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-8 space-x-8">
            <button 
              onClick={() => navigateToStep('home')}
              className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-200 hover:transform hover:scale-105 smooth-hover text-lg shadow-lg"
            >
              Complete HMW Session
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // MAIN RENDER FUNCTION
  // ========================================
  
  const renderCurrentStep = () => {
    const stepComponents = {
      'home': renderHome,
      'scenario-selection': renderScenarioSelection,
      'single-question-creation': renderSingleQuestionCreation,
      'group-question-evaluation': renderGroupQuestionEvaluation,
      'ai-question-feedback': renderAIQuestionFeedback,
      'interview-session': renderInterviewSession,
      'transcript-review': renderTranscriptReview,
      'peer-transcript-evaluation': renderPeerTranscriptEvaluation,
      'post-interview-evaluation': renderPostInterviewEvaluation,
      'hmw-needs-insights': renderNeedsInsights,
      'pov-creation': renderPovCreation,
      'pov-group-comparison': renderPovGroupComparison,
      'pov-ai-feedback': renderPovAiFeedback,
      'hmw-questions-creation': renderHMWQuestionsCreation,
      'hmw-group-selection': renderHmwGroupSelection,
      'final-hmw-ai-feedback': renderFinalHmwAiFeedback,
      'hmw-self-eval': renderHMWSelfEval,
      'ai-hmw-eval': renderFinalHmwAiFeedback
    };
    
    const Component = stepComponents[currentStep];
    return Component ? Component() : renderHome();
  };

  //MAIN
  return (
      <div className="font-sans min-h-screen">
        <div className={`transition-all duration-300 ${
          isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
        }`}>
          {renderCurrentStep()}
        </div>
      </div>
  );
};

export default InterviewHMWSystem;