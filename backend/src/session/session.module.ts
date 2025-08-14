import { Module } from '@nestjs/common';
import { SessionGateway } from './gateway';
import { SessionController } from './session.controller';
import { GroupQuestionService } from './gateway.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [SessionController],
  providers: [SessionGateway, GroupQuestionService],
  exports: [SessionGateway, GroupQuestionService],
})
export class SessionModule {}