// Configuration file for pilot testing
// Update these values when changing network setup

const config = {
  // Backend API configuration
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000',
  
  // Frontend URL (for CORS and redirects)
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3001',
  
  // WebSocket configuration
  WEBSOCKET_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000',
  
  // API endpoints (relative to BACKEND_URL)
  API_ENDPOINTS: {
    LLM: {
      EVAL_POV_DYNAMIC: '/llm/eval-POV-dynamic',
      EVAL_HMW_DYNAMIC: '/llm/eval-HMW-dynamic',
      HEALTH: '/llm/health',
    },
    SESSION: {
      CREATE: '/session/create',
      JOIN: '/session/join',
      TRANSCRIPTS: '/session/transcripts',
    },
    POV_HMW: {
      CREATE: '/pov-hmw/create',
      EVALUATE: '/pov-hmw/evaluate',
    }
  }
};

export default config;
