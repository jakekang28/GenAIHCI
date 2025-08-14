import { Module } from '@nestjs/common';
import { PovHmwService } from './pov-hmw.service';
import { PovHmwController } from './pov-hmw.controller';
import { LangchainModule } from '../llm/llm.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [LangchainModule, DbModule],
  providers: [PovHmwService],
  controllers: [PovHmwController],
  exports: [PovHmwService],
})
export class PovHmwModule {}
