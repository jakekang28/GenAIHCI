import { Module } from '@nestjs/common';
import { LangchainService } from './llm.service';
import { DbService } from 'src/db/db.service';
import { GroupQuestionService } from 'src/session/gateway.service';

@Module({
  providers: [LangchainService, DbService, GroupQuestionService],
  exports: [LangchainService],
})
export class LangchainModule {}