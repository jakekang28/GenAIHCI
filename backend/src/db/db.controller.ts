import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { DbService } from './db.service';
class CreateGuestDto {
  name: string;
}

class EnsureSessionDto {
  guestUserId: string;
  guestName: string;
  persona: 'A' | 'B' | 'C' | 'D';
  scenarioTag?: string;
}

@Controller('db')
export class DbController {
  constructor(private readonly db: DbService) {}
@Post('guest')
  async createGuest(@Body() dto: CreateGuestDto) {
    try {
      if (!dto?.name?.trim()) {
        throw new HttpException('name is required', HttpStatus.BAD_REQUEST);
      }
      const user = await this.db.createGuestUser(dto.name.trim());
      return { guestUserId: user.id, guestName: user.display_name };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to create guest', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
@Post('sessions')
  async ensureSession(@Body() dto: EnsureSessionDto) {
    try {
      const sessionId = await this.db.ensureGuestSession(
        dto.guestUserId,
        dto.guestName,
        dto.persona,
        dto.scenarioTag,
      );
      return { sessionId };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to create session', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
@Get('sessions/:sessionId/qna')
  async listQna(@Param('sessionId') sessionId: string) {
    try {
      const qna = await this.db.getSessionQna(sessionId);
      return { sessionId, qna };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch qna', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('transcripts')
  async saveTranscript(@Body() body: {
    sessionId: string;
    userId: string;
    userName: string;
    messages: any[];
    scenarioData?: any;
  }) {
    try {
      const { sessionId, userId, userName, messages, scenarioData } = body;
      
      if (!sessionId || !userId || !userName || !messages) {
        throw new HttpException('sessionId, userId, userName, and messages are required', HttpStatus.BAD_REQUEST);
      }

      const transcript = await this.db.saveTranscript(sessionId, userId, userName, messages, scenarioData);
      return { success: true, transcript };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to save transcript', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('transcripts/:sessionId')
  async getSessionTranscripts(@Param('sessionId') sessionId: string) {
    try {
      const transcripts = await this.db.getTranscripts(sessionId);
      return { sessionId, transcripts };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch transcripts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('interview-complete')
  async markInterviewComplete(@Body() body: {
    sessionId: string;
    userId: string;
  }) {
    try {
      const { sessionId, userId } = body;
      
      if (!sessionId || !userId) {
        throw new HttpException('sessionId and userId are required', HttpStatus.BAD_REQUEST);
      }

      await this.db.markInterviewComplete(sessionId, userId);
      return { success: true, message: 'Interview marked as complete' };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to mark interview complete', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('interview-completion-status/:sessionId')
  async getInterviewCompletionStatus(@Param('sessionId') sessionId: string) {
    try {
      const status = await this.db.getInterviewCompletionStatus(sessionId);
      return { sessionId, ...status };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch interview completion status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('interview-completion-status/:sessionId')
  async getInterviewCompletionStatusWithParticipants(
    @Param('sessionId') sessionId: string,
    @Body() body: { participants: Array<{userId: string, userName: string}> }
  ) {
    try {
      const { participants } = body;
      const status = await this.db.getInterviewCompletionStatus(sessionId, participants);
      return { sessionId, ...status };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch interview completion status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('interview-session-data')
  async saveInterviewSessionData(@Body() body: {
    sessionId: string;
    personaTag?: string;
    scenarioData?: any;
  }) {
    try {
      const { sessionId, personaTag, scenarioData } = body;
      
      if (!sessionId) {
        throw new HttpException('sessionId is required', HttpStatus.BAD_REQUEST);
      }

      await this.db.saveInterviewSessionData(sessionId, personaTag, scenarioData);
      return { success: true, message: 'Interview session data saved successfully' };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to save interview session data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('interview-summary/:sessionId/:userId')
  async getInterviewSummary(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string
  ) {
    try {
      const summary = await this.db.getInterviewSummary(sessionId, userId);
      return { sessionId, userId, ...summary };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch interview summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ============================================================================
  // INTERVIEW SUMMARY STORAGE ENDPOINTS
  // ============================================================================

  @Post('interview-summaries')
  async saveInterviewSummary(@Body() body: {
    sessionId: string;
    userId: string;
    userName: string;
    summaryText: string;
    summaryFormat?: 'text' | 'markdown' | 'html';
    sessionName?: string;
    personaTag?: string;
    questionCount?: number;
  }) {
    try {
      const { 
        sessionId, userId, userName, summaryText, summaryFormat, 
        sessionName, personaTag, questionCount 
      } = body;
      
      if (!sessionId || !userId || !userName || !summaryText) {
        throw new HttpException('sessionId, userId, userName, and summaryText are required', HttpStatus.BAD_REQUEST);
      }

      const summary = await this.db.saveInterviewSummary(
        sessionId, userId, userName, summaryText, summaryFormat,
        sessionName, personaTag, questionCount
      );
      return { success: true, summary };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to save interview summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('interview-summaries/session/:sessionId')
  async getSessionInterviewSummaries(@Param('sessionId') sessionId: string) {
    try {
      const summaries = await this.db.getSessionInterviewSummaries(sessionId);
      return { sessionId, summaries };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch session interview summaries', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('interview-summaries/user/:userId')
  async getUserInterviewSummaries(@Param('userId') userId: string) {
    try {
      const summaries = await this.db.getUserInterviewSummaries(userId);
      return { userId, summaries };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch user interview summaries', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('interview-summaries/:sessionId/:userId')
  async getStoredInterviewSummary(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string
  ) {
    try {
      const summary = await this.db.getStoredInterviewSummary(sessionId, userId);
      if (!summary) {
        return { sessionId, userId, summary: null, message: 'No stored summary found' };
      }
      return { sessionId, userId, summary };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to fetch stored interview summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('interview-summaries/:summaryId')
  async deleteInterviewSummary(@Param('summaryId') summaryId: string) {
    try {
      await this.db.deleteInterviewSummary(summaryId);
      return { success: true, message: 'Interview summary deleted successfully' };
    } catch (e) {
      throw new HttpException(e.message ?? 'Failed to delete interview summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}