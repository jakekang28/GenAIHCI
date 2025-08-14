
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DbService } from '../db/db.service';
import { Logger } from '@nestjs/common';

// Updated object types for room-based collaboration
type RoomMember = { 
  socketId: string; 
  userId: string; 
  userName: string; 
  isHost: boolean;
  isActive: boolean;
};

type RoomStage = 'setup' | 'contributions' | 'selection' | 'evaluation' | 'completed';

type Contribution = { 
  id?: string;
  socketId: string; 
  userId: string; 
  userName: string; 
  type: 'interview_question' | 'pov_statement' | 'hmw_question';
  content: any;
  isSelected: boolean;
  timestamp: string;
};

type HostDecision = {
  type: 'select_contribution' | 'set_needs_insights' | 'change_stage';
  data: any;
  decidedBy: string;
  timestamp: string;
};

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(SessionGateway.name);

  // Room-based in-memory state for real-time features
  private rooms = new Map<string, Map<string, RoomMember>>();
  private socketIndex = new Map<string, { roomId: string }>();
  private roomStages = new Map<string, RoomStage>();
  private roomContributions = new Map<string, Map<string, Contribution>>();
  private hostDecisions = new Map<string, HostDecision[]>();
  
  constructor(private readonly db: DbService) {}

  handleConnection(socket: Socket) {
    this.logger.log(`Socket connected: ${socket.id}`);
  }

  // Room helper methods
  private getRoomMembers(roomId: string): RoomMember[] {
    return Array.from(this.rooms.get(roomId)?.values() ?? []);
  }
  
  private getUniqueRoomMembers(roomId: string): RoomMember[] {
    const allMembers = this.getRoomMembers(roomId);
    const uniqueMembers = new Map<string, RoomMember>();
    
    this.logger.log(`getUniqueRoomMembers for room ${roomId}:`);
    this.logger.log(`  All members (${allMembers.length}): ${JSON.stringify(allMembers.map(m => ({userId: m.userId, userName: m.userName, socketId: m.socketId})))}`);
    
    // Keeping Recent Socket Connection for user
    allMembers.forEach(member => {
      if (!uniqueMembers.has(member.userId) || member.isActive) {
        uniqueMembers.set(member.userId, member);
      }
    });
    
    const result = Array.from(uniqueMembers.values());
    this.logger.log(`  Unique members (${result.length}): ${JSON.stringify(result.map(m => ({userId: m.userId, userName: m.userName})))}`);
    
    return result;
  }
  
  private getRoomStage(roomId: string): RoomStage {
    return this.roomStages.get(roomId) ?? 'setup';
  }
  
  private getRoomContributions(roomId: string, type?: string): Contribution[] {
    const contributions = Array.from(this.roomContributions.get(roomId)?.values() ?? []);
    return type ? contributions.filter(c => c.type === type) : contributions;
  }
  
  private getHost(roomId: string): RoomMember | undefined {
    return this.getRoomMembers(roomId).find(member => member.isHost);
  }
  
  private isHost(roomId: string, userId: string): boolean {
    const host = this.getHost(roomId);
    return host?.userId === userId;
  }

  // Broadcast Helper Methods
  private broadcastRoomMembers(roomId: string) {
    const members = this.getRoomMembers(roomId);
    this.server.to(roomId).emit('room:members', { members }); //new emit
    this.server.to(roomId).emit('session:members', { members }); // Legacy
  }
  
  private broadcastRoomStage(roomId: string) {
    const stage = this.getRoomStage(roomId);
    this.server.to(roomId).emit('room:stage', { stage }); //new emit
    this.server.to(roomId).emit('session:stage', { stage }); // Legacy
  }
  
  private broadcastContributions(roomId: string, type?: string) {
    const contributions = this.getRoomContributions(roomId, type);
    
    this.logger.log(`🔄 [SessionGateway] Broadcasting contributions for room ${roomId}:`);
    this.logger.log(`🔄 [SessionGateway] Type: ${type}, Count: ${contributions.length}`);
    this.logger.log(`🔄 [SessionGateway] Contributions: ${JSON.stringify(contributions.map(c => ({ id: c.id, userName: c.userName, type: c.type })))}`);
    
    // Emit New Events
    this.server.to(roomId).emit('room:contributions', { contributions, type });
    
    // Legacy Events
    if (type === 'interview_question') {
      this.server.to(roomId).emit('interview:questions', { questions: contributions }); // Legacy
    }
    
    this.logger.log(`📤 [SessionGateway] Emitted room:contributions to room ${roomId}`);
  }
  
  private broadcastHostDecision(roomId: string, decision: HostDecision) {
    if (!this.hostDecisions.has(roomId)) {
      this.hostDecisions.set(roomId, []);
    }
    this.hostDecisions.get(roomId)!.push(decision);
    
    this.server.to(roomId).emit('room:host_decision', { decision });
  }
  
  private broadcastLoadingState(roomId: string, message: string, isHost: boolean = false) {
    const event = isHost ? 'room:host_deciding' : 'room:loading';
    this.server.to(roomId).emit(event, { message });
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @MessageBody() body: { roomId: string; userId: string; userName: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, userId, userName } = body || {};
    if (!roomId || !userId) {
      socket.emit('room:error', { message: 'Room ID and User ID are required' });
      return;
    }

    try {
      // Take session details from DB
      const session = await this.db.getSession(roomId);
      const isParticipant = session.participants.some(p => p.user_id === userId && p.is_active);
      
      if (!isParticipant) {
        socket.emit('room:error', { message: 'You are not a participant in this room' });
        return;
      }

      await socket.join(roomId);

      // Initialize Room State (if needed)
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Map());
        this.roomStages.set(roomId, 'setup');
        this.roomContributions.set(roomId, new Map());
      }

      // Find Participant Details
      const participant = session.participants.find(p => p.user_id === userId);
      const isHost = participant?.is_host || false;

      // Register Member
      this.rooms.get(roomId)!.set(socket.id, {
        socketId: socket.id,
        userId,
        userName: participant?.display_name || userName,
        isHost,
        isActive: true
      });
      
      this.socketIndex.set(socket.id, { roomId });

      // Send Current State to Joining User
      socket.emit('room:joined', {
        roomId,
        isHost,
        session: {
          id: session.id,
          code: session.code,
          name: session.name,
          type: session.type,
          status: session.status,
          current_stage: session.current_stage
        }
      });
      
      // Send current state to joining user
      const members = this.getRoomMembers(roomId);
      const stage = this.getRoomStage(roomId);
      const contributions = this.getRoomContributions(roomId);
      
      socket.emit('room:members', { members }); //new event
      socket.emit('session:members', { members }); // Legacy
      socket.emit('room:stage', { stage }); //new event
      socket.emit('session:stage', { stage }); // Legacy
      socket.emit('room:contributions', { contributions });
      socket.emit('interview:questions', { questions: contributions.filter(c => c.type === 'interview_question') }); // Legacy

      // Broadcast Member Update to Room
      this.broadcastRoomMembers(roomId);
      
      this.logger.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      this.logger.error('Error joining room:', error);
      socket.emit('room:error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @MessageBody() body: { roomId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId } = body || {};
    if (!roomId) return;

    this.removeSocketFromRoom(socket, roomId);
  }

  handleDisconnect(socket: Socket) {
    const link = this.socketIndex.get(socket.id);
    if (!link) return;

    const { roomId } = link;
    this.removeSocketFromRoom(socket, roomId);
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  private removeSocketFromRoom(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room?.has(socket.id)) {
      room.delete(socket.id);
      if (room.size === 0) {
        // Clean up Empty Room State
        this.rooms.delete(roomId);
        this.roomStages.delete(roomId);
        this.roomContributions.delete(roomId);
        this.hostDecisions.delete(roomId);
      }
    }

    // Clean up Contributions from this socket
    const contributions = this.roomContributions.get(roomId);
    if (contributions?.has(socket.id)) {
      contributions.delete(socket.id);
      if (contributions.size === 0) {
        this.roomContributions.delete(roomId);
      }
    }

    socket.leave(roomId);
    this.socketIndex.delete(socket.id);

    // Broadcast Updates if Room Still has Members
    if (room && room.size > 0) {
      this.broadcastRoomMembers(roomId);
      this.broadcastContributions(roomId);
    }
  }

  /** Submit contribution (question, POV statement, HMW question) */
  @SubscribeMessage('room:contribution:submit')
  async handleContributionSubmit(
    @MessageBody() body: { 
      roomId: string; 
      type: 'interview_question' | 'pov_statement' | 'hmw_question';
      content: any;
      saveToDb?: boolean;
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, type, content, saveToDb = false } = body || {};
    if (!roomId || !type || !content) {
      socket.emit('room:error', { message: 'Room ID, type, and content are required' });
      return;
    }

    const member = this.rooms.get(roomId)?.get(socket.id);
    if (!member) {
      socket.emit('room:error', { message: 'You are not a member of this room' });
      return;
    }

    try {
      // Ensure contributions map exists
      if (!this.roomContributions.has(roomId)) {
        this.roomContributions.set(roomId, new Map());
      }

      const contribution: Contribution = {
      socketId: socket.id,
      userId: member.userId,
      userName: member.userName,
        type,
        content,
        isSelected: false,
        timestamp: new Date().toISOString()
      };

      // Save to database if requested
      if (saveToDb) {
        const dbContribution = await this.db.submitContribution(
          roomId,
          member.userId,
          member.userName,
          type,
          content
        );
        contribution.id = dbContribution.id;
      }

      // Store in memory for real-time updates
      const contributionKey = contribution.id || socket.id;
      this.roomContributions.get(roomId)!.set(contributionKey, contribution);

      // Acknowledge to sender
      socket.emit('room:contribution:ack', { ok: true, contribution });

      // Always broadcast contributions for real-time collaboration
      this.broadcastContributions(roomId, type);
      
      this.logger.log(`Contribution submitted: ${type} by ${member.userName} in room ${roomId}`);
    } catch (error) {
      this.logger.error('Error submitting contribution:', error);
      socket.emit('room:error', { message: 'Failed to submit contribution' });
    }
  }

  /** Host decision: Change room stage */
  @SubscribeMessage('room:host:change_stage')
  async handleHostChangeStage(
    @MessageBody() body: { roomId: string; newStage: RoomStage },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, newStage } = body || {};
    if (!roomId || !newStage) {
      socket.emit('room:error', { message: 'Room ID and new stage are required' });
      return;
    }

    const member = this.rooms.get(roomId)?.get(socket.id);
    if (!member || !member.isHost) {
      socket.emit('room:error', { message: 'Only the host can change room stage' });
      return;
    }

    try {
      // Update stage in memory
      this.roomStages.set(roomId, newStage);
      
      // Update in database
      await this.db.updateSessionStatus(roomId, 'active', newStage);

      // Create host decision record
      const decision: HostDecision = {
        type: 'change_stage',
        data: { newStage },
        decidedBy: member.userId,
        timestamp: new Date().toISOString()
      };

      // Broadcast stage change
      this.broadcastRoomStage(roomId);
      this.broadcastHostDecision(roomId, decision);
      
      // Initialize contributions if moving to contributions stage
      if (newStage === 'contributions') {
        if (!this.roomContributions.has(roomId)) {
          this.roomContributions.set(roomId, new Map());
        }
        this.broadcastContributions(roomId);
      }
      
      this.logger.log(`Host ${member.userName} changed room ${roomId} stage to ${newStage}`);
    } catch (error) {
      this.logger.error('Error changing room stage:', error);
      socket.emit('room:error', { message: 'Failed to change room stage' });
    }
  }

  /** Start voting session for contributions (long-term) */
  @SubscribeMessage('room:start_voting')
  async handleStartVoting(
    @MessageBody() body: { 
      roomId: string; 
      type: 'interview_question' | 'pov_statement' | 'hmw_question' | 'scenario_selection';
      maxSelections?: number;
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, type, maxSelections = 1 } = body || {};
    this.logger.log(`🗳️ VOTING START requested: ${JSON.stringify({roomId, type, maxSelections, socketId: socket.id})}`);
    
    if (!roomId || !type) {
      this.logger.error('Missing roomId or type for voting start');
      socket.emit('room:error', { message: 'Room ID and type are required' });
      return;
    }

    try {
      const member = this.rooms.get(roomId)?.get(socket.id);
      if (!member) {
        this.logger.error(`Member not found in room ${roomId} for socket ${socket.id}`);
        socket.emit('room:error', { message: 'You are not a member of this room' });
        return;
      }

      this.logger.log(`Member found: ${member.userName} (${member.userId})`);

      // Initialize voting state in memory ONLY (not DB)
      const votingSessionId = `${roomId}-${type}-${Date.now()}`;
      
      // Store voting state in session state for real-time tracking
      await this.db.setSessionState(roomId, `voting_${type}`, {
        sessionId: votingSessionId,
        type,
        maxSelections,
        startedBy: member.userId,
        startedAt: new Date().toISOString(),
        votes: {},
        status: 'active'
      });

      // Different Voting Options for Persona/Scenario Pairs (instead of contributions)
      let votingOptions;
      if (type === 'scenario_selection') {
        // Predefined scenarios for scenario selection
        votingOptions = [
          { id: '1', content: 'Sofia Nguyen - Single Parent & Part-Time Evening Student' },
          { id: '2', content: 'Roberto Alvarez - Independent Coffee Shop Owner' }, 
          { id: '3', content: 'Fatima Hassan - Community Health Outreach Worker' },
          { id: '4', content: 'Ethan Walker - Junior Remote Software Developer' }
        ];
        this.logger.log(`Using predefined scenarios (${votingOptions.length}): ${JSON.stringify(votingOptions.map(s => ({id: s.id, content: s.content})))}`);
      } else {
        // For other types, use contributions as before
        votingOptions = this.getRoomContributions(roomId, type);
        this.logger.log(`Available contributions (${votingOptions.length}): ${JSON.stringify(votingOptions.map(c => ({id: c.id, content: c.content})))}`);
      }
      
      // Broadcast voting session start to all room members
      const payload = {
        roomId,
        votingSessionId,
        type,
        maxSelections,
        contributions: votingOptions // contributions -> persona/scenario pairs
      };
      
      this.logger.log(`Broadcasting room:voting_started to room ${roomId}: ${JSON.stringify(payload)}`);
      this.server.to(roomId).emit('room:voting_started', payload);
      
      this.logger.log(`Voting started for ${type} in room ${roomId} by ${member.userName}`);
    } catch (error) {
      this.logger.error('Error starting voting:', error);
      socket.emit('room:error', { message: 'Failed to start voting' });
    }
  }

  /** Submit a vote (long-term) */
  @SubscribeMessage('room:vote')
  async handleSubmitVote(
    @MessageBody() body: { 
      votingSessionId?: string;
      contributionId?: string;
      roomId: string;
      type: string;
      optionIds: string[];
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, type, optionIds } = body || {};
    this.logger.log(`🗳️ VOTE received: ${JSON.stringify({roomId, type, optionIds, socketId: socket.id})}`);
    
    if (!roomId || !type || !optionIds?.length) {
      this.logger.error('Missing required fields for vote submission');
      socket.emit('room:error', { message: 'Room ID, type, and option IDs are required' });
      return;
    }

    try {
      const member = this.rooms.get(roomId)?.get(socket.id);
      if (!member) {
        this.logger.error(`Member not found in room ${roomId} for socket ${socket.id}`);
        socket.emit('room:error', { message: 'You are not a member of this room' });
        return;
      }

      this.logger.log(`Member found: ${member.userName} (${member.userId})`);

      // Get current voting state from session state
      const votingStates = await this.db.getSessionState(roomId, `voting_${type}`);
      if (!votingStates.length) {
        socket.emit('room:error', { message: 'No active voting session found' });
        return;
      }

      const votingState = votingStates[0].value;
      
      // Update votes in session state (long-term)
      votingState.votes[member.userId] = optionIds[0]; // Take first option for simple voting
      
      await this.db.setSessionState(roomId, `voting_${type}`, votingState);
      
      // Count current votes
      const voteCount = Object.keys(votingState.votes).length;
      const uniqueMembers = this.getUniqueRoomMembers(roomId);
      
      // Count votes for each option for real-time progress
      const voteCounts: Record<string, number> = {};
      Object.values(votingState.votes).forEach((optionId: any) => {
        voteCounts[optionId] = (voteCounts[optionId] || 0) + 1;
      });
      
      const progressPayload = {
        roomId,
        type,
        totalVotes: voteCount,
        totalMembers: uniqueMembers.length,
        isComplete: voteCount >= uniqueMembers.length,
        votes: voteCounts // Send individual vote counts for real-time display
      };
      
      // Broadcast vote progress
      this.logger.log(`Broadcasting room:vote_progress to room ${roomId}: ${JSON.stringify(progressPayload)}`);
      this.server.to(roomId).emit('room:vote_progress', progressPayload);

      // Check if voting is complete (everyone voted)
      if (voteCount >= uniqueMembers.length) {
        this.logger.log(`Voting complete! Total votes (${voteCount}) >= unique members (${uniqueMembers.length})`);
        await this.handleVotingCompleteEphemeral(roomId, type, votingState);
      }
      
      this.logger.log(`Vote submitted by ${member.userName} in room ${roomId}`);
    } catch (error) {
      this.logger.error('Error submitting vote:', error);
      socket.emit('room:error', { message: 'Failed to submit vote' });
    }
  }

  /** Handle Long-term voting completion */
  private async handleVotingCompleteEphemeral(roomId: string, type: string, votingState: any) {
    try {
      // Count votes for each option
      const voteCounts: Record<string, number> = {};
      Object.values(votingState.votes).forEach((optionId: any) => {
        voteCounts[optionId] = (voteCounts[optionId] || 0) + 1;
      });

      // Find winner(s)
      const maxVotes = Math.max(...Object.values(voteCounts));
      const winnerIds = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

      if (winnerIds.length === 1) {
        // Clear winner
        const winnerId = winnerIds[0];
        
        let winner;
        if (type === 'scenario_selection') {
          // For scenario selection, create winner object from predefined scenarios
          const predefinedScenarios = [
            { id: '1', content: 'Sofia Nguyen - Single Parent & Part-Time Evening Student' },
            { id: '2', content: 'Roberto Alvarez - Independent Coffee Shop Owner' }, 
            { id: '3', content: 'Fatima Hassan - Community Health Outreach Worker' },
            { id: '4', content: 'Ethan Walker - Junior Remote Software Developer' }
          ];
          winner = predefinedScenarios.find(s => s.id === winnerId);
        } else {
          // For other types, look for contributions
          const contributions = this.getRoomContributions(roomId, type);
          console.log(`Looking for winner with ID: ${winnerId}`);
          console.log(`Available contributions:`, contributions.map(c => ({ id: c.id, socketId: c.socketId, content: c.content })));
          winner = contributions.find(c => c.id === winnerId || c.socketId === winnerId);
          console.log(`Found winner:`, winner);
        }

        if (winner) {
          // Store final selection directly in session
          if (type === 'scenario_selection') {
            await this.db.setFinalSelections(roomId, { 
              scenario: { id: winner.id, content: winner.content }
            });
          } else {
            const content = winner.content?.question || winner.content?.statement || winner.content;
            
            if (type === 'interview_question') {
              await this.db.setFinalSelections(roomId, { questionContent: content });
            } else if (type === 'pov_statement') {
              await this.db.setFinalSelections(roomId, { povContent: content });
            } else if (type === 'hmw_question') {
              await this.db.setFinalSelections(roomId, { hmwContents: [content] });
            }
          }
        }

        // Broadcast completion
        this.server.to(roomId).emit('room:voting_complete', {
          type,
          winner: winner || { id: winnerId, content: winnerId },
          results: Object.entries(voteCounts).map(([id, count]) => ({ option_id: id, vote_count: count }))
        });

        this.logger.log(`Voting complete in room ${roomId}. Winner: ${winnerId} with ${maxVotes} votes`);
      } else {
        // For Ties, pick first winner
        const winnerId = winnerIds[0];
        this.server.to(roomId).emit('room:voting_complete', {
          type,
          winner: { id: winnerId, content: winnerId },
          results: Object.entries(voteCounts).map(([id, count]) => ({ option_id: id, vote_count: count })),
          isTie: true
        });

        this.logger.log(`Tie resolved in room ${roomId}. Selected: ${winnerId} (tied with ${winnerIds.length} options)`);
      }

      // Clean up voting state
      await this.db.setSessionState(roomId, `voting_${type}`, { ...votingState, status: 'completed' });
      
    } catch (error) {
      this.logger.error('Error handling ephemeral voting completion:', error);
      this.server.to(roomId).emit('room:error', { message: 'Error processing voting results' });
    }
  }



  /** Set needs and insights (POV/HMW workflow) */
  @SubscribeMessage('room:host:set_needs_insights')
  async handleHostSetNeedsInsights(
    @MessageBody() body: { roomId: string; needs: string[]; insights: string[] },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, needs, insights } = body || {};
    if (!roomId || !needs || !insights) {
      socket.emit('room:error', { message: 'Room ID, needs, and insights are required' });
      return;
    }

    const member = this.rooms.get(roomId)?.get(socket.id);
    if (!member || !member.isHost) {
      socket.emit('room:error', { message: 'Only the host can set needs and insights' });
      return;
    }

    try {
      // Update in database
      await this.db.setSessionState(roomId, 'needs_insights', { needs, insights });
      await this.db.savePovHmwSessionData(roomId, needs, insights);

      // Create host decision record
      const decision: HostDecision = {
        type: 'set_needs_insights',
        data: { needs, insights },
        decidedBy: member.userId,
        timestamp: new Date().toISOString()
      };

      // Broadcast decision
      this.broadcastHostDecision(roomId, decision);
      
      this.logger.log(`Host ${member.userName} set needs/insights in room ${roomId}`);
    } catch (error) {
      this.logger.error('Error setting needs/insights:', error);
      socket.emit('room:error', { message: 'Failed to set needs and insights' });
    }
  }

  /** Reset room state */
  @SubscribeMessage('room:reset')
  async handleRoomReset(
    @MessageBody() body: { roomId: string; clearContributions?: boolean },
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, clearContributions } = body || {};
    if (!roomId) return;

    const member = this.rooms.get(roomId)?.get(socket.id);
    if (!member || !member.isHost) {
      socket.emit('room:error', { message: 'Only the host can reset the room' });
      return;
    }

    try {
      // Reset stage
      this.roomStages.set(roomId, 'setup');
      
      // Clear contributions if requested
      if (clearContributions) {
        this.roomContributions.delete(roomId);
      }
      
      // Clear host decisions
      this.hostDecisions.delete(roomId);

      // Update database
      await this.db.updateSessionStatus(roomId, 'active', 'setup');

      // Broadcast updates
      this.broadcastRoomStage(roomId);
      this.broadcastRoomMembers(roomId);
      this.broadcastContributions(roomId);
      
      this.logger.log(`Host ${member.userName} reset room ${roomId}`);
    } catch (error) {
      this.logger.error('Error resetting room:', error);
      socket.emit('room:error', { message: 'Failed to reset room' });
    }
  }

  // ============================================================================
  // LEGACY SUPPORT (for backward compatibility)
  // ============================================================================
  
  @SubscribeMessage('session:join')
  async handleLegacyJoin(
    @MessageBody() body: { sessionId: string; userId: string; userName: string },
    @ConnectedSocket() socket: Socket,
  ) {
    // Redirect to new room-based system
    await this.handleJoinRoom(
      { roomId: body.sessionId, userId: body.userId, userName: body.userName },
      socket
    );
  }
  
  @SubscribeMessage('interview:question:update')
  handleLegacyQuestionUpdate(
    @MessageBody() body: { sessionId: string; text: string },
    @ConnectedSocket() socket: Socket,
  ) {
    // Redirect to new contribution system
    this.handleContributionSubmit(
      {
        roomId: body.sessionId,
        type: 'interview_question',
        content: { question: body.text },
        saveToDb: false
      },
      socket
    );
  }
  
  @SubscribeMessage('interview:publish')
  handleLegacyPublish(
    @MessageBody() body: { sessionId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    // Redirect to new stage change system
    this.handleHostChangeStage(
      { roomId: body.sessionId, newStage: 'contributions' },
      socket
    );
  }
}