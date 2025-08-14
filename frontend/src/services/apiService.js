//API SERVICE for handling HTTP requests to backend API
const API_BASE_URL = 'http://localhost:3000';

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
      // Fix: Use localStorage instead of sessionStorage, and don't generate new IDs
      const guestUserId = localStorage.getItem('guestUserId');
      const guestName = localStorage.getItem('guestName') || 'Guest';
      
      if (!guestUserId) {
        throw new Error('No guestUserId found. Please create a room first.');
      }
      
      const response = await fetch(`${API_BASE_URL}/llm/preeval-interview?tag=${persona}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          guestUserId: guestUserId,  
          guestName: guestName,      
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
  async postInterview(qna, persona){
   try{
      const response = await fetch(`${API_BASE_URL}/llm/eval-interview?tag=${persona}`, {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qnas : qna
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