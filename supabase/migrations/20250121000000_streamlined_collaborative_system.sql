-- Streamlined Collaborative System Database Schema
-- Focus on learning outcomes: user inputs, AI evaluations, final results
-- Real-time collaboration handled via WebSocket (no voting persistence needed)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- =====================================================
-- CORE USER AND SESSION TABLES
-- =====================================================

-- Guest users table (no authentication required)
CREATE TABLE public.guest_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborative sessions/rooms
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- Short human-readable code like "ABC123"
  name TEXT NOT NULL DEFAULT 'Untitled Session',
  type TEXT NOT NULL CHECK (type IN ('interview', 'pov_hmw')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  current_stage TEXT DEFAULT 'setup',
  max_participants INTEGER DEFAULT 4,
  host_user_id UUID NOT NULL REFERENCES public.guest_users(id) ON DELETE CASCADE,
  
  -- Final selections (what the team chose)
  selected_scenario JSONB, -- Full scenario data that was selected
  selected_question_content TEXT, -- Final question text chosen by team
  selected_pov_content TEXT, -- Final POV statement chosen by team
  selected_hmw_contents TEXT[], -- Final HMW questions chosen by team (array of strings)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session participants
CREATE TABLE public.session_participants (
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.guest_users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

-- Session state (ephemeral collaboration state - for current voting, etc.)
CREATE TABLE public.session_state (
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, key)
);

-- =====================================================
-- USER CONTRIBUTIONS (LEARNING INPUTS)
-- =====================================================

-- User contributions - what students create
CREATE TABLE public.user_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.guest_users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL, -- Cache name for easy display
  
  type TEXT NOT NULL CHECK (type IN ('interview_question', 'pov_statement', 'hmw_question', 'needs_insights')),
  content JSONB NOT NULL, -- Flexible content structure
  
  -- For ordering multiple items from same user (e.g., 3 HMW questions)
  order_index INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTERVIEW SYSTEM
-- =====================================================

-- Interview transcripts - conversation records
CREATE TABLE public.interview_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.guest_users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  
  -- Conversation data
  messages JSONB NOT NULL, -- Array of {role: 'user'|'ai', content: string, timestamp: string}
  scenario_data JSONB, -- Scenario context used for this interview
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AI EVALUATION SYSTEM (LEARNING OUTCOMES)
-- =====================================================

-- AI evaluations - all AI feedback and scoring
CREATE TABLE public.ai_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.guest_users(id) ON DELETE SET NULL, -- May be system-generated
  
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN (
    'pre_question_eval',    -- Pre-interview question evaluation
    'post_interview_eval',  -- Post-interview scoring
    'pov_feedback',         -- POV statement evaluation
    'hmw_feedback'          -- HMW questions evaluation
  )),
  
  -- What was evaluated
  input_data JSONB NOT NULL, -- Original input (question, POV, etc.)
  input_metadata JSONB,      -- Context data (scenario, needs, insights)
  
  -- AI response
  ai_response JSONB NOT NULL,     -- Raw AI response
  processed_scores JSONB,         -- Parsed scores/rubrics
  feedback_summary TEXT,          -- Human-readable summary
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SPECIALIZED SESSION DATA
-- =====================================================

-- Interview session context
CREATE TABLE public.interview_session_data (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  persona_tag TEXT, -- e.g., 'A', 'B', 'C', 'D'
  scenario_data JSONB, -- Full scenario details
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POV/HMW session context  
CREATE TABLE public.pov_hmw_session_data (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  needs TEXT[] DEFAULT '{}',    -- Team's identified needs
  insights TEXT[] DEFAULT '{}', -- Team's insights
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

CREATE TRIGGER guest_users_set_updated
BEFORE UPDATE ON public.guest_users
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER sessions_set_updated
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER session_state_set_updated
BEFORE UPDATE ON public.session_state
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER user_contributions_set_updated
BEFORE UPDATE ON public.user_contributions
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER interview_transcripts_set_updated
BEFORE UPDATE ON public.interview_transcripts
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER interview_session_data_set_updated
BEFORE UPDATE ON public.interview_session_data
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER pov_hmw_session_data_set_updated
BEFORE UPDATE ON public.pov_hmw_session_data
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Guest users
CREATE INDEX idx_guest_users_display_name ON public.guest_users(display_name);

-- Sessions
CREATE INDEX idx_sessions_code ON public.sessions(code);
CREATE INDEX idx_sessions_host ON public.sessions(host_user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_type ON public.sessions(type);

-- Session participants
CREATE INDEX idx_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_participants_user ON public.session_participants(user_id);
CREATE INDEX idx_participants_active ON public.session_participants(is_active);

-- Session state
CREATE INDEX idx_session_state_session ON public.session_state(session_id);
CREATE INDEX idx_session_state_key ON public.session_state(key);

-- User contributions
CREATE INDEX idx_contributions_session ON public.user_contributions(session_id);
CREATE INDEX idx_contributions_user ON public.user_contributions(user_id);
CREATE INDEX idx_contributions_type ON public.user_contributions(type);

-- Interview transcripts
CREATE INDEX idx_transcripts_session ON public.interview_transcripts(session_id);
CREATE INDEX idx_transcripts_user ON public.interview_transcripts(user_id);

-- AI evaluations
CREATE INDEX idx_ai_evaluations_session ON public.ai_evaluations(session_id);
CREATE INDEX idx_ai_evaluations_type ON public.ai_evaluations(evaluation_type);
CREATE INDEX idx_ai_evaluations_user ON public.ai_evaluations(user_id);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to generate unique session codes
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Set session code on insert if not provided
CREATE OR REPLACE FUNCTION set_session_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    LOOP
      NEW.code := generate_session_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.sessions WHERE code = NEW.code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_set_code
BEFORE INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION set_session_code();

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- Sessions with host information
CREATE VIEW public.sessions_with_host AS
SELECT s.*, 
       gu.display_name as host_name
FROM public.sessions s
JOIN public.guest_users gu ON s.host_user_id = gu.id;

-- Session participants with user details
CREATE VIEW public.session_participants_detail AS
SELECT sp.*, 
       gu.display_name as user_display_name
FROM public.session_participants sp
JOIN public.guest_users gu ON sp.user_id = gu.id;

-- Contributions with session context
CREATE VIEW public.contributions_with_session AS
SELECT uc.*, 
       s.type as session_type,
       s.status as session_status
FROM public.user_contributions uc
JOIN public.sessions s ON uc.session_id = s.id;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_session_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pov_hmw_session_data ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development (tighten for production)
CREATE POLICY "Allow all operations" ON public.guest_users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.session_participants FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.session_state FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.user_contributions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.interview_transcripts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.ai_evaluations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.interview_session_data FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.pov_hmw_session_data FOR ALL USING (true);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.sessions IS 'Main collaborative sessions/rooms. Stores final team selections directly.';
COMMENT ON TABLE public.user_contributions IS 'Individual student inputs: questions, POV statements, HMW questions, etc.';
COMMENT ON COLUMN public.user_contributions.content IS 'JSONB content structure. Can include is_selected flag for final team selections.';
COMMENT ON TABLE public.ai_evaluations IS 'All AI feedback and scoring for learning assessment.';
COMMENT ON TABLE public.session_state IS 'Ephemeral collaboration state (voting progress, etc.) - not persisted long-term.';
COMMENT ON TABLE public.interview_transcripts IS 'Interview conversation records for later analysis.';

COMMENT ON COLUMN public.sessions.selected_scenario IS 'Final scenario chosen by team (full data for continuity)';
COMMENT ON COLUMN public.sessions.selected_question_content IS 'Final interview question chosen by team';
COMMENT ON COLUMN public.sessions.selected_pov_content IS 'Final POV statement chosen by team';
COMMENT ON COLUMN public.sessions.selected_hmw_contents IS 'Final HMW questions chosen by team (array)';
