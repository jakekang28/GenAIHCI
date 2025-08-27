import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { ChatOpenAI, OpenAI } from '@langchain/openai'; 
import { join } from 'path';
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { Qna } from 'src/interfaces/Qna.interface';
import { DynamicPromptData } from 'src/interfaces/DynamicPrompt.interface';
import { DbService } from 'src/db/db.service';
import {GroupQuestionService} from 'src/session/gateway.service'

type UUID = string;
export type Persona = 'A' | 'B' | 'C' | 'D';

// Interface for user-specific agent data
interface UserAgent {
  llm: ChatOpenAI;
  memory: BufferMemory;
  chain: ConversationChain;
  lastActivity: Date;
  persona?: Persona;
}

export class PreEvalDto {
  guestUserId: string;
  guestName: string;
  persona: Persona;
  question: string;
  scenarioTag?: string;
  sessionId?: string;
}

export class InterviewDto {
  sessionId: string;
  guestUserId: string; // 클라이언트에서 보내면 무시해도 됨(세션으로 식별 가능)
  guestName: string;   // 필요 시 로깅 용/무시 OK
  persona: Persona;
  question: string;
  isInit: boolean;
}

export class PostEvalDto {
  sessionId: string;
}

@Injectable()
export class LangchainService implements OnModuleInit {
  // Map to store user-specific agents
  private userAgents = new Map<string, UserAgent>();
  
  // Shared LLM instance for non-conversational operations
  private sharedLlm: ChatOpenAI;
  
  // Evaluator LLM for pre/post interview evaluations
  private evaluatorLlm: ChatOpenAI;
  
  // Cleanup interval for inactive agents
  private readonly AGENT_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly AGENT_INACTIVITY_THRESHOLD = 60 * 60 * 1000; // 1 hour

  constructor(private readonly db : DbService,
    private readonly session : GroupQuestionService
  ) {}

  onModuleInit() {
    // Main LLM for interviewee responses (persona) - temperature 0.3 for consistent character
    this.sharedLlm = new ChatOpenAI({ 
      openAIApiKey: process.env.OPENAI_API_KEY, 
      modelName: 'gpt-4o', 
      temperature: 0.3,
      maxTokens: 150 //limit response length
    });
    
    // Evaluator LLM for pre/post interview evaluations - temperature 0 for consistent scoring
    this.evaluatorLlm = new ChatOpenAI({ 
      openAIApiKey: process.env.OPENAI_API_KEY, 
      modelName: 'gpt-4o', 
      temperature: 0
    });
    
    // Start cleanup interval
    setInterval(() => this.cleanupInactiveAgents(), this.AGENT_CLEANUP_INTERVAL);
  }

  /**
   * Get or create a user-specific agent
   */
  private getUserAgent(userId: string, persona?: Persona): UserAgent {
    if (!this.userAgents.has(userId)) {
      const memory = new BufferMemory({ returnMessages: true });
      const chain = new ConversationChain({
        llm: this.sharedLlm,
        memory: memory,
        verbose: true,
      });
      
      this.userAgents.set(userId, {
        llm: this.sharedLlm,
        memory,
        chain,
        lastActivity: new Date(),
        persona
      });
      
      console.log(`Created new agent for user: ${userId} with persona: ${persona}`);
      console.log(`Total active agents: ${this.userAgents.size}`);
    } else {
      // Update last activity and persona if provided
      const agent = this.userAgents.get(userId)!;
      agent.lastActivity = new Date();
      if (persona) {
        agent.persona = persona;
      }
      console.log(`Reused existing agent for user: ${userId} with persona: ${persona}`);
    }
    
    return this.userAgents.get(userId)!;
  }

  /**
   * Clean up inactive agents to prevent memory leaks
   */
  private cleanupInactiveAgents() {
    const now = new Date();
    const inactiveUsers: string[] = [];
    
    for (const [userId, agent] of this.userAgents.entries()) {
      if (now.getTime() - agent.lastActivity.getTime() > this.AGENT_INACTIVITY_THRESHOLD) {
        inactiveUsers.push(userId);
      }
    }
    
    for (const userId of inactiveUsers) {
      const agent = this.userAgents.get(userId)!;
      agent.memory.clear();
      this.userAgents.delete(userId);
      console.log(`Cleaned up inactive agent for user: ${userId}`);
    }
  }

  /**
   * Reset memory for a specific user
   */
  private resetUserMemory(userId: string) {
    const agent = this.userAgents.get(userId);
    if (agent) {
      agent.memory.clear();
      console.log(`Reset memory for user: ${userId}`);
    }
  }

  /**
   * Get current agent status for debugging
   */
  getAgentStatus() {
    const status: Array<{
      userId: string;
      persona?: Persona;
      lastActivity: Date;
      memorySize: number;
      hasChain: boolean;
    }> = [];
    
    for (const [userId, agent] of this.userAgents.entries()) {
      status.push({
        userId,
        persona: agent.persona,
        lastActivity: agent.lastActivity,
        memorySize: 0, // We'll get this from the memory directly
        hasChain: !!agent.chain
      });
    }
    return status;
  }

  /**
   * Get memory for a specific user (for debugging)
   */
  getUserMemory(userId: string) {
    const agent = this.userAgents.get(userId);
    if (agent) {
      return {
        userId,
        persona: agent.persona,
        memorySize: 'Available in console logs',
        chatHistory: 'Available in console logs',
        hasPersonaContext: agent.persona !== undefined
      };
    }
    return null;
  }

  /**
   * Check if a user's agent has persona context set up
   */
  hasPersonaContext(userId: string): boolean {
    const agent = this.userAgents.get(userId);
    if (agent) {
      // For now, just check if the agent exists and has a persona set
      return !!agent.persona;
    }
    return false;
  }

  /**
   * Extract conversation history from user's agent memory
   */
  private async getConversationHistory(userId: string): Promise<string> {
    const agent = this.userAgents.get(userId);
    if (!agent) {
      console.log(`Debug: No agent found for user ${userId}`);
      return '';
    }

    try {
      // Get the messages from the conversation chain's memory
      const messages = await agent.memory.chatHistory.getMessages();
      
      console.log(`Debug: Found ${messages.length} messages for user ${userId}`);
      
      if (messages.length === 0) {
        console.log(`Debug: No messages in memory for user ${userId}`);
        return '';
      }
      
      let conversationHistory = '';
      let questionCount = 0;
      
      // Process all messages and build conversation history
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const messageType = message.constructor.name;
        const content = String(message.content || '');
        
        console.log(`Debug: Message ${i}: Type=${messageType}, Length=${content.length}`);
        
        if (messageType === 'HumanMessage') {
          // Extract the actual question from the human message
          let cleanQuestion = content;
          
          // Try to extract just the question part after the markers
          if (content.includes('###StudentQuestion###')) {
            const parts = content.split('###StudentQuestion###');
            cleanQuestion = parts[parts.length - 1]?.trim() || content;
          } else if (content.includes('###Follow-upQuestion###')) {
            const parts = content.split('###Follow-upQuestion###');
            cleanQuestion = parts[parts.length - 1]?.trim() || content;
          }
          
          // If still too long, take only the last part (actual question)
          if (cleanQuestion.length > 500) {
            const lines = cleanQuestion.split('\n');
            cleanQuestion = lines[lines.length - 1] || cleanQuestion.substring(cleanQuestion.length - 200);
          }
          
          questionCount++;
          conversationHistory += `\nPrevious Question ${questionCount}: ${cleanQuestion.trim()}`;
          
        } else if (messageType === 'AIMessage' && i > 0) {
          // This is an AI response
          conversationHistory += `\nPrevious Answer ${questionCount}: ${content.trim()}\n`;
        }
      }
      
      console.log(`Debug: Processed ${questionCount} questions for user ${userId}`);
      console.log(`Debug: Final conversation history length: ${conversationHistory.length} characters`);
      
      if (conversationHistory.length > 0) {
        console.log(`Debug: Conversation history preview: ${conversationHistory.substring(0, 200)}...`);
      }
      
      return conversationHistory.trim();
    } catch (error) {
      console.log(`Error getting conversation history for user ${userId}:`, error.message);
      console.log(`Error stack:`, error.stack);
      return '';
    }
  }

  /**
   * Test method to get conversation history (for debugging)
   */
  async testGetConversationHistory(userId: string): Promise<string> {
    return this.getConversationHistory(userId);
  }

  private loadPrompt(filename : string) : string {
    const path = join(process.cwd(),'src', 'llm', 'prompt', filename)
    return readFileSync(path, 'utf-8')
    }
  async runPrompt(filename : string, userInput : string){
    const prompt =  this.loadPrompt(filename)
    const finalPrompt = `${userInput}\n\n${prompt}`
    return await this.evaluatorLlm.invoke(finalPrompt)
  }
  async runIteratedPrompt(filename : string, userInput : string){
    const prompt =  this.loadPrompt(filename)
    
    // Fix: Replace the placeholder in the prompt with the actual question
    const finalPrompt = prompt.replace('User Question Input : ', `User Question Input : ${userInput}`)
    
    console.log('Final prompt being sent to AI:', finalPrompt); // Debug log
    
    // Use direct LLM call instead of conversation chain for single evaluations
    return await this.evaluatorLlm.invoke(finalPrompt)
  }
  resetMemory() {
    // This method is no longer needed as memory is per-user
  }
  private getPersonaPrompt(persona: 'A'|'B'|'C'|'D'): string {
    const mapping: Record<typeof persona, string> = {
      A: 'personaA.txt',
      B: 'personaB.txt',
      C: 'personaC.txt',
      D: 'personaD.txt',
    };
    const file = mapping[persona] || 'personaDefault.txt';
    return this.loadPrompt(file);
  }
  async getPersona(persona: 'A'|'B'|'C'|'D') {
    const mapping: Record<typeof persona, string> = {
      A: 'personaA.txt',
      B: 'personaB.txt',
      C: 'personaC.txt',
      D: 'personaD.txt',
    };
    const file = mapping[persona] || 'personaDefault.txt';
    const prompt = this.loadPrompt(file)
    
    // Fix: Use direct LLM call instead of conversation chain to avoid memory interference
    const result = await this.sharedLlm.invoke(prompt)
    return result.content || result.toString()
  }
  private getPersonaPromptText(persona: 'A'|'B'|'C'|'D'): string {
    const mapping: Record<typeof persona, string> = {
      A: 'personaA.txt',
      B: 'personaB.txt',
      C: 'personaC.txt',
      D: 'personaD.txt',
    };
    const file = mapping[persona] || 'personaDefault.txt';
    return this.loadPrompt(file);
  }
  async preInterviewEval(dto : PreEvalDto){
    console.log('PreEval DTO received:', dto);
    console.log('guestUserId:', dto.guestUserId);
    console.log('question:', dto.question);
    console.log('persona:', dto.persona);
    
    const sessionId =
      dto.sessionId ??
      (await this.db.ensureGuestSession(
        dto.guestUserId,
        dto.guestName,
        dto.persona,
        dto.scenarioTag,
      ));
    
    await this.db.insertInitialQna(sessionId, dto.guestUserId, dto.question);
    
    // Fix: Combine persona prompt with evaluator prompt
    const personaPrompt = this.getPersonaPromptText(dto.persona);
    const evaluatorPrompt = this.loadPrompt('preEval.txt');
    
    // Combine the prompts: persona info first, then evaluator instructions
    const combinedPrompt = `${personaPrompt}\n\n${evaluatorPrompt}`;
    
    // Add debugging for the AI call
    console.log('Calling AI with question:', dto.question);
    console.log('Persona being used:', dto.persona);
    
    // Use direct LLM call with combined prompt
    const result = await this.evaluatorLlm.invoke(combinedPrompt.replace('User Question Input : ', `User Question Input : ${dto.question}`));
    
    console.log('Raw AI response:', result);
    
    // Fix: Handle the response properly - llm.invoke returns BaseMessage
    const aiResponse = result.content || result.toString();
    console.log('AI response to parse:', aiResponse);
    
    let parsed : Record<string, string>
    try {
      parsed = this.parseLLM(aiResponse);
      console.log('Parsed result:', parsed);
    } catch (e) {
      console.error("couldn't parse LLM JSON:", aiResponse);
      throw e;
    }
    
    // Store AI evaluation in database
    try {
      await this.db.saveAiEvaluation(
        sessionId,
        'pre_question_eval',
        { question: dto.question, persona: dto.persona },
        result,
        { persona: dto.persona, scenarioTag: dto.scenarioTag }, // input metadata
        parsed, // processed scores
        'AI Pre-Interview Question Evaluation', // feedback summary
        dto.guestUserId
      );
      console.log(`Pre-interview AI evaluation saved successfully for session: ${sessionId}`);
    } catch (error) {
      console.error('Failed to save pre-interview AI evaluation:', error);
      // Don't throw error - continue with the response
    }
    
    console.log("----Chat History---")
    // console.log(this.memory.chatHistory) // This line is no longer needed
    return {sessionId, eval : parsed}         
  }
  // async interview(
  //   initQ : string,
  //   followUps : string[],
  //   persona : 'A'|'B'|'C'|'D'
  // ) : Promise<Array<{question : string; answer : string}>>{
  //   const transcript : Array<{question : string; answer : string}> = [];
  //   const prompt = this.getPersona(persona)
  //   const combinedPrompt = `${prompt}\n\n###StudentQuestion###\n${initQ}`
  //   let initResponse = await this.chain.call({input : combinedPrompt})

  //   transcript.push({question : initQ, answer : initResponse.response})

  //   for(const q of followUps){
  //     const response = await this.chain.call({input : q})
  //     transcript.push({question : q, answer : response.response})
  //   }
  //   return transcript
  // }
  async interview(
    isInit : boolean,
    question : string,
    persona : 'A' | 'B' | 'C' | 'D',
    userId?: string
  ) : Promise<Array<{question : string; answer : string}>>{
    const transcript : Array<{question : string; answer : string}> = [];
    
    // Use provided userId or generate a fallback
    const effectiveUserId = userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if(isInit) {
      // For initial questions, create a new agent and reset memory
      const userAgent = this.getUserAgent(effectiveUserId, persona);
      this.resetUserMemory(effectiveUserId);
      
      // For initial questions, combine persona context with the question
      const personaPrompt = this.getPersonaPromptText(persona);
      const combinedPrompt = `${personaPrompt}\n\n###StudentQuestion###\n${question}`;
      
      console.log(`Setting up persona context for user ${effectiveUserId} with persona ${persona}`);
      console.log(`Combined prompt length: ${combinedPrompt.length} characters`);
      
      // Send the combined prompt to establish both persona context and get the answer
      let initResponse = await userAgent.chain.call({input: combinedPrompt});
      transcript.push({question: question, answer: initResponse.response});
      console.log(`Initial question response length: ${initResponse.response.length} characters`);
      console.log(transcript);
      return transcript;
    }
    else {
      // For follow-up questions, we need to find an existing agent with the same persona
      // This handles the case where the frontend sends different user IDs for follow-ups
      
      console.log(`Follow-up question for user ${effectiveUserId} with persona ${persona}`);
      console.log(`Question: ${question}`);
      
      // Try to find an existing agent with the same persona that has conversation history
      let userAgent = this.userAgents.get(effectiveUserId);
      let foundExistingAgent = false;
      
      if (!userAgent || (await userAgent.memory.chatHistory.getMessages()).length === 0) {
        // Look for any existing agent with the same persona and conversation history
        for (const [existingUserId, existingAgent] of this.userAgents.entries()) {
          if (existingAgent.persona === persona) {
            const messages = await existingAgent.memory.chatHistory.getMessages();
            if (messages.length > 0) {
              console.log(`Found existing agent ${existingUserId} with persona ${persona} and ${messages.length} messages`);
              userAgent = existingAgent;
              foundExistingAgent = true;
              break;
            }
          }
        }
      }
      
      // If still no agent found, create a new one
      if (!userAgent) {
        console.log(`Creating new agent for follow-up question with persona ${persona}`);
        userAgent = this.getUserAgent(effectiveUserId, persona);
      }
      
      // Check current memory state before the call
      const messagesBefore = await userAgent.memory.chatHistory.getMessages();
      console.log(`Debug: Memory before follow-up: ${messagesBefore.length} messages`);
      
      if (foundExistingAgent) {
        console.log(`Debug: Reusing existing agent with conversation history`);
      }
      
      // For follow-up questions, just send the question - the chain will handle context
      // But we need to include the persona context since it's not in the chain's memory
      const personaPrompt = this.getPersonaPromptText(persona);
      const followUpPrompt = `${personaPrompt}\n\n###Follow-upQuestion###\n${question}`;
      
      console.log(`Follow-up prompt length: ${followUpPrompt.length} characters`);
      
      let followUpResponse = await userAgent.chain.call({input: followUpPrompt});
      transcript.push({question: question, answer: followUpResponse.response});
      console.log(`Follow-up response length: ${followUpResponse.response.length} characters`);
      
      // Check memory state after the call
      const messagesAfter = await userAgent.memory.chatHistory.getMessages();
      console.log(`Debug: Memory after follow-up: ${messagesAfter.length} messages`);
      console.log("----Chat History---");
      console.log(userAgent.memory.chatHistory);
      return transcript;
    }
  }
  private createInterviewPrompt(qnas : Qna[], filename : string) : string{
    let prompt = this.loadPrompt(filename)
    qnas.forEach((qna, idx) =>{
      const num = idx + 1
      if(qna.prevId != -1){
        prompt += `\nFollow-up Question : ${qna.qcontent}`
        prompt += `\nAnswer : ${qna.acontent}`
      }
      else{
        prompt += `\nQuestion : ${qna.qcontent}`
        prompt += `\nAnswer : ${qna.acontent}`
      }
    })
    return prompt
  }
  async postEval(qnas : Qna[], sessionId?: string, userId?: string, persona?: string){
    const evalPrompt = this.createInterviewPrompt(qnas, 'postEval.txt')
    
    // Fix: Use the postEval.txt prompt directly instead of blank.txt
    const result = await this.evaluatorLlm.invoke(evalPrompt);
    
    // Fix: Handle the response properly - llm.invoke returns BaseMessage
    const aiResponse = result.content || result.toString();
    console.log('PostEval AI response:', aiResponse); // Debug log
    
    let parsed;
    try {
      parsed = this.parseLLM(aiResponse);
      console.log('PostEval parsed result:', parsed); // Debug log
    } catch (e) {
      console.error('PostEval parsing failed:', e);
      // Return a default structure if parsing fails
      parsed = [
        {"standard": "Active Asking", "score": 1, "response": "Evaluation failed to parse"},
        {"standard": "Usage of Neutral Questions", "score": 1, "response": "Evaluation failed to parse"},
        {"standard": "Vagueness", "score": 1, "response": "Evaluation failed to parse"},
        {"standard": "Appropriate Usage of Follow-up questions", "score": 1, "response": "Evaluation failed to parse"},
        {"standard": "Question Relevance", "score": 1, "response": "Evaluation failed to parse"}
      ];
    }
    
    // Ensure we always return an array
    if (!Array.isArray(parsed)) {
      console.warn('PostEval result is not an array, converting to array');
      parsed = [parsed];
    }
    
    // Store AI evaluation in database if sessionId is provided
    if (sessionId) {
      try {
        await this.db.saveAiEvaluation(
          sessionId,
          'post_interview_eval',
          { qnas: qnas.map(q => ({ question: q.qcontent, answer: q.acontent })) },
          result,
          { totalQuestions: qnas.length, persona: persona }, // input metadata
          parsed, // processed scores
          'AI Post-Interview Evaluation', // feedback summary
          userId // user ID if available
        );
        console.log(`Post-interview AI evaluation saved successfully for session: ${sessionId}`);
      } catch (error) {
        console.error('Failed to save post-interview AI evaluation:', error);
        // Don't throw error - continue with the response
      }
    } else {
      console.log('No sessionId provided, skipping database storage for post-interview evaluation');
    }
    
    return parsed;
  }
  async runDynamicPrompt(filename: string, dynamicData: DynamicPromptData) {
    const promptTemplate = this.loadPrompt(filename);
    const finalPrompt = this.replacePlaceholders(promptTemplate, dynamicData);
    return await this.evaluatorLlm.invoke(finalPrompt);
  }
  private replacePlaceholders(template: string, data: DynamicPromptData): string {
    let result = template
      .replace(/{{NEEDS}}/g, data.needs)
      .replace(/{{INSIGHTS}}/g, data.insights)
      .replace(/{{USER_POV}}/g, data.userPOV);
    
    if (data.hmwQuestions) {
      result = result.replace(/{{HMW_QUESTIONS}}/g, data.hmwQuestions);
    }
    
    return result;
  }
  private parseLLM = (response) =>{
     try {
     let s = response.replace(/```json/g, '').replace(/```/g, '').trim();
     s = s.replace(/([\w]+)\s*:/g, '"$1":');
     const parsed = JSON.parse(s)
     return parsed;
   } catch (err) {
     console.warn('JSON parse failed:', err);
     const parsed = { raw: response };
     return parsed;
   }
 }
}