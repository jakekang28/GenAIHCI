import { Injectable, Logger } from '@nestjs/common';
import { LangchainService } from '../llm/llm.service';
import { DbService } from '../db/db.service';
import { PovHmwSessionDto, PovStatementDto, HmwQuestionDto, PovHmwSessionResponseDto } from '../dtos/pov-hmw.dto';

@Injectable()
export class PovHmwService {
  private logger = new Logger(PovHmwService.name);

  constructor(
    private readonly llmService: LangchainService,
    private readonly db: DbService
  ) {}

  /** Create a new POV/HMW collaborative session */
  async createSession(hostUserId: string, sessionData: PovHmwSessionDto): Promise<PovHmwSessionResponseDto> {
    try {
      // Create collaborative session
      const session = await this.db.createSession(hostUserId, 'pov_hmw', 'POV/HMW Session');
      
      // Set needs and insights in session state
      await this.db.setSessionState(session.id, 'needs_insights', {
        needs: sessionData.needs,
        insights: sessionData.insights
      });
      
      // Create POV/HMW session data
      await this.db.savePovHmwSessionData(session.id, sessionData.needs, sessionData.insights);
      
      return {
        id: session.id,
        needs: sessionData.needs,
        insights: sessionData.insights,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      this.logger.error('createSession error', error);
      throw error;
    }
  }

  /** Get session (user must be participant) */
  async getSession(sessionId: string, userId: string): Promise<PovHmwSessionResponseDto | null> {
    try {
      // Get session details with participants
      const session = await this.db.getSession(sessionId);
      
      // Check if user is a participant
      const isParticipant = session.participants.some(p => p.user_id === userId && p.is_active);
      if (!isParticipant) {
        return null;
      }
      
      // Get needs/insights from session state
      const sessionState = await this.db.getSessionState(sessionId, 'needs_insights');
      const needsInsights = sessionState.length > 0 ? sessionState[0].value : { needs: [], insights: [] };
      
      return {
        id: session.id,
        needs: needsInsights.needs || [],
        insights: needsInsights.insights || [],
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    } catch (error) {
      this.logger.error('getSession error', error);
      throw error;
    }
  }

  /** Submit POV statement contribution */
  async createPovStatement(povData: PovStatementDto): Promise<void> {
    try {
      const session = await this.db.getSession(povData.sessionId);
      const participant = session.participants.find(p => p.display_name === povData.studentName);
      
      if (!participant) {
        throw new Error('Participant not found in session');
      }
      
      await this.db.submitContribution(
        povData.sessionId,
        participant.user_id,
        participant.display_name,
        'pov_statement',
        {
          statement: povData.statement,
          student_name: povData.studentName
        }
      );
    } catch (error) {
      this.logger.error('createPovStatement error', error);
      throw error;
    }
  }

  /** Get all POV statements for session */
  async getPovStatements(sessionId: string): Promise<any[]> {
    try {
      const contributions = await this.db.getContributions(sessionId, 'pov_statement');
      
      return contributions.map(contrib => ({
        id: contrib.id,
        statement: contrib.content.statement,
        student_name: contrib.content.student_name,
        created_at: contrib.created_at
      }));
    } catch (error) {
      this.logger.error('getPovStatements error', error);
      throw error;
    }
  }

  /** Select POV statement */
  async selectPovStatement(sessionId: string, statementId: string): Promise<void> {
    try {
      // Get the POV statement content
      const contributions = await this.db.getContributions(sessionId, 'pov_statement');
      const selectedPov = contributions.find(c => c.id === statementId);
      
      if (!selectedPov) {
        throw new Error('POV statement not found');
      }
      
      // Store final selection directly in session
      await this.db.setFinalSelections(sessionId, {
        povContent: selectedPov.content.statement
      });
      
      // Store selection in session state for easy access during voting
      await this.db.setSessionState(sessionId, 'selected_pov', statementId);
    } catch (error) {
      this.logger.error('selectPovStatement error', error);
      throw error;
    }
  }

  /** Submit HMW question contribution */
  async createHmwQuestion(hmwData: HmwQuestionDto): Promise<void> {
    try {
      const session = await this.db.getSession(hmwData.sessionId);
      const participant = session.participants.find(p => p.display_name === hmwData.studentName);
      
      if (!participant) {
        throw new Error('Participant not found in session');
      }
      
      await this.db.submitContribution(
        hmwData.sessionId,
        participant.user_id,
        participant.display_name,
        'hmw_question',
        {
          question: hmwData.question,
          student_name: hmwData.studentName
        },
        hmwData.orderIndex
      );
    } catch (error) {
      this.logger.error('createHmwQuestion error', error);
      throw error;
    }
  }

  /** Get all HMW questions for session */
  async getHmwQuestions(sessionId: string): Promise<any[]> {
    try {
      const contributions = await this.db.getContributions(sessionId, 'hmw_question');
      
      return contributions.map(contrib => ({
        id: contrib.id,
        question: contrib.content.question,
        student_name: contrib.content.student_name,
        order_index: contrib.order_index,
        created_at: contrib.created_at
      }));
    } catch (error) {
      this.logger.error('getHmwQuestions error', error);
      throw error;
    }
  }

  /** Select final HMW questions */
  async updateHmwFinalSelection(sessionId: string, questionIds: string[]): Promise<void> {
    try {
      // Get the HMW question contents
      const contributions = await this.db.getContributions(sessionId, 'hmw_question');
      const selectedQuestions = contributions
        .filter(c => questionIds.includes(c.id))
        .map(c => c.content.question);
      
      // Store final selection directly in session
      await this.db.setFinalSelections(sessionId, {
        hmwContents: selectedQuestions
      });
      
      // Store selection in session state for easy access during voting
      await this.db.setSessionState(sessionId, 'selected_hmw', questionIds);
    } catch (error) {
      this.logger.error('updateHmwFinalSelection error', error);
      throw error;
    }
  }

  /** Evaluate POV statement with AI */
  async evaluatePov(statement: string, needs: string[], insights: string[], sessionId?: string, createdBy?: string): Promise<any> {
    try {
      const needsText = needs.map((need, i) => `${i + 1}. ${need}`).join('\n');
      const insightsText = insights.map((insight, i) => `Insight ${i + 1}: ${insight}`).join('\n');
      
      const dynamicData = {
        needs: needsText,
        insights: insightsText,
        userPOV: statement
      };

      const result = await this.llmService.runDynamicPrompt('pov.txt', dynamicData);
      
      // Save AI evaluation if session is provided
      if (sessionId) {
        await this.db.saveAiEvaluation(
          sessionId,
          'pov_feedback',
          { statement, needs, insights },
          result,
          { needs, insights }, // input metadata
          undefined, // processed scores
          'AI POV Evaluation', // feedback summary
          createdBy
        );
      }
      
      return result;
    } catch (error) {
      this.logger.error('evaluatePov error', error);
      throw error;
    }
  }

  /** Evaluate HMW questions with AI */
  async evaluateHmw(questions: string[], needs: string[], insights: string[], selectedPov: string, sessionId?: string, createdBy?: string): Promise<any[]> {
    try {
      const needsText = needs.map((need, i) => `${i + 1}. ${need}`).join('\n');
      const insightsText = insights.map((insight, i) => `Insight ${i + 1}: ${insight}`).join('\n');
      
      const results: any[] = [];
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        const dynamicData = {
          needs: needsText,
          insights: insightsText,
          userPOV: selectedPov,
          hmwQuestions: `${i + 1}. ${question}`
        };

        const result = await this.llmService.runDynamicPrompt('hmw.txt', dynamicData);
        results.push(result);
        
        // Save AI evaluation if session is provided
        if (sessionId) {
          await this.db.saveAiEvaluation(
            sessionId,
            'hmw_feedback',
            { question, needs, insights, selectedPov },
            result,
            { needs, insights, selectedPov }, // input metadata
            undefined, // processed scores
            `AI HMW Evaluation for Question ${i + 1}`, // feedback summary
            createdBy
          );
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error('evaluateHmw error', error);
      throw error;
    }
  }
  
  // ============================================================================
  // COLLABORATIVE METHODS
  // ============================================================================
  
  /** Join session by code */
  async joinSessionByCode(sessionCode: string, userId: string, displayName: string) {
    try {
      return await this.db.joinSessionByCode(sessionCode, userId, displayName);
    } catch (error) {
      this.logger.error('joinSessionByCode error', error);
      throw error;
    }
  }
  
  /** Get session participants */
  async getSessionParticipants(sessionId: string) {
    try {
      const session = await this.db.getSession(sessionId);
      return session.participants;
    } catch (error) {
      this.logger.error('getSessionParticipants error', error);
      throw error;
    }
  }
  
  /** Update session status */
  async updateSessionStatus(sessionId: string, status: 'active' | 'completed' | 'archived', currentStage?: string) {
    try {
      await this.db.updateSessionStatus(sessionId, status, currentStage);
    } catch (error) {
      this.logger.error('updateSessionStatus error', error);
      throw error;
    }
  }
  
  /** Set needs and insights */
  async setNeedsInsights(sessionId: string, needs: string[], insights: string[]) {
    try {
      await this.db.setSessionState(sessionId, 'needs_insights', { needs, insights });
      await this.db.savePovHmwSessionData(sessionId, needs, insights);
    } catch (error) {
      this.logger.error('setNeedsInsights error', error);
      throw error;
    }
  }
}
