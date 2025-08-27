import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  //Enable CORS for frontend integration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  
  app.enableCors({
    origin: [frontendUrl, backendUrl], // Allow both URLs from environment variables
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
}
bootstrap();
