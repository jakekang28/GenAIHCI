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

export const parseHmwAIFeedback = (aiResponse) => {
  if (!aiResponse) return null;
  
  try {
    const content = extractAIContent(aiResponse);
    if (!content) {
      console.log('No content extracted from AI response');
      return null;
    }

    // Parse the structured feedback
    const rubrics = [];
    const lines = content.split('\n');
    let currentRubric = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for rubric headers with scores (e.g., "**Focus on user needs: 4**")
      const scoreMatch = trimmedLine.match(/^\*\*(.+?):\s*(\d+)\*\*/);
      if (scoreMatch) {
        // Save previous rubric if exists
        if (currentRubric) {
          rubrics.push(currentRubric);
        }
        
        // Start new rubric
        currentRubric = {
          id: `hmw-${rubrics.length + 1}`,
          title: scoreMatch[1].trim(),
          score: parseInt(scoreMatch[2]),
          reason: ''
        };
      }
      // Look for deduction reason lines (e.g., "- Deduction Reason: ...")
      else if (trimmedLine.startsWith('-') && currentRubric) {
        const reason = trimmedLine.replace(/^-\s*/, '').trim();
        if (reason) {
          // Remove "Deduction Reason:" label if present
          let cleanReason = reason.replace(/^Deduction Reason:\s*/i, '');
          // Remove "None." from the beginning of the text
          cleanReason = cleanReason.replace(/^None\.?\s*/i, '');
          currentRubric.reason = cleanReason;
        }
      }
    }
    
    // Add the last rubric
    if (currentRubric) {
      rubrics.push(currentRubric);
    }
    
    return rubrics.length > 0 ? rubrics : null;
  } catch (error) {
    console.error('Error parsing HMW AI feedback:', error);
    return null;
  }
};

// Parse pre-interview question evaluation feedback
export const parsePreInterviewFeedback = (aiResponse) => {
  if (!aiResponse) return null;
  
  try {
    const content = extractAIContent(aiResponse);
    if (!content) return null;
    
    // Pre-interview feedback is typically already parsed as JSON
    // but we can add additional parsing if needed
    if (typeof content === 'object') {
      return content;
    }
    
    // If it's a string, try to parse it
    try {
      return JSON.parse(content);
    } catch (e) {
      // If parsing fails, return the raw content
      return { rawContent: content };
    }
  } catch (error) {
    console.error('Error parsing pre-interview feedback:', error);
    return null;
  }
};

// Parse post-interview evaluation feedback
export const parsePostInterviewFeedback = (aiResponse) => {
  if (!aiResponse) return null;
  
  try {
    const content = extractAIContent(aiResponse);
    if (!content) return null;
    
    // Post-interview feedback is typically already parsed as an array of rubrics
    if (Array.isArray(content)) {
      return content;
    }
    
    // If it's a string, try to parse it
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // If parsing fails, return the raw content
      return { rawContent: content };
    }
    
    return content;
  } catch (error) {
    console.error('Error parsing post-interview feedback:', error);
    return null;
  }
};
