//API SERVICE for handling HTTP requests to backend API
import config from '../config/config.js';

const API_BASE_URL = config.BACKEND_URL;

class ApiService {
  //POINT OF VIEW (POV) EVALUATION ENDPOINTS

  /**
   * @param {string} povText - The POV statement to evaluate
   * @param {string} needs - User needs context
   * @param {string} insights - User insights context 
   * @param {string} userPOV - User's POV statement for context
   * @returns {Promise<Object>} - Success status and AI evaluation result
   */
  async evaluatePOVDynamic(povText, needs, insights, userPOV) {
    try {
      //Make POST request with dynamic context data
      const response = await fetch(`${API_BASE_URL}/llm/eval-POV-dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: povText,
          needs: needs,
          insights: insights,
          userPOV: userPOV
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result,
      };
    } catch (error) {
      console.error('Error evaluating POV with dynamic content:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  //HOW MIGHT WE (HMW) EVALUATION ENDPOINTS

  /**
   * @param {string} hmwText - The HMW questions to evaluate
   * @param {string} needs - User needs
   * @param {string} insights - User insights
   * @param {string} userPOV - User's POV statement
   * @returns {Promise<Object>} - Success status and AI evaluation result
   */
  async evaluateHMWDynamic(hmwText, needs, insights, userPOV) {
    try {
      //Make POST request with comprehensive context for better AI evaluation
      const response = await fetch(`${API_BASE_URL}/llm/eval-HMW-dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: hmwText,
          needs: needs,
          insights: insights,
          userPOV: userPOV
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result,
      };
    } catch (error) {
      console.error('Error evaluating HMW with dynamic content:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // NEW: POV/HMW EVALUATION WITH SESSION CONTEXT
  /**
   * Evaluate POV statement with session context for database storage
   * @param {string} statement - POV statement to evaluate
   * @param {string[]} needs - User needs array
   * @param {string[]} insights - User insights array
   * @param {string} sessionId - Session ID for database storage
   * @param {string} userId - User ID for database storage
   * @returns {Promise<Object>} - Success status and AI evaluation result
   */
  async evaluatePovWithSession(statement, needs, insights, sessionId, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/pov-hmw/evaluate-pov`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          statement,
          needs,
          insights,
          sessionId,
          userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result,
      };
    } catch (error) {
      console.error('Error evaluating POV with session context:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Evaluate HMW questions with session context for database storage
   * @param {string[]} questions - HMW questions array
   * @param {string[]} needs - User needs array
   * @param {string[]} insights - User insights array
   * @param {string} selectedPov - Selected POV statement
   * @param {string} sessionId - Session ID for database storage
   * @param {string} userId - User ID for database storage
   * @returns {Promise<Object>} - Success status and AI evaluation results
   */
  async evaluateHmwWithSession(questions, needs, insights, selectedPov, sessionId, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/pov-hmw/evaluate-hmw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          questions,
          needs,
          insights,
          selectedPov,
          sessionId,
          userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        results: data.results,
      };
    } catch (error) {
      console.error('Error evaluating HMW with session context:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  async personaRetrieval(tag) {
    try{
      const response = await fetch(`${API_BASE_URL}/llm/get-persona?tag=${tag}`, {
        method : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      console.log(response.json)
      if(!response.ok){
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = response.json()
      return data;
    }
    catch(err){
      console.error('Fetch error:', err);
      throw err;  
    }
  }
  async preEvaluation(initQ, persona) {
    try {
      // Use sessionStorage-first approach (consistent with useLocalGuest)
      let guestData = null;
      
      // Try sessionStorage first (tab-isolated), then localStorage
      const sessionData = sessionStorage.getItem('guestUser');
      const localData = localStorage.getItem('guestUser');
      
      if (sessionData) {
        try {
          guestData = JSON.parse(sessionData);
        } catch (e) {
          console.warn('Failed to parse sessionStorage guest data');
        }
      } else if (localData) {
        try {
          guestData = JSON.parse(localData);
        } catch (e) {
          console.warn('Failed to parse localStorage JSON guest data');
        }
      }
      
      // Fall back to separate keys if needed
      if (!guestData) {
        const guestUserId = localStorage.getItem('guestUserId');
        const guestName = localStorage.getItem('guestName');
        if (guestUserId && guestName) {
          guestData = { guestUserId, guestName };
        }
      }
      
      if (!guestData || !guestData.guestUserId) {
        throw new Error('No guestUserId found. Please create a room first.');
      }
      
      const response = await fetch(`${API_BASE_URL}/llm/preeval-interview?tag=${persona}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          guestUserId: guestData.guestUserId,  
          guestName: guestData.guestName || 'Guest',      
          question: initQ,           
          persona: persona           
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      return data.result
    }
    catch(err){
      console.error('Fetch error:', err);
      throw err; 
    }
  }
  async interview(isInit, question, persona){
    try{
      const response = await fetch(`${API_BASE_URL}/llm/interview?tag=${persona}`, {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          isInit : isInit,
          question : question
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      return data.transcript
    }
    catch(err){
      console.error('Fetch error:', err);
      throw err; 
    }
  }
  async postInterview(qna, persona, sessionId, userId){
   try{
      const response = await fetch(`${API_BASE_URL}/llm/eval-interview?tag=${persona}`, {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qnas : qna,
          sessionId: sessionId,
          userId: userId
        }),
      })
      if (!response.ok) {  
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      console.log(data) 
      return data
    }
    catch(err){
      console.error('Fetch error:', err);
      throw err; 
    }
  }
  async createGuestUser(name) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/db/guest`,
        { 
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name }) 
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { guestUserId: data.guestUserId, guestName: data.guestName };
    } catch (error) {
      console.error('Failed to create guest user:', error);
      throw error;
    }
  }

  async saveTranscript(sessionId, userId, userName, messages, scenarioData) {
    const response = await fetch(`${API_BASE_URL}/db/transcripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId,
        userName,
        messages,
        scenarioData
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save transcript');
    }
    const data = await response.json();
    return data;
  }

  async getSessionTranscripts(sessionId) {
    const response = await fetch(`${API_BASE_URL}/db/transcripts/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch session transcripts');
    }
    const data = await response.json();
    return data;
  }

  async markInterviewComplete(sessionId, userId) {
    const response = await fetch(`${API_BASE_URL}/db/interview-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to mark interview complete');
    }
    const data = await response.json();
    return data;
  }

  async checkInterviewCompletionStatus(sessionId) {
    const response = await fetch(`${API_BASE_URL}/db/interview-completion-status/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to check interview completion status');
    }
    const data = await response.json();
    return data;
  }

  async checkInterviewCompletionStatusWithParticipants(sessionId, participants) {
    const response = await fetch(`${API_BASE_URL}/db/interview-completion-status/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participants }),
    });
    if (!response.ok) {
      throw new Error('Failed to check interview completion status with participants');
    }
    const data = await response.json();
    return data;
  }

  //HEALTH CHECK ENDPOINT

  /**
   * @returns {Promise<boolean>} - True if backend is accessible, false otherwise
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/llm/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}
export const apiService = new ApiService();

export default apiService; 