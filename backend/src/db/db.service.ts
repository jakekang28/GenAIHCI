import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type UUID = string;

// ============================================================================
// STREAMLINED COLLABORATIVE INTERFACES
// ============================================================================

export interface SessionRow {
  id: UUID;
  code: string;
  name: string;
  type: 'interview' | 'pov_hmw';
  status: 'active' | 'completed' | 'archived';
  current_stage: string;
  max_participants: number;
  host_user_id: UUID;
  
  // Final team selections (stored directly)
  selected_scenario?: any; // JSONB
  selected_question_content?: string;
  selected_pov_content?: string;
  selected_hmw_contents?: string[];
  
  created_at: string;
  updated_at: string;
}

export interface SessionParticipantRow {
  session_id: UUID;
  user_id: UUID;
  display_name: string;
  is_host: boolean;
  is_active: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface SessionStateRow {
  session_id: UUID;
  key: string;
  value: any; // JSONB
  updated_at: string;
}

export interface UserContributionRow {
  id: UUID;
  session_id: UUID;
  user_id: UUID;
  user_name: string;
  type: 'interview_question' | 'pov_statement' | 'hmw_question' | 'needs_insights';
  content: any; // JSONB
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface InterviewTranscriptRow {
  id: UUID;
  session_id: UUID;
  user_id: UUID;
  user_name: string;
  messages: any; //JSONB array
  scenario_data?: any; //JSONB
  created_at: string;
  updated_at: string;
}

export interface AiEvaluationRow {
  id: UUID;
  session_id: UUID;
  user_id?: UUID;
  evaluation_type: 'pre_question_eval' | 'post_interview_eval' | 'pov_feedback' | 'hmw_feedback';
  input_data: any; // JSONB
  input_metadata?: any; // JSONB
  ai_response: any; // JSONB
  processed_scores?: any; // JSONB
  feedback_summary?: string;
  created_at: string;
}

export interface InterviewSessionDataRow {
  session_id: UUID;
  persona_tag?: string;
  scenario_data?: any; // JSONB
  created_at: string;
  updated_at: string;
}

export interface PovHmwSessionDataRow {
  session_id: UUID;
  needs: string[];
  insights: string[];
  created_at: string;
  updated_at: string;
}

export interface InterviewSummaryRow {
  id: UUID;
  session_id: UUID;
  user_id: UUID;
  user_name: string;
  summary_text: string;
  summary_format: 'text' | 'markdown' | 'html';
  session_name?: string;
  persona_tag?: string;
  question_count?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// LEGACY INTERFACES (for backward compatibility)
// ============================================================================

export interface LegacySessionRow {
  id: UUID;
  user_id: UUID;
  persona: 'A' | 'B' | 'C' | 'D';
  scenario_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface QnaRow {
  id: UUID;
  session_id: UUID;
  order_no: number;
  question: string;
  answer: string; // NOT NULL (빈 문자열 허용)
  is_initial: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class DbService {
  private client: SupabaseClient;
  private logger = new Logger(DbService.name);

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }

  // ============================================================================
  // SESSION MANAGEMENT METHODS
  // ============================================================================

  /**New Collaborative Session*/
  async createSession(
    hostUserId: string, 
    type: 'interview' | 'pov_hmw', 
    name?: string
  ): Promise<SessionRow> {
    const { data, error } = await this.client
      .from('sessions')
      .insert({ 
        host_user_id: hostUserId, 
        type, 
        name: name || 'Untitled Session',
        status: 'active',
        current_stage: 'setup'
      })
      .select('*')
      .single();
    
    if (error) {
      this.logger.error('createSession error', error);
      throw error;
    }
    
    // Add host as participant
    await this.joinSession(data.id, hostUserId, 'Host', true);
    
    return data as SessionRow;
  }

  /** Join a session by code */
  async joinSessionByCode(sessionCode: string, userId: string, displayName: string): Promise<SessionRow> {
  const { data: session, error: sessionError } = await this.client
    .from('sessions')
    .select('*')
    .eq('code', sessionCode.toUpperCase())
    .eq('status', 'active')
    .single();
  if (sessionError || !session) throw new Error('Session not found or not accepting participants');

  // 기존 참가자?
  const { data: existing } = await this.client
    .from('session_participants')
    .select('*')
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // 👉 기존 참가자는 정원체크 없이 재활성화
    const { error: reactivateErr } = await this.client
      .from('session_participants')
      .update({
        is_active: true,
        display_name: displayName,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', session.id)
      .eq('user_id', userId);
    if (reactivateErr) throw reactivateErr;
    return session as SessionRow;
  }

  // 신규 참가자만 정원 체크
  const { count } = await this.client
    .from('session_participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('is_active', true);

  if (count && count >= session.max_participants) throw new Error('Session is full');

  await this.joinSession(session.id, userId, displayName, false);
  return session as SessionRow;
}


  /** Add participant to session */
  async joinSession(
  sessionId: string, 
  userId: string, 
  displayName: string, 
  isHost: boolean = false
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await this.client
    .from('session_participants')
    .upsert(
      { 
        session_id: sessionId, 
        user_id: userId, 
        display_name: displayName,
        is_host: isHost,
        is_active: true,
        last_seen_at: now,
        joined_at: now, // 새로 들어올 땐 joined_at도 채워둠(이미 있으면 무시됨)
      },
      { onConflict: 'session_id,user_id' } // 🔑 충돌 키 명시 (Supabase v2)
    );

  if (error) {
    this.logger.error('joinSession error', error);
    throw error;
  }
}

  /** Get session with participants */
  async getSession(sessionId: string): Promise<SessionRow & { participants: SessionParticipantRow[] }> {
    const { data: session, error: sessionError } = await this.client
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      this.logger.error('getSession error', sessionError);
      throw sessionError;
    }
    
    const { data: participants, error: participantsError } = await this.client
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });
    
    if (participantsError) {
      this.logger.error('getParticipants error', participantsError);
      throw participantsError;
    }
    
    return {
      ...(session as SessionRow),
      participants: (participants || []) as SessionParticipantRow[]
    };
  }

  /** Update session state (long-term collaboration state) */
  async setSessionState(
    sessionId: string, 
    key: string, 
    value: any
  ): Promise<void> {
    const { error } = await this.client
      .from('session_state')
      .upsert({ 
        session_id: sessionId, 
        key, 
        value,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      this.logger.error('setSessionState error', error);
      throw error;
    }
  }

  /** Get session state */
  async getSessionState(sessionId: string, key?: string): Promise<SessionStateRow[]> {
    let query = this.client
      .from('session_state')
      .select('*')
      .eq('session_id', sessionId);
    
    if (key) {
      query = query.eq('key', key);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) {
      this.logger.error('getSessionState error', error);
      throw error;
    }
    
    return (data || []) as SessionStateRow[];
  }

  /** Update session status and stage */
  async updateSessionStatus(
    sessionId: string, 
    status: 'active' | 'completed' | 'archived',
    currentStage?: string
  ): Promise<void> {
    const updateData: any = { status };
    if (currentStage) updateData.current_stage = currentStage;
    
    const { error } = await this.client
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);
    
    if (error) {
      this.logger.error('updateSessionStatus error', error);
      throw error;
    }
  }

  /** Set final team selections directly in session */
  async setFinalSelections(
    sessionId: string,
    selections: {
      scenario?: any,
      questionContent?: string,
      povContent?: string,
      hmwContents?: string[]
    }
  ): Promise<void> {
    const updateData: any = {};
    if (selections.scenario) updateData.selected_scenario = selections.scenario;
    if (selections.questionContent) updateData.selected_question_content = selections.questionContent;
    if (selections.povContent) updateData.selected_pov_content = selections.povContent;
    if (selections.hmwContents) updateData.selected_hmw_contents = selections.hmwContents;
    
    const { error } = await this.client
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);
    
    if (error) {
      this.logger.error('setFinalSelections error', error);
      throw error;
    }
  }
  async leaveSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await this.client
    .from('session_participants')
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (error) {
    this.logger.error('leaveSession error', error);
    throw error;
  }
}

/** is_active 토글(필요 시 일반화해 쓰기) */
async setParticipantActive(sessionId: string, userId: string, isActive: boolean): Promise<void> {
  const { error } = await this.client
    .from('session_participants')
    .update({
      is_active: isActive,
      last_seen_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (error) {
    this.logger.error('setParticipantActive error', error);
    throw error;
  }
}

/** 현재 활성 참가자 수 조회 */
async getActiveParticipantCount(sessionId: string): Promise<number> {
  const { count, error } = await this.client
    .from('session_participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('is_active', true);

  if (error) {
    this.logger.error('getActiveParticipantCount error', error);
    throw error;
  }

  return count ?? 0;
}
  // ============================================================================
  // CONTRIBUTION MANAGEMENT
  // ============================================================================

  /** Submit user contribution */
  async submitContribution(
    sessionId: string,
    userId: string,
    userName: string,
    type: 'interview_question' | 'pov_statement' | 'hmw_question' | 'needs_insights',
    content: any,
    orderIndex?: number
  ): Promise<UserContributionRow> {
    const { data, error } = await this.client
      .from('user_contributions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        user_name: userName,
        type,
        content,
        order_index: orderIndex
      })
      .select('*')
      .single();
    
    if (error) {
      this.logger.error('submitContribution error', error);
      throw error;
    }
    
    return data as UserContributionRow;
  }

  /** Get contributions by session and type */
  async getContributions(
    sessionId: string,
    type?: 'interview_question' | 'pov_statement' | 'hmw_question' | 'needs_insights'
  ): Promise<UserContributionRow[]> {
    let query = this.client
      .from('user_contributions')
      .select('*')
      .eq('session_id', sessionId);
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    
    if (error) {
      this.logger.error('getContributions error', error);
      throw error;
    }
    
    return (data || []) as UserContributionRow[];
  }

  /** Mark contributions as selected (for final team selections) */
  async markContributionsAsSelected(contributionIds: string[]): Promise<void> {
    if (contributionIds.length === 0) return;
    
    // Update each contribution individually to add is_selected flag
    for (const id of contributionIds) {
      // First get the current content
      const { data: current, error: fetchError } = await this.client
        .from('user_contributions')
        .select('content')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        this.logger.error(`Failed to fetch contribution ${id}:`, fetchError);
        continue;
      }
      
      // Update content with is_selected flag
      const updatedContent = {
        ...current.content,
        is_selected: true
      };
      
      const { error: updateError } = await this.client
        .from('user_contributions')
        .update({ content: updatedContent })
        .eq('id', id);
      
      if (updateError) {
        this.logger.error(`Failed to update contribution ${id}:`, updateError);
        throw updateError;
      }
    }
  }

  // ============================================================================
  // INTERVIEW SPECIFIC METHODS
  // ============================================================================

  /** Save interview session data */
  async saveInterviewSessionData(
    sessionId: string,
    personaTag?: string,
    scenarioData?: any
  ): Promise<void> {
    const { error } = await this.client
      .from('interview_session_data')
      .upsert({
        session_id: sessionId,
        persona_tag: personaTag,
        scenario_data: scenarioData
      });
    
    if (error) {
      this.logger.error('saveInterviewSessionData error', error);
      throw error;
    }
  }

  /** Save interview transcript */
  async saveTranscript(
    sessionId: string,
    userId: string,
    userName: string,
    messages: any[],
    scenarioData?: any
  ): Promise<InterviewTranscriptRow> {
    this.logger.log(`Saving transcript for session: ${sessionId}, user: ${userName} (${userId}), messages: ${messages.length}`);
    
    const { data, error } = await this.client
      .from('interview_transcripts')
      .insert({
        session_id: sessionId,
        user_id: userId,
        user_name: userName,
        messages,
        scenario_data: scenarioData
      })
      .select()
      .single();
    
    if (error) {
      this.logger.error('saveTranscript error', error);
      throw error;
    }
    
    this.logger.log(`Successfully saved transcript with ID: ${data.id}`);
    return data as InterviewTranscriptRow;
  }

  /** Get transcripts for session */
  async getTranscripts(sessionId: string): Promise<InterviewTranscriptRow[]> {
    this.logger.log(`Fetching transcripts for session: ${sessionId}`);
    
    const { data, error } = await this.client
      .from('interview_transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      this.logger.error('getTranscripts error', error);
      throw error;
    }
    
    this.logger.log(`Found ${data?.length || 0} transcripts for session ${sessionId}`);
    if (data && data.length > 0) {
      data.forEach((transcript, index) => {
        this.logger.log(`Transcript ${index + 1}: user_id=${transcript.user_id}, user_name=${transcript.user_name}, messages=${transcript.messages?.length || 0}`);
      });
    }
    
    return (data || []) as InterviewTranscriptRow[];
  }

  /** Mark a user's interview as complete */
  async markInterviewComplete(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from('session_state')
      .upsert({
        session_id: sessionId,
        key: `interview_complete_${userId}`,
        value: { completed: true, completedAt: new Date().toISOString() }
      });
    
    if (error) {
      this.logger.error('markInterviewComplete error', error);
      throw error;
    }
  }

  /** Check interview completion status for all users in a session */
  async getInterviewCompletionStatus(sessionId: string, participants?: Array<{userId: string, userName: string}>): Promise<{
    totalParticipants: number;
    completedInterviews: number;
    completionStatus: Record<string, boolean>;
    allCompleted: boolean;
  }> {
    let totalParticipants = 0;
    let participantUserIds: string[] = [];

    if (participants && participants.length > 0) {
      // Use provided participants (from WebSocket rooms)
      totalParticipants = participants.length;
      participantUserIds = participants.map(p => p.userId);
      this.logger.log(`Using provided participants for session ${sessionId}: ${totalParticipants} participants`);
      this.logger.log(`Participant IDs: ${participantUserIds.join(', ')}`);
    } else {
      // Fallback to database participants
      this.logger.log(`No participants provided, falling back to database for session ${sessionId}`);
      const { data: dbParticipants, error: participantsError } = await this.client
        .from('session_participants')
        .select('user_id')
        .eq('session_id', sessionId)
        .eq('is_active', true);
      
      if (participantsError) {
        this.logger.error('getInterviewCompletionStatus participants error', participantsError);
        throw participantsError;
      }

      totalParticipants = dbParticipants?.length || 0;
      participantUserIds = dbParticipants?.map(p => p.user_id) || [];
      this.logger.log(`Database participants for session ${sessionId}: ${totalParticipants} participants`);
      this.logger.log(`Database participant IDs: ${participantUserIds.join(', ')}`);
    }

    if (totalParticipants === 0) {
      this.logger.warn(`No participants found for session ${sessionId}`);
      return {
        totalParticipants: 0,
        completedInterviews: 0,
        completionStatus: {},
        allCompleted: false
      };
    }

    // Get completion status for each participant
    const completionStatus: Record<string, boolean> = {};
    let completedInterviews = 0;

    for (const userId of participantUserIds) {
      const { data: stateData, error: stateError } = await this.client
        .from('session_state')
        .select('value')
        .eq('session_id', sessionId)
        .eq('key', `interview_complete_${userId}`);
      
      if (stateError) {
        this.logger.warn(`Error checking completion for user ${userId}:`, stateError);
        completionStatus[userId] = false;
      } else {
        const isCompleted = stateData?.[0]?.value?.completed === true;
        completionStatus[userId] = isCompleted;
        if (isCompleted) {
          completedInterviews++;
        }
        this.logger.log(`User ${userId} completion status: ${isCompleted}`);
      }
    }

    const result = {
      totalParticipants,
      completedInterviews,
      completionStatus,
      allCompleted: completedInterviews === totalParticipants
    };

    this.logger.log(`Completion status for session ${sessionId}: ${completedInterviews}/${totalParticipants} completed, allCompleted: ${result.allCompleted}`);
    return result;
  }

  // ============================================================================
  // POV/HMW SPECIFIC METHODS
  // ============================================================================

  /** Save POV/HMW session data */
  async savePovHmwSessionData(
    sessionId: string,
    needs?: string[],
    insights?: string[]
  ): Promise<void> {
    const { error } = await this.client
      .from('pov_hmw_session_data')
      .upsert({
        session_id: sessionId,
        needs: needs || [],
        insights: insights || []
      });
    
    if (error) {
      this.logger.error('savePovHmwSessionData error', error);
      throw error;
    }
  }

  // ============================================================================
  // AI EVALUATION TRACKING
  // ============================================================================

  /** Save AI evaluation */
  async saveAiEvaluation(
    sessionId: string,
    evaluationType: 'pre_question_eval' | 'post_interview_eval' | 'pov_feedback' | 'hmw_feedback',
    inputData: any,
    aiResponse: any,
    inputMetadata?: any,
    processedScores?: any,
    feedbackSummary?: string,
    userId?: string
  ): Promise<void> {
    const { error } = await this.client
      .from('ai_evaluations')
      .insert({
        session_id: sessionId,
        evaluation_type: evaluationType,
        input_data: inputData,
        ai_response: aiResponse,
        input_metadata: inputMetadata,
        processed_scores: processedScores,
        feedback_summary: feedbackSummary,
        user_id: userId
      });
    
    if (error) {
      this.logger.error('saveAiEvaluation error', error);
      throw error;
    }
  }

  /** Get AI evaluations for session */
  async getAiEvaluations(
    sessionId: string,
    evaluationType?: 'pre_question_eval' | 'post_interview_eval' | 'pov_feedback' | 'hmw_feedback'
  ): Promise<AiEvaluationRow[]> {
    let query = this.client
      .from('ai_evaluations')
      .select('*')
      .eq('session_id', sessionId);

    if (evaluationType) {
      query = query.eq('evaluation_type', evaluationType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error('getAiEvaluations error', error);
      throw error;
    }

    return (data || []) as AiEvaluationRow[];
  }

  // ============================================================================
  // INTERVIEW SUMMARY STORAGE METHODS
  // ============================================================================

  /** Save interview summary text */
  async saveInterviewSummary(
    sessionId: string,
    userId: string,
    userName: string,
    summaryText: string,
    summaryFormat: 'text' | 'markdown' | 'html' = 'text',
    sessionName?: string,
    personaTag?: string,
    questionCount?: number
  ): Promise<InterviewSummaryRow> {
    this.logger.log(`Saving interview summary for session: ${sessionId}, user: ${userName} (${userId})`);
    
    const { data, error } = await this.client
      .from('interview_summaries')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        user_name: userName,
        summary_text: summaryText,
        summary_format: summaryFormat,
        session_name: sessionName,
        persona_tag: personaTag,
        question_count: questionCount
      }, {
        onConflict: 'session_id,user_id'
      })
      .select()
      .single();
    
    if (error) {
      this.logger.error('saveInterviewSummary error', error);
      throw error;
    }
    
    this.logger.log(`Successfully saved interview summary with ID: ${data.id}`);
    return data as InterviewSummaryRow;
  }

  /** Get interview summary by session and user */
  async getStoredInterviewSummary(sessionId: string, userId: string): Promise<InterviewSummaryRow | null> {
    this.logger.log(`Fetching stored interview summary for session: ${sessionId}, user: ${userId}`);
    
    const { data, error } = await this.client
      .from('interview_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      this.logger.error('getStoredInterviewSummary error', error);
      throw error;
    }
    
    return data as InterviewSummaryRow;
  }

  /** Get all interview summaries for a user */
  async getUserInterviewSummaries(userId: string): Promise<InterviewSummaryRow[]> {
    this.logger.log(`Fetching all interview summaries for user: ${userId}`);
    
    const { data, error } = await this.client
      .from('interview_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      this.logger.error('getUserInterviewSummaries error', error);
      throw error;
    }
    
    return (data || []) as InterviewSummaryRow[];
  }

  /** Get all interview summaries for a session */
  async getSessionInterviewSummaries(sessionId: string): Promise<InterviewSummaryRow[]> {
    this.logger.log(`Fetching all interview summaries for session: ${sessionId}`);
    
    const { data, error } = await this.client
      .from('interview_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      this.logger.error('getSessionInterviewSummaries error', error);
      throw error;
    }
    
    return (data || []) as InterviewSummaryRow[];
  }

  /** Delete interview summary */
  async deleteInterviewSummary(summaryId: string): Promise<void> {
    this.logger.log(`Deleting interview summary: ${summaryId}`);
    
    const { error } = await this.client
      .from('interview_summaries')
      .delete()
      .eq('id', summaryId);
    
    if (error) {
      this.logger.error('deleteInterviewSummary error', error);
      throw error;
    }
    
    this.logger.log(`Successfully deleted interview summary: ${summaryId}`);
  }

  async getInterviewSummary(sessionId: string, userId: string): Promise<{
    chosenPersona: string | null;
    writtenQuestion: string | null;
    selectedQuestion: string | null;
    aiQuestionFeedback: any | null;
    interviewTranscript: any | null;
    aiInterviewFeedback: any | null;
    sessionDetails: any | null;
  }> {
    this.logger.log(`Fetching interview summary for session: ${sessionId}, user: ${userId}`);

    try {
      // Get session details
      const session = await this.getSession(sessionId);

      // Get user's contributions (questions they wrote)
      const userQuestions = await this.getContributions(sessionId, 'interview_question');
      const userQuestion = userQuestions.find(q => q.user_id === userId);

      // Get user's interview transcript
      const userTranscriptQuery = await this.client
        .from('interview_transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      const userTranscript = userTranscriptQuery.data;

      // Get AI evaluations for this user and session
      const preEvaluations = await this.getAiEvaluations(sessionId, 'pre_question_eval');
      const postEvaluations = await this.getAiEvaluations(sessionId, 'post_interview_eval');

      // Find user-specific evaluations if they exist
      const userPreEvaluation = preEvaluations.find(evaluation => evaluation.user_id === userId) || preEvaluations[0];
      const userPostEvaluation = postEvaluations.find(evaluation => evaluation.user_id === userId) || postEvaluations[0];

      // Get session interview data for persona
      const sessionDataQuery = await this.client
        .from('interview_session_data')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      const sessionData = sessionDataQuery.data;

      return {
        chosenPersona: sessionData?.persona_tag || null,
        writtenQuestion: userQuestion?.content?.question || null,
        selectedQuestion: session?.selected_question_content || null,
        aiQuestionFeedback: userPreEvaluation ? {
          input_data: userPreEvaluation.input_data,
          ai_response: userPreEvaluation.ai_response,
          processed_scores: userPreEvaluation.processed_scores,
          feedback_summary: userPreEvaluation.feedback_summary
        } : null,
        interviewTranscript: userTranscript ? {
          messages: userTranscript.messages,
          scenario_data: userTranscript.scenario_data,
          created_at: userTranscript.created_at
        } : null,
        aiInterviewFeedback: userPostEvaluation ? {
          input_data: userPostEvaluation.input_data,
          ai_response: userPostEvaluation.ai_response,
          processed_scores: userPostEvaluation.processed_scores,
          feedback_summary: userPostEvaluation.feedback_summary
        } : null,
        sessionDetails: {
          scenario_data: sessionData?.scenario_data || session?.selected_scenario,
          session_name: session?.name,
          created_at: session?.created_at
        }
      };
    } catch (error) {
      this.logger.error('getInterviewSummary error', error);
      throw error;
    }
  }

  // ============================================================================
  // LEGACY METHODS (for backward compatibility with existing code)
  // ============================================================================

  /** Create Guest User (Legacy) */
  async createGuestUser(displayName: string) {
    const { data, error } = await this.client
      .from('guest_users')
      .insert({ display_name: displayName })
      .select('id, display_name')
      .single();
    if (error) throw error;
    return data; // { id, display_name }
  }

  /**
   * Legacy: Ensure Guest Session
   * Note: This creates an old-style individual session, not a collaborative session
   */
  async ensureGuestSession(guestUserId: string, guestName: string, persona: string, scenarioTag?: string) {
    // For backward compatibility, create an individual interview session
    const session = await this.createSession(guestUserId, 'interview', `${guestName}'s Interview`);
    
    // Set persona and scenario in session state
    await this.setSessionState(session.id, 'persona', persona);
    if (scenarioTag) {
      await this.setSessionState(session.id, 'scenario_tag', scenarioTag);
    }
    
    // Create interview session data
    await this.saveInterviewSessionData(session.id, persona, scenarioTag ? { tag: scenarioTag } : undefined);
    
    return session.id; // Return session ID
  }

  /** Legacy: Initial question handling */
  async insertInitialQna(sessionId: string, userId: string, question: string) {
    // Submit as interview question contribution
    const contribution = await this.submitContribution(
      sessionId,
      userId,
      'Guest', // userName
      'interview_question',
      { question, context: 'Initial interview question' }
    );
    return contribution.id;
  }

  /** Legacy: Set initial answer (deprecated - use transcript system) */
  async setInitialAnswer(sessionId: UUID, answer: string): Promise<void> {
    this.logger.warn('setInitialAnswer is deprecated. Use saveTranscript instead.');
    // For backward compatibility, could save as transcript
  }

  /** Legacy: Get next order number (deprecated) */
  private async getNextOrderNo(sessionId: UUID): Promise<number> {
    this.logger.warn('getNextOrderNo is deprecated. Use transcript system instead.');
    return 1;
  }

  /** Legacy: Append QnA (deprecated - use transcript system) */
  async appendQna(
    sessionId: UUID,
    question: string,
    answer: string,
    orderNo?: number,
  ): Promise<number> {
    this.logger.warn('appendQna is deprecated. Use saveTranscript instead.');
    // For backward compatibility, save as transcript
    const messages = [
      { role: 'user', content: question, timestamp: new Date().toISOString() },
      { role: 'assistant', content: answer, timestamp: new Date().toISOString() }
    ];
    
    // Get first participant (should be the user)
    const { data: participants } = await this.client
      .from('session_participants')
      .select('user_id, display_name')
      .eq('session_id', sessionId)
      .limit(1);
    
    if (participants && participants.length > 0) {
      await this.saveTranscript(sessionId, participants[0].user_id, participants[0].display_name, messages);
    }
    
    return orderNo || 1;
  }

  /** Legacy: Update QnA turn (deprecated) */
  async updateQnaTurn(
    sessionId: UUID,
    orderNo: number,
    fields: Partial<Pick<QnaRow, 'question' | 'answer' | 'is_initial'>>,
  ): Promise<void> {
    this.logger.warn('updateQnaTurn is deprecated. Use transcript system instead.');
  }

  /** Legacy: Get QnA by session (backward compatibility) */
  async getQnaBySession(sessionId: UUID): Promise<QnaRow[]> {
    // Try to convert transcript back to QnA format for backward compatibility
    const transcripts = await this.getTranscripts(sessionId);
    const qnaRows: QnaRow[] = [];
    
    transcripts.forEach((transcript, index) => {
      if (transcript.messages && Array.isArray(transcript.messages)) {
        transcript.messages.forEach((msg: any, msgIndex: number) => {
          if (msg.role === 'user') {
            const nextMsg = transcript.messages[msgIndex + 1];
            const answer = nextMsg?.role === 'assistant' ? nextMsg.content : '';
            
            qnaRows.push({
              id: `${transcript.id}-${msgIndex}`,
              session_id: sessionId,
              order_no: qnaRows.length + 1,
              question: msg.content,
              answer,
              is_initial: qnaRows.length === 0,
              created_at: msg.timestamp || transcript.created_at,
              updated_at: transcript.updated_at
            });
          }
        });
      }
    });
    
    return qnaRows;
  }

  /** Legacy: List sessions by user */
  async listSessionsByUser(userId: UUID): Promise<LegacySessionRow[]> {
    // Get sessions where user is participant
    const { data: sessions, error } = await this.client
      .from('session_participants')
      .select(`
        sessions!inner(id, type, created_at, updated_at),
        session_state!inner(key, value)
      `)
      .eq('user_id', userId)
      .eq('sessions.type', 'interview')
      .eq('session_state.key', 'persona');

    if (error) {
      this.logger.error('listSessionsByUser error', error);
      throw error;
    }
    
    // Convert to legacy format
    const legacySessions: LegacySessionRow[] = (sessions || []).map((item: any) => ({
      id: item.sessions.id,
      user_id: userId,
      persona: item.session_state?.value || 'A',
      scenario_tag: null,
      created_at: item.sessions.created_at,
      updated_at: item.sessions.updated_at
    }));
    
    return legacySessions;
  }

  /** Legacy: Get session QnA */
async getSessionQna(sessionId: string): Promise<QnaRow[]> {
    return this.getQnaBySession(sessionId);
  }

  /** Legacy: Delete session */
  async deleteSession(sessionId: UUID): Promise<void> {
    // Delete session (cascades to all related data)
    const { error } = await this.client
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      this.logger.error('deleteSession error', error);
      throw error;
    }
  }
}