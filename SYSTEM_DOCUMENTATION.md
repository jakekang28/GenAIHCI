# GenAIForHCI System Documentation

## Table of Contents
1. [Database Architecture](#database-architecture)
2. [WebSocket System](#websocket-system)
3. [Helper Methods & Utilities](#helper-methods--utilities)
4. [Voting System](#voting-system)
5. [Information Sharing](#information-sharing)
6. [System Architecture Overview](#system-architecture-overview)

---

## Database Architecture

### Core Tables

#### 1. Guest Users (`guest_users`)
- **Purpose**: Stores anonymous user information without authentication
- **Key Fields**:
  - `id`: UUID primary key
  - `display_name`: User's display name
  - `created_at`, `updated_at`: Timestamps

#### 2. Sessions (`sessions`)
- **Purpose**: Main collaborative sessions/rooms
- **Key Fields**:
  - `id`: UUID primary key
  - `code`: Human-readable session code (e.g., "ABC123")
  - `type`: Session type (`interview` or `pov_hmw`)
  - `status`: Session status (`active`, `completed`, `archived`)
  - `current_stage`: Current workflow stage
  - `host_user_id`: Reference to session host
  - **Final Selections**:
    - `selected_scenario`: Chosen scenario data
    - `selected_question_content`: Final interview question
    - `selected_pov_content`: Final POV statement
    - `selected_hmw_contents`: Array of final HMW questions

#### 3. Session Participants (`session_participants`)
- **Purpose**: Tracks who's in each session
- **Key Fields**:
  - `session_id`, `user_id`: Composite primary key
  - `display_name`: Participant's name in this session
  - `is_host`: Whether participant is the host
  - `is_active`: Whether participant is currently active

#### 4. Session State (`session_state`)
- **Purpose**: Stores ephemeral collaboration state (voting, temporary data)
- **Key Fields**:
  - `session_id`: Reference to session
  - `key`: State identifier (e.g., "voting_interview_question")
  - `value`: JSONB data for the state

#### 5. User Contributions (`user_contributions`)
- **Purpose**: Stores individual student inputs
- **Key Fields**:
  - `type`: Contribution type (`interview_question`, `pov_statement`, `hmw_question`, `needs_insights`)
  - `content`: JSONB content data
  - `order_index`: For ordering multiple items from same user

#### 6. AI Evaluations (`ai_evaluations`)
- **Purpose**: Stores AI feedback and scoring for learning assessment
- **Key Fields**:
  - `evaluation_type`: Type of evaluation
  - `input_data`: Original input that was evaluated
  - `ai_response`: Raw AI response
  - `processed_scores`: Parsed scores/rubrics
  - `feedback_summary`: Human-readable summary

### Database Features

#### Row Level Security (RLS)
- All tables have RLS enabled
- Currently uses permissive policies for development
- Can be tightened for production use

#### Automatic Timestamps
- Uses PostgreSQL triggers to auto-update `updated_at` fields
- Ensures data consistency

#### Indexes
- Optimized for common query patterns
- Session lookups, user contributions, and evaluations

---

## WebSocket System

### Architecture Overview

The WebSocket system is built using NestJS with Socket.IO, providing real-time collaboration capabilities.

#### Gateway Structure (`SessionGateway`)
- **CORS**: Configured for localhost development
- **Event Handling**: Handles room-based collaboration events
- **Memory Management**: In-memory state for real-time features

### Core WebSocket Events

#### Room Management
```typescript
// Join a room
'socket.emit('room:join', { roomId, userId, userName })'

// Leave a room
'socket.emit('room:leave', { roomId })'

// Room state updates
'socket.on('room:members', { members })'
'socket.on('room:stage', { stage })'
'socket.on('room:contributions', { contributions, type })'
```

#### Contribution System
```typescript
// Submit contribution
'socket.emit('room:contribution:submit', { 
  roomId, 
  type: 'interview_question' | 'pov_statement' | 'hmw_question',
  content: any,
  saveToDb?: boolean 
})'

// Contribution acknowledgment
'socket.on('room:contribution:ack', { ok: true, contribution })'
```

#### Host Controls
```typescript
// Change room stage
'socket.emit('room:host:change_stage', { roomId, newStage })'

// Set needs/insights
'socket.emit('room:host:set_needs_insights', { roomId, needs, insights })'

// Reset room
'socket.emit('room:reset', { roomId, clearContributions?: boolean })'
```

### Room State Management

#### In-Memory State
- **Rooms Map**: Tracks active rooms and members
- **Room Stages**: Current workflow stage for each room
- **Contributions**: Real-time contribution tracking
- **Host Decisions**: Record of host actions

#### State Synchronization
- Real-time updates across all connected clients
- Automatic cleanup when rooms become empty
- Persistent state in database for long-term storage

---

## Helper Methods & Utilities

### Database Service Methods

#### Session Management
```typescript
// Create new session
await db.createSession(sessionData)

// Get session with participants
await db.getSession(sessionId)

// Update session status
await db.updateSessionStatus(sessionId, status, stage)
```

#### Contribution Handling
```typescript
// Submit user contribution
await db.submitContribution(sessionId, userId, userName, type, content)

// Get contributions by type
await db.getContributions(sessionId, type)
```

#### State Management
```typescript
// Set session state
await db.setSessionState(sessionId, key, value)

// Get session state
await db.getSessionState(sessionId, key)
```

### Frontend Utility Functions

#### AI Response Parsing
```javascript
// Extract content from LangChain responses
extractAIContent(aiResponse)

// Parse POV AI feedback
parsePovAIFeedback(rawFeedback)

// Parse HMW AI feedback
parseHmwAIFeedback(rawFeedback)
```

#### Content Generation
```javascript
// Generate groupmate questions
generateGroupmateQuestions(prePlannedQuestion, selectedScenario)

// Format content for display
formatContent(content, type)
```

---

## Voting System

### Overview

The voting system supports both real-time collaboration and long-term decision making, with different voting types for various content categories.

### Voting Types

#### 1. Scenario Selection
- **Purpose**: Choose interview scenarios from predefined options
- **Options**: 4 predefined persona-scenario pairs
- **Voting**: Single selection voting

#### 2. Contribution Voting
- **Purpose**: Vote on user-generated content
- **Types**: Interview questions, POV statements, HMW questions
- **Voting**: Single or multiple selection based on `maxSelections`

### Voting Workflow

#### 1. Start Voting
```typescript
// Host initiates voting
socket.emit('room:start_voting', {
  roomId,
  type: 'scenario_selection' | 'interview_question' | 'pov_statement' | 'hmw_question',
  maxSelections: number
})
```

#### 2. Vote Submission
```typescript
// Users submit votes
socket.emit('room:vote', {
  roomId,
  type,
  optionIds: string[]
})
```

#### 3. Real-time Progress
```typescript
// Vote progress updates
socket.on('room:vote_progress', {
  type,
  totalVotes,
  totalMembers,
  isComplete,
  votes: Record<string, number>
})
```

#### 4. Results
```typescript
// Voting completion
socket.on('room:voting_complete', {
  type,
  winner,
  results: Array<{option_id: string, vote_count: number}>
})
```

### Voting Component Features

#### Frontend Component (`VotingComponent`)
- **State Management**: Waiting, voting, results, tie handling
- **Real-time Updates**: Live vote progress display
- **Flexible Options**: Supports both predefined and dynamic options
- **Multiple Selection**: Configurable for single or multiple selections

#### Backend Processing
- **Vote Counting**: Real-time aggregation of votes
- **Tie Resolution**: Automatic handling of tied votes
- **Result Persistence**: Stores final selections in database

---

## Information Sharing

### Real-time Collaboration

#### 1. Contribution Broadcasting
- **Automatic Updates**: All contributions immediately visible to room members
- **Type Filtering**: Contributions filtered by type for relevant displays
- **User Attribution**: Each contribution shows creator information

#### 2. Session State Synchronization
- **Stage Changes**: All members notified of workflow progression
- **Host Decisions**: Transparent communication of host actions
- **Loading States**: Visual feedback during processing

### Data Persistence

#### 1. Long-term Storage
- **User Contributions**: Saved to database for analysis
- **AI Evaluations**: Stored for learning assessment
- **Final Selections**: Team decisions preserved for continuity

#### 2. Session Continuity
- **State Recovery**: Sessions can resume from previous state
- **Data Consistency**: Database ensures data integrity
- **Audit Trail**: Complete history of session activities

### Communication Patterns

#### 1. Event-Driven Updates
- **Real-time Events**: Immediate notification of changes
- **Batch Updates**: Efficient handling of multiple changes
- **Error Handling**: Graceful degradation on connection issues

#### 2. Host-User Coordination
- **Host Controls**: Centralized workflow management
- **User Feedback**: Immediate acknowledgment of actions
- **Decision Transparency**: All members see host decisions

---

## System Architecture Overview

### Backend (NestJS)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Database      │    │   LLM Service   │
│   Gateway       │◄──►│   Service       │◄──►│   (AI)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Session       │    │   Supabase      │    │   Prompt        │
│   Management    │    │   Database      │    │   Templates     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend (React)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Session       │    │   WebSocket     │    │   Components    │
│   Provider      │◄──►│   Context       │◄──►│   (UI)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State         │    │   Real-time     │    │   Voting &      │
│   Management    │    │   Updates       │    │   Collaboration │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **User Input** → Frontend Component
2. **WebSocket Event** → Backend Gateway
3. **Database Update** → Persistent Storage
4. **Real-time Broadcast** → All Connected Clients
5. **UI Update** → Immediate Visual Feedback

### Key Benefits
- **Real-time Collaboration**: Instant updates across all participants
- **Data Persistence**: Long-term storage for analysis and continuity
- **Scalable Architecture**: Modular design for easy extension
- **Error Resilience**: Graceful handling of connection issues
- **Learning Analytics**: Comprehensive tracking of user interactions

---

## Development Notes

### Environment Setup
- **Backend**: NestJS with TypeScript
- **Frontend**: React with JavaScript
- **Database**: Supabase (PostgreSQL)
- **WebSockets**: Socket.IO

### Testing
- **Backend**: Jest with e2e testing
- **Frontend**: Component-based testing
- **Database**: Migration-based schema management

### Deployment
- **Development**: Local development with hot reload
- **Production**: Ready for containerized deployment
- **Database**: Supabase cloud hosting

This documentation provides a comprehensive overview of the GenAIForHCI system architecture, covering all major components and their interactions. For specific implementation details, refer to the individual source files and their inline documentation.
