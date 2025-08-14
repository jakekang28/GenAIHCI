// Utility functions for the Interview/HMW system

// Helper function to extract content from LangChain response objects
export const extractAIContent = (aiResponse) => {
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

export const parsePovAIFeedback = (rawFeedback) => {
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

export const parseHmwAIFeedback = (rawFeedback) => {
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

// Generate groupmate questions for interview system
export const generateGroupmateQuestions = (prePlannedQuestion, selectedScenario) => {
  return [
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
};

// Generate groupmate POV statements
export const generateGroupmatePovStatements = (povStatement) => {
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

// Generate groupmate HMW questions
export const generateGroupmateHmwQuestions = (hmwQuestions) => {
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
