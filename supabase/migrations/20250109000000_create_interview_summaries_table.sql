-- Create interview summaries table to store complete summary texts
CREATE TABLE public.interview_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  
  -- Summary content
  summary_text TEXT NOT NULL,
  summary_format TEXT DEFAULT 'text' CHECK (summary_format IN ('text', 'markdown', 'html')),
  
  -- Metadata for context (optional, can be null)
  session_name TEXT,
  persona_tag TEXT,
  question_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for one summary per user per session
  CONSTRAINT unique_session_user UNIQUE (session_id, user_id)
);

-- Add indexes for fast lookups
CREATE INDEX idx_interview_summaries_user ON public.interview_summaries(user_id);
CREATE INDEX idx_interview_summaries_session ON public.interview_summaries(session_id);
CREATE INDEX idx_interview_summaries_created_at ON public.interview_summaries(created_at);
CREATE INDEX idx_interview_summaries_persona ON public.interview_summaries(persona_tag);

-- Add trigger for auto-updating timestamps
CREATE TRIGGER interview_summaries_set_updated
BEFORE UPDATE ON public.interview_summaries
FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Add comments for documentation
COMMENT ON TABLE public.interview_summaries IS 'Stores complete interview summary texts for easy retrieval and display';
COMMENT ON COLUMN public.interview_summaries.summary_text IS 'Complete formatted summary text containing all interview details';
COMMENT ON COLUMN public.interview_summaries.summary_format IS 'Format of the summary text (text, markdown, html)';
COMMENT ON COLUMN public.interview_summaries.persona_tag IS 'Optional persona identifier for easy filtering';
COMMENT ON COLUMN public.interview_summaries.question_count IS 'Number of questions in the interview for statistics';
COMMENT ON CONSTRAINT unique_session_user ON public.interview_summaries IS 'Ensures one summary per user per session';
