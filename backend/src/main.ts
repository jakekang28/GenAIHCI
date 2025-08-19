import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  //Enable CORS for frontend integration
  app.enableCors({
    origin: ['http://192.xxx.xxx.xxx:3001', 'http://192.xxx.xxx.xxx:3000'], //Allow both ports during development
    //origin: ['http://localhost:3001', 'http://localhost:3000'], //Allow both ports during development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log('Backend server running on http://localhost:3000');
}
bootstrap();
