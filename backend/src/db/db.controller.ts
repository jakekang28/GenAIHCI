import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
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
}