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

      // Parse scores from content using more robust regex patterns
      const scores: any = {};
      
      // More flexible patterns to catch various formats
      const patterns = [
        // Pattern 1: "**Category: 4**" or "**Category:4**"
        /\*\*([^*]+):\s*(\d+)\*\*/g,
        // Pattern 2: "Category: 4" or "Category:4"
        /([A-Za-z\s]+):\s*(\d+)/g,
        // Pattern 3: "Category - 4" or "Category-4"
        /([A-Za-z\s]+)\s*-\s*(\d+)/g,
        // Pattern 4: "Category 4" (space separated)
        /([A-Za-z\s]+)\s+(\d+)/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const category = match[1].trim().replace(/\*\*/g, ''); // Remove any remaining **
          const score = parseInt(match[2]);
          
          // Only accept valid scores (1-5) and meaningful categories
          if (!isNaN(score) && score >= 1 && score <= 5 && category.length > 2) {
            scores[category] = score;
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
    preInterviewEvaluations: any[];
    postInterviewEvaluations: any[];
  } | null> {
    try {
      const povEvaluations = await this.db.getAiEvaluations(sessionId, 'pov_feedback');
      const hmwEvaluations = await this.db.getAiEvaluations(sessionId, 'hmw_feedback');
      const preInterviewEvaluations = await this.db.getAiEvaluations(sessionId, 'pre_question_eval');
      const postInterviewEvaluations = await this.db.getAiEvaluations(sessionId, 'post_interview_eval');
      
      return {
        povEvaluations,
        hmwEvaluations,
        preInterviewEvaluations,
        postInterviewEvaluations
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
        user_id: contrib.user_id,
        order_index: contrib.order_index,
        created_at: contrib.created_at
      }));
    } catch (error) {
      this.logger.error('getHmwQuestions error', error);
      throw error;
    }
  }

  /** Get HMW questions for a specific user in a session */
  async getUserHmwQuestions(sessionId: string, userId: string): Promise<any[]> {
    try {
      const allQuestions = await this.getHmwQuestions(sessionId);
      return allQuestions.filter(q => q.user_id === userId);
    } catch (error) {
      this.logger.error('getUserHmwQuestions error', error);
      throw error;
    }
  }

  /** Get selected HMW questions for a session */
  async getSelectedHmwQuestions(sessionId: string): Promise<any[]> {
    try {
      const session = await this.db.getSession(sessionId);
      const selectedContents = session.selected_hmw_contents || [];
      
      // Get all HMW questions and match with selected contents
      const allQuestions = await this.getHmwQuestions(sessionId);
      return selectedContents.map((content, index) => ({
        id: `selected-${index}`,
        question: content,
        student_name: 'Team Selection',
        user_id: null,
        order_index: index + 1,
        created_at: new Date().toISOString(),
        isSelected: true
      }));
    } catch (error) {
      this.logger.error('getSelectedHmwQuestions error', error);
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

  /** Evaluate all POV statements for a session */
  async evaluateAllPovs(sessionId: string, needs: string[], insights: string[], createdBy?: string): Promise<any[]> {
    try {
      // Get all POV statements for the session
      const povStatements = await this.getPovStatements(sessionId);
      
      if (povStatements.length === 0) {
        this.logger.warn(`No POV statements found for session: ${sessionId}`);
        return [];
      }

      const needsText = needs.map((need, i) => `${i + 1}. ${need}`).join('\n');
      const insightsText = insights.map((insight, i) => `Insight ${i + 1}: ${insight}`).join('\n');
      
      const results: any[] = [];
      
      // Evaluate each POV statement
      for (const povStatement of povStatements) {
        this.logger.log(`Evaluating POV statement ${povStatement.id} by ${povStatement.student_name}`);
        
        const dynamicData = {
          needs: needsText,
          insights: insightsText,
          userPOV: povStatement.statement
        };

        const result = await this.llmService.runDynamicPrompt('pov.txt', dynamicData);
        
        // Parse AI response to extract scores
        const processedScores = this.parseAiEvaluationScores(result);
        
        // Save AI evaluation to database
        await this.db.saveAiEvaluation(
          sessionId,
          'pov_feedback',
          { 
            statement: povStatement.statement, 
            needs, 
            insights,
            povStatementId: povStatement.id,
            studentName: povStatement.student_name
          },
          result,
          { needs, insights, povStatementId: povStatement.id, studentName: povStatement.student_name }, // input metadata
          processedScores, // parsed scores
          `AI POV Evaluation for ${povStatement.student_name}`, // feedback summary
          createdBy
        );
        
        results.push({
          povStatementId: povStatement.id,
          statement: povStatement.statement,
          studentName: povStatement.student_name,
          evaluation: result,
          processedScores
        });
        
        this.logger.log(`POV evaluation completed and saved for statement ${povStatement.id}`);
      }
      
      this.logger.log(`Completed evaluation of ${results.length} POV statements for session: ${sessionId}`);
      return results;
    } catch (error) {
      this.logger.error('evaluateAllPovs error', error);
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

  /** Evaluate user's own HMWs and selected HMWs */
  async evaluateUserAndSelectedHmws(sessionId: string, userId: string, needs: string[], insights: string[], selectedPov: string, createdBy?: string): Promise<{
    userHmwResults: any[];
    selectedHmwResults: any[];
  }> {
    try {
      // Get user's own HMW questions
      const userHmwQuestions = await this.getUserHmwQuestions(sessionId, userId);
      const selectedHmwQuestions = await this.getSelectedHmwQuestions(sessionId);

      const needsText = needs.map((need, i) => `${i + 1}. ${need}`).join('\n');
      const insightsText = insights.map((insight, i) => `Insight ${i + 1}: ${insight}`).join('\n');
      
      const userHmwResults: any[] = [];
      const selectedHmwResults: any[] = [];
      
      // Evaluate user's own HMW questions
      for (let i = 0; i < userHmwQuestions.length; i++) {
        const hmwQuestion = userHmwQuestions[i];
        
        const dynamicData = {
          needs: needsText,
          insights: insightsText,
          userPOV: selectedPov,
          hmwQuestions: `${i + 1}. ${hmwQuestion.question}`
        };

        const result = await this.llmService.runDynamicPrompt('hmw.txt', dynamicData);
        const processedScores = this.parseAiEvaluationScores(result);
        
        userHmwResults.push({
          hmwQuestionId: hmwQuestion.id,
          question: hmwQuestion.question,
          orderIndex: hmwQuestion.order_index,
          evaluation: result,
          processedScores,
          isUserOwn: true
        });
        
        // Save AI evaluation
        if (sessionId) {
          await this.db.saveAiEvaluation(
            sessionId,
            'hmw_feedback',
            { 
              question: hmwQuestion.question, 
              needs, 
              insights, 
              selectedPov,
              hmwQuestionId: hmwQuestion.id,
              evaluationType: 'user_own'
            },
            result,
            { needs, insights, selectedPov, hmwQuestionId: hmwQuestion.id, evaluationType: 'user_own' },
            processedScores,
            `AI HMW Evaluation for User's Question ${i + 1}`,
            createdBy
          );
        }
      }
      
      // Evaluate selected HMW questions
      for (let i = 0; i < selectedHmwQuestions.length; i++) {
        const hmwQuestion = selectedHmwQuestions[i];
        
        const dynamicData = {
          needs: needsText,
          insights: insightsText,
          userPOV: selectedPov,
          hmwQuestions: `${i + 1}. ${hmwQuestion.question}`
        };

        const result = await this.llmService.runDynamicPrompt('hmw.txt', dynamicData);
        const processedScores = this.parseAiEvaluationScores(result);
        
        selectedHmwResults.push({
          hmwQuestionId: hmwQuestion.id,
          question: hmwQuestion.question,
          orderIndex: hmwQuestion.order_index,
          evaluation: result,
          processedScores,
          isSelected: true
        });
        
        // Save AI evaluation
        if (sessionId) {
          await this.db.saveAiEvaluation(
            sessionId,
            'hmw_feedback',
            { 
              question: hmwQuestion.question, 
              needs, 
              insights, 
              selectedPov,
              hmwQuestionId: hmwQuestion.id,
              evaluationType: 'selected'
            },
            result,
            { needs, insights, selectedPov, hmwQuestionId: hmwQuestion.id, evaluationType: 'selected' },
            processedScores,
            `AI HMW Evaluation for Selected Question ${i + 1}`,
            createdBy
          );
        }
      }
      
      this.logger.log(`Completed evaluation of ${userHmwResults.length} user HMWs and ${selectedHmwResults.length} selected HMWs for session: ${sessionId}`);
      return { userHmwResults, selectedHmwResults };
    } catch (error) {
      this.logger.error('evaluateUserAndSelectedHmws error', error);
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
