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

  /** Parse AI evaluation response to extract scores */
  private parseAiEvaluationScores(aiResponse: any): any {
    try {
      // Extract content from LangChain response
      let content = '';
      if (aiResponse?.content) {
        content = aiResponse.content;
      } else if (typeof aiResponse === 'string') {
        content = aiResponse;
      } else {
        this.logger.warn('Unable to extract content from AI response');
        return null;
      }

      // Parse scores from content
      const scores: any = {};
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Look for patterns like "Actionable: 4" or "Actionable - 4" or "Actionable 4"
        if (trimmedLine.includes(':')) {
          const [category, scoreText] = trimmedLine.split(':').map(s => s.trim());
          const scoreMatch = scoreText.match(/(\d+)/);
          if (scoreMatch) {
            scores[category] = parseInt(scoreMatch[1]);
          }
        } else if (trimmedLine.includes('-')) {
          const [category, scoreText] = trimmedLine.split('-').map(s => s.trim());
          const scoreMatch = scoreText.match(/(\d+)/);
          if (scoreMatch) {
            scores[category] = parseInt(scoreMatch[1]);
          }
        } else {
          // Look for patterns like "Actionable 4" (no separator)
          const scoreMatch = trimmedLine.match(/([A-Za-z\s]+)\s*(\d+)/);
          if (scoreMatch) {
            const category = scoreMatch[1].trim();
            const score = parseInt(scoreMatch[2]);
            if (category && !isNaN(score)) {
              scores[category] = score;
            }
          }
        }
      }

      // Add metadata
      scores.parsedContent = content;
      scores.parsedAt = new Date().toISOString();
      scores.totalScore = Object.values(scores)
        .filter(val => typeof val === 'number')
        .reduce((sum: number, score: number) => sum + score, 0);
      
      // Log what we found
      this.logger.log(`Parsed scores: ${JSON.stringify(scores)}`);
      
      return scores;
    } catch (error) {
      this.logger.error('Error parsing AI evaluation scores:', error);
      return null;
    }
  }

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

  /** Get final team selections for session */
  async getFinalSelections(sessionId: string): Promise<{
    povContent?: string;
    hmwContents?: string[];
  } | null> {
    try {
      const session = await this.db.getSession(sessionId);
      return {
        povContent: session.selected_pov_content,
        hmwContents: session.selected_hmw_contents
      };
    } catch (error) {
      this.logger.error('getFinalSelections error', error);
      throw error;
    }
  }

  /** Get AI evaluations with parsed scores for session */
  async getAiEvaluations(sessionId: string): Promise<{
    povEvaluations: any[];
    hmwEvaluations: any[];
  } | null> {
    try {
      const povEvaluations = await this.db.getAiEvaluations(sessionId, 'pov_feedback');
      const hmwEvaluations = await this.db.getAiEvaluations(sessionId, 'hmw_feedback');
      
      return {
        povEvaluations,
        hmwEvaluations
      };
    } catch (error) {
      this.logger.error('getAiEvaluations error', error);
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
      
      // Parse AI response to extract scores
      const processedScores = this.parseAiEvaluationScores(result);
      
      // Save AI evaluation if session is provided
      if (sessionId) {
        this.logger.log(`Saving POV AI evaluation for session: ${sessionId}, user: ${createdBy}`);
        await this.db.saveAiEvaluation(
          sessionId,
          'pov_feedback',
          { statement, needs, insights },
          result,
          { needs, insights }, // input metadata
          processedScores, // parsed scores
          'AI POV Evaluation', // feedback summary
          createdBy
        );
        this.logger.log(`POV AI evaluation saved successfully for session: ${sessionId}`);
      } else {
        this.logger.log('No sessionId provided, skipping database storage for POV evaluation');
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
        
        // Parse AI response to extract scores
        const processedScores = this.parseAiEvaluationScores(result);
        
        // Save AI evaluation if session is provided
        if (sessionId) {
          this.logger.log(`Saving HMW AI evaluation for session: ${sessionId}, user: ${createdBy}, question ${i + 1}`);
          await this.db.saveAiEvaluation(
            sessionId,
            'hmw_feedback',
            { question, needs, insights, selectedPov },
            result,
            { needs, insights, selectedPov }, // input metadata
            processedScores, // parsed scores
            `AI HMW Evaluation for Question ${i + 1}`, // feedback summary
            createdBy
          );
          this.logger.log(`HMW AI evaluation saved successfully for session: ${sessionId}, question ${i + 1}`);
        } else {
          this.logger.log(`No sessionId provided, skipping database storage for HMW evaluation question ${i + 1}`);
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
