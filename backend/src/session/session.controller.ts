import { Body, Controller, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SessionGateway } from './gateway';
import { DbService } from '../db/db.service';
import { CreateRoomDto, JoinRoomDto, RoomResponseDto } from '../dtos/pov-hmw.dto';

@Controller('sessions')
export class SessionController {
  constructor(
    private readonly gateway: SessionGateway,
    private readonly dbService: DbService,
  ) {}

  @Post('create-room')
  async createRoom(@Body() body: CreateRoomDto): Promise<{ sessionId: string; roomCode: string }> {
    try {
      const session = await this.dbService.createSession(body.hostUserId, 'interview', body.roomName);
      // For interview sessions, also save interview session data
      await this.dbService.saveInterviewSessionData(session.id, undefined, undefined);
      return { sessionId: session.id, roomCode: session.code };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  @Post('join-room')
  async joinRoom(@Body() body: JoinRoomDto): Promise<RoomResponseDto> {
    try {
      const session = await this.dbService.joinSessionByCode(body.roomCode, body.userId, body.displayName);
      
      // Map SessionRow to RoomResponseDto for backward compatibility
      const roomResponse: RoomResponseDto = {
        id: session.id,
        code: session.code,
        name: session.name,
        type: session.type,
        status: session.status,
        current_step: session.current_stage, // Map current_stage to current_step
        max_participants: session.max_participants,
        host_user_id: session.host_user_id,
        created_at: session.created_at,
        updated_at: session.updated_at
      };
      
      return roomResponse;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  }

  // Legacy endpoint for backward compatibility
  @Post()
  create() {
    const sessionId = randomUUID();
    console.warn('Legacy /sessions POST endpoint called. Consider updating frontend to /sessions/create-room');
    return { sessionId };
  }
}
