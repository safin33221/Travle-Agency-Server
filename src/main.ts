import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers & compression
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // Base API path
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters & interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor(),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('TravelPilot Backend API')
    .setDescription(
      'Private AI Travel Sales & Operations Management System API for authorized staff',
    )
    .setVersion('1.0')
    .addTag('Auth', 'Staff authentication and session management')
    .addTag('Staff', 'Staff user management (Admin only)')
    .addTag('Agency Settings', 'Agency branding and configuration defaults')
    .addTag('Packages', 'Tour package catalog management')
    .addTag('Leads', 'Customer CRM leads and notes')
    .addTag('Follow-Ups', 'Manual follow-up task management')
    .addTag('Quotations', 'Server-authoritative quotation engine and branded PDF export')
    .addTag('AI', 'Grounded AI advisory assistant for draft responses')
    .addTag('Dashboard', 'Operational metrics and lead funnel analytics')
    .addTag('Audit', 'Audit trail for sensitive actions')
    .addCookieAuth('access_token')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '5000', 10);
  await app.listen(port);
  logger.log(`TravelPilot backend listening on http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

void bootstrap();
