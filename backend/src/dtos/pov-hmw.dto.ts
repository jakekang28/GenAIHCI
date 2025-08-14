export class PovHmwSessionDto {
  needs: string[];
  insights: string[];
}

export class PovStatementDto {
  statement: string;
  studentName: string;
  sessionId: string;
}

export class HmwQuestionDto {
  question: string;
  studentName: string;
  sessionId: string;
  isFinalSelection?: boolean;
  orderIndex?: number;
}

export class PovHmwSessionResponseDto {
  id: string;
  needs: string[];
  insights: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// NEW ROOM-BASED DTOs
// ============================================================================

export class CreateRoomDto {
  hostUserId: string;
  hostName: string;
  needs: string[];
  insights: string[];
  roomName?: string;
}

export class JoinRoomDto {
  roomCode: string;
  userId: string;
  displayName: string;
}

export class RoomParticipantDto {
  user_id: string;
  display_name: string;
  is_host: boolean;
  is_active: boolean;
  joined_at: string;
  last_seen_at: string;
}

export class RoomResponseDto {
  id: string;
  code: string;
  name: string;
  type: 'interview' | 'pov_hmw';
  status: 'setup' | 'active' | 'completed' | 'archived';
  current_step: string;
  max_participants: number;
  host_user_id: string;
  participants?: RoomParticipantDto[];
  created_at: string;
  updated_at: string;
}

export class ContributionDto {
  id: string;
  room_id: string;
  user_id: string;
  type: 'interview_question' | 'pov_statement' | 'hmw_question';
  content: any;
  order_index?: number;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export class RoomStateDto {
  room_id: string;
  key: string;
  value: any;
  set_by: string;
  set_at: string;
}