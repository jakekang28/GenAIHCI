import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LangchainService, PreEvalDto, InterviewDto, PostEvalDto } from './llm.service';
import { PersonaDto } from '../dtos/persona.dto';
import { Qna } from 'src/interfaces/Qna.interface';
import { EvaluationRequest } from 'src/interfaces/Evaluation.interface';
import { DynamicPromptData } from 'src/interfaces/DynamicPrompt.interface';



@Controller('llm')
export class LlmController {
  constructor(private readonly lc: LangchainService) {}
  @Get('get-persona')
  async getPersona(@Query() query : {tag : PersonaDto['persona']}){ 
    const response = await this.lc.getPersona(query.tag)
    return {result : response}
  }
  @Post('eval-POV')
  async evalPOV(@Body('text') text : string){
    const response = await this.lc.runPrompt('pov.txt', text)
    return {result : response}
  } 
  @Post('eval-HMW')
  async evalHMW(@Body('text') text: string) {
    const response = await this.lc.runPrompt('hmw.txt', text);
    return { result: response };
  }
  @Post('interview')
  async interview(@Query() query : {tag : PersonaDto['persona']}, @Body() body : {isInit : boolean, question : string, userId?: string}){
    const session = await this.lc.interview(body.isInit, body.question, query.tag, body.userId)
    return {transcript : session}
  }
  @Post('preeval-interview')
  async preEvalInterview(@Query() query : {tag : PersonaDto['persona']}, @Body() dto : PreEvalDto){
    const evaluation = await this.lc.preInterviewEval(dto)
    return {result : evaluation}
  }
  @Post('eval-interview')
  async postEvalInterview(@Query() query : {tag: PersonaDto['persona']}, @Body() body : {qnas : Qna[], sessionId?: string, userId?: string}){
    const evaluation =  await this.lc.postEval(body.qnas, body.sessionId, body.userId, query.tag)
    return {result : evaluation}
  }
  @Post('eval-POV-dynamic')
  async evalPOVDynamic(@Body() request: EvaluationRequest) {
    const dynamicData: DynamicPromptData = {
      needs: request.needs,
      insights: request.insights,
      userPOV: request.text
    };
    
    const response = await this.lc.runDynamicPrompt('pov.txt', dynamicData);
    return { result: response };
  }
  @Post('eval-HMW-dynamic')
  async evalHMWDynamic(@Body() request: EvaluationRequest) {
    const dynamicData: DynamicPromptData = {
      needs: request.needs,
      insights: request.insights,
      userPOV: request.userPOV,
      hmwQuestions: request.text
    };
    
    const response = await this.lc.runDynamicPrompt('hmw.txt', dynamicData);
    return { result: response };
  }

  @Get('agent-status')
  async getAgentStatus() {
    const status = this.lc.getAgentStatus();
    return { agents: status };
  }

  @Get('user-memory/:userId')
  async getUserMemory(@Query('userId') userId: string) {
    const memory = this.lc.getUserMemory(userId);
    return { memory };
  }

  @Get('check-persona-context/:userId')
  async checkPersonaContext(@Query('userId') userId: string) {
    const hasContext = this.lc.hasPersonaContext(userId);
    return { userId, hasPersonaContext: hasContext };
  }

  @Get('test-conversation-history/:userId')
  async testConversationHistory(@Query('userId') userId: string) {
    // This will test the conversation history extraction
    const history = await this.lc.testGetConversationHistory(userId);
    return { userId, conversationHistory: history };
  }
}