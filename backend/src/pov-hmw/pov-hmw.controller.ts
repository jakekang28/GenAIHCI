import { Body, Controller, Get, Post, Param, Put } from '@nestjs/common';
import { PovHmwService } from './pov-hmw.service';
import { PovHmwSessionDto, PovStatementDto, HmwQuestionDto } from '../dtos/pov-hmw.dto';

@Controller('pov-hmw')
export class PovHmwController {
  constructor(private readonly povHmwService: PovHmwService) {}

  @Post('session')
  async createSession(@Body() sessionData: PovHmwSessionDto) {
    // For now, using a mock user ID. In production, this would come from auth
    const mockUserId = 'mock-user-id';
    const session = await this.povHmwService.createSession(mockUserId, sessionData);
    return { success: true, session };
  }

  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    // For now, using a mock user ID. In production, this would come from auth
    const mockUserId = 'mock-user-id';
    const session = await this.povHmwService.getSession(sessionId, mockUserId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    return { success: true, session };
  }

  @Get('session/:sessionId/final-selections')
  async getFinalSelections(@Param('sessionId') sessionId: string) {
    try {
      const selections = await this.povHmwService.getFinalSelections(sessionId);
      return { success: true, selections };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('session/:sessionId/ai-evaluations')
  async getAiEvaluations(@Param('sessionId') sessionId: string) {
    try {
      const evaluations = await this.povHmwService.getAiEvaluations(sessionId);
      return { success: true, evaluations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('pov-statement')
  async createPovStatement(@Body() povData: PovStatementDto) {
    await this.povHmwService.createPovStatement(povData);
    return { success: true, message: 'POV statement created successfully' };
  }

  @Get('pov-statements/:sessionId')
  async getPovStatements(@Param('sessionId') sessionId: string) {
    const statements = await this.povHmwService.getPovStatements(sessionId);
    return { success: true, statements };
  }

  @Put('pov-statement/:statementId/select')
  async selectPovStatement(
    @Param('statementId') statementId: string,
    @Body() body: { sessionId: string }
  ) {
    await this.povHmwService.selectPovStatement(body.sessionId, statementId);
    return { success: true, message: 'POV statement selected successfully' };
  }

  @Post('hmw-question')
  async createHmwQuestion(@Body() hmwData: HmwQuestionDto) {
    await this.povHmwService.createHmwQuestion(hmwData);
    return { success: true, message: 'HMW question created successfully' };
  }

  @Get('hmw-questions/:sessionId')
  async getHmwQuestions(@Param('sessionId') sessionId: string) {
    const questions = await this.povHmwService.getHmwQuestions(sessionId);
    return { success: true, questions };
  }

  @Put('hmw-questions/final-selection')
  async updateHmwFinalSelection(@Body() body: { sessionId: string; questionIds: string[] }) {
    await this.povHmwService.updateHmwFinalSelection(body.sessionId, body.questionIds);
    return { success: true, message: 'HMW final selection updated successfully' };
  }

  @Post('evaluate-pov')
  async evaluatePov(@Body() body: { 
    statement: string; 
    needs: string[]; 
    insights: string[];
    sessionId?: string;
    userId?: string;
  }) {
    const result = await this.povHmwService.evaluatePov(
      body.statement,
      body.needs,
      body.insights,
      body.sessionId,
      body.userId
    );
    return { success: true, result };
  }

  @Post('evaluate-all-povs')
  async evaluateAllPovs(@Body() body: { 
    sessionId: string;
    needs: string[]; 
    insights: string[];
    userId?: string;
  }) {
    const results = await this.povHmwService.evaluateAllPovs(
      body.sessionId,
      body.needs,
      body.insights,
      body.userId
    );
    return { success: true, results };
  }

  @Post('evaluate-hmw')
  async evaluateHmw(@Body() body: { 
    questions: string[]; 
    needs: string[]; 
    insights: string[]; 
    selectedPov: string;
    sessionId?: string;
    userId?: string;
  }) {
    const results = await this.povHmwService.evaluateHmw(
      body.questions,
      body.needs,
      body.insights,
      body.selectedPov,
      body.sessionId,
      body.userId
    );
    return { success: true, results };
  }

  @Post('evaluate-user-and-selected-hmws')
  async evaluateUserAndSelectedHmws(@Body() body: { 
    sessionId: string;
    userId: string;
    needs: string[]; 
    insights: string[]; 
    selectedPov: string;
  }) {
    const results = await this.povHmwService.evaluateUserAndSelectedHmws(
      body.sessionId,
      body.userId,
      body.needs,
      body.insights,
      body.selectedPov,
      body.userId
    );
    return { success: true, ...results };
  }

  // ============================================================================
  // COLLABORATIVE ENDPOINTS
  // ============================================================================
  
  @Post('session/join')
  async joinSession(@Body() body: { sessionCode: string; userId: string; displayName: string }) {
    try {
      const session = await this.povHmwService.joinSessionByCode(body.sessionCode, body.userId, body.displayName);
      return { success: true, session };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  @Get('session/:sessionId/participants')
  async getSessionParticipants(@Param('sessionId') sessionId: string) {
    const participants = await this.povHmwService.getSessionParticipants(sessionId);
    return { success: true, participants };
  }
  
  @Put('session/:sessionId/status')
  async updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body() body: { status: 'active' | 'completed' | 'archived'; currentStage?: string }
  ) {
    await this.povHmwService.updateSessionStatus(sessionId, body.status, body.currentStage);
    return { success: true, message: 'Session status updated successfully' };
  }
  
  @Post('session/:sessionId/needs-insights')
  async setNeedsInsights(
    @Param('sessionId') sessionId: string,
    @Body() body: { needs: string[]; insights: string[] }
  ) {
    await this.povHmwService.setNeedsInsights(sessionId, body.needs, body.insights);
    return { success: true, message: 'Needs and insights set successfully' };
  }
}
