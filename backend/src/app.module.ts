import { Module, Controller, Get } from '@nestjs/common';
import { LlmController } from './llm/llm.controller';
import { LangchainModule } from './llm/llm.module';
import { SessionModule } from './session/session.module';
import { PovHmwModule } from './pov-hmw';
import { DbModule } from './db/db.module';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { 
      message: 'UX Research App Backend API', 
      status: 'running',
      endpoints: {
        health: '/llm/health',
        evalPOV: 'POST /llm/eval-POV',
        evalHMW: 'POST /llm/eval-HMW',
        povHmw: '/pov-hmw/*',
        sessions : '/sessions/*',
        db: '/db/*'
      }
    };
  }
}

@Module({
  imports: [LangchainModule, SessionModule, PovHmwModule, DbModule],
  controllers: [AppController, LlmController],
  providers: [],
})
export class AppModule {}
